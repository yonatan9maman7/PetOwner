import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const PUSH_TOKEN_KEY = "push_token";

export type TapPayload = {
  type: string;
  relatedEntityId?: string;
  notificationId?: string;
};

/** Returns true when running on a real physical device (push tokens require hardware). */
export function isSupported(): boolean {
  return Platform.OS !== "web" && !!Device.isDevice;
}

/**
 * Requests OS-level permission for push notifications.
 * - If already granted or denied, returns current status without a new prompt.
 * - Calls requestPermissionsAsync() only when status is "undetermined".
 * - On Android 8+ creates the default notification channel before prompting.
 */
export async function ensurePermission(): Promise<Notifications.PermissionStatus> {
  if (!isSupported()) return Notifications.PermissionStatus.DENIED;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      showBadge: true,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== Notifications.PermissionStatus.UNDETERMINED) return existing;

  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}

/**
 * Full registration flow:
 * 1. Ensure OS permission is granted.
 * 2. Get the ExpoPushToken (scoped to projectId from EAS config).
 * 3. Compare against the persisted token — returns null if unchanged to avoid redundant backend syncs.
 *
 * Returns the token string on first registration or rotation, null otherwise.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!isSupported()) return null;

  const status = await ensurePermission();
  if (status !== Notifications.PermissionStatus.GRANTED) return null;

  const projectId =
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    Constants.easConfig?.projectId;

  const { data: token } = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  const stored = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (stored === token) return null; // no change — skip backend sync

  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  return token;
}

/**
 * Removes the locally stored token from SecureStore.
 * Called on logout or when the master push toggle is turned OFF.
 * The caller is responsible for also hitting DELETE /api/users/push-token.
 */
export async function clearStoredToken(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch {
    // already absent — ignore
  }
}

/** Returns the token last persisted to SecureStore, or null. */
export async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Attaches the notification-tap listener (background + foreground taps).
 * The foreground-display handler (setNotificationHandler) is set once at
 * module scope in App.tsx — it is NOT set here to avoid re-registration on
 * every hook mount.
 *
 * Returns a cleanup function to call on logout / unmount.
 */
export function attachNotificationListeners(
  onTap: (payload: TapPayload) => void,
): () => void {
  const tapSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as TapPayload;
      if (data?.type) onTap(data);
    },
  );

  return () => {
    tapSub.remove();
  };
}
