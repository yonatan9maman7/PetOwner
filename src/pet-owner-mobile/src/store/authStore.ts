import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import type { Language } from "../i18n";

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const CLAIM_USER_ID =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const CLAIM_NAME =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
const CLAIM_EMAIL =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
const CLAIM_ROLE =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

interface JwtPayload {
  [key: string]: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

function decodeUser(token: string): UserInfo | null {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return {
      id: decoded[CLAIM_USER_ID] ?? "",
      name: decoded[CLAIM_NAME] ?? "",
      email: decoded[CLAIM_EMAIL] ?? "",
      role: decoded[CLAIM_ROLE] ?? "",
    };
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

interface AuthState {
  token: string | null;
  userId: string | null;
  user: UserInfo | null;
  isLoggedIn: boolean;
  language: Language;
  hydrated: boolean;
  setAuth: (token: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  hydrate: () => Promise<void>;
}

function getToken(): string {
  return useAuthStore.getState().token ?? "";
}

function startHubs() {
  const token = getToken();
  if (!token) return;

  import("../services/signalr").then((m) => m.startConnection().catch(() => {}));
  import("./notificationStore").then((m) => {
    m.startNotificationHub(getToken).catch(() => {});
    m.useNotificationStore.getState().fetchUnreadCount().catch(() => {});
  });
  import("./favoritesStore").then((m) => {
    m.useFavoritesStore.getState().fetchIds().catch(() => {});
  });
  import("./chatStore").then((m) => {
    m.useChatStore.getState().fetchConversations().catch(() => {});
  });
  // Register Expo push token with the backend (no-op on web / simulator).
  import("../services/pushService").then(async (push) => {
    try {
      const pushToken = await push.registerForPushNotifications();
      if (pushToken) {
        const { notificationsApi } = await import("../api/client");
        await notificationsApi
          .registerPushToken(pushToken, Platform.OS as "ios" | "android")
          .catch(() => {});
      }
    } catch {
      // Non-fatal — push notification registration should never block auth.
    }
  });
}

/**
 * Tears down SignalR, notification hub, stores, and push registration.
 * Must be awaited during logout **before** clearing the JWT so `DELETE /api/users/push-token` stays authorized.
 */
async function stopHubsAsync(): Promise<void> {
  const signalr = await import("../services/signalr");
  await signalr.stopConnection().catch(() => {});

  const notificationStore = await import("./notificationStore");
  await notificationStore.stopNotificationHub().catch(() => {});
  notificationStore.useNotificationStore.getState().reset();

  const favoritesStore = await import("./favoritesStore");
  favoritesStore.useFavoritesStore.getState().reset();

  const chatStore = await import("./chatStore");
  chatStore.useChatStore.getState().reset();

  const push = await import("../services/pushService");
  try {
    const storedToken = await push.getStoredToken();
    if (storedToken) {
      const { notificationsApi } = await import("../api/client");
      await notificationsApi.removePushToken(storedToken).catch(() => {});
    }
    await push.clearStoredToken();
  } catch {
    // Non-fatal — still clear local token if possible
    await push.clearStoredToken().catch(() => {});
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  userId: null,
  user: null,
  isLoggedIn: false,
  language: "he",
  hydrated: false,

  setAuth: async (token, userId) => {
    await storage.set("auth_token", token);
    await storage.set("user_id", userId);
    const user = decodeUser(token);
    set({ token, userId, user, isLoggedIn: true });
    startHubs();
  },

  logout: async () => {
    await stopHubsAsync();
    await storage.remove("auth_token");
    await storage.remove("user_id");
    // Wipe biometric credentials on explicit logout — security signal.
    import("../services/biometricService").then((m) => m.disable().catch(() => {}));
    set({ token: null, userId: null, user: null, isLoggedIn: false });
  },

  setLanguage: async (lang) => {
    if (lang === get().language) return;
    await storage.set("app_language", lang);
    set({ language: lang });
  },

  hydrate: async () => {
    const [token, userId, lang] = await Promise.all([
      storage.get("auth_token"),
      storage.get("user_id"),
      storage.get("app_language"),
    ]);

    const expired = token ? isTokenExpired(token) : false;
    if (expired) {
      await storage.remove("auth_token");
      await storage.remove("user_id");
      set({
        token: null,
        userId: null,
        user: null,
        isLoggedIn: false,
        language: (lang as Language) ?? "he",
        hydrated: true,
      });
      return;
    }

    const user = token ? decodeUser(token) : null;
    const loggedIn = !!token;
    set({
      token,
      userId,
      user,
      isLoggedIn: loggedIn,
      language: (lang as Language) ?? "he",
      hydrated: true,
    });

    if (loggedIn) startHubs();
  },
}));
