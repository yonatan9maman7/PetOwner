import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const KEYS = {
  enabled: "bio_enabled",
  email: "bio_email",
  password: "bio_password",
} as const;

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export type BiometricTypeLabel = "faceId" | "fingerprint" | "iris" | "generic";

/** True when the device has biometric hardware AND at least one enrolled credential. */
export async function isSupported(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/** Human-readable label for the primary supported type. */
export async function getSupportedTypeLabel(): Promise<BiometricTypeLabel> {
  if (Platform.OS === "web") return "generic";
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (
      types.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      )
    )
      return "faceId";
    if (
      types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    )
      return "fingerprint";
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS))
      return "iris";
  } catch {
    // fall through
  }
  return "generic";
}

/** True when the user has opted into biometric login. */
export async function isEnabled(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const val = await SecureStore.getItemAsync(KEYS.enabled);
    return val === "1";
  } catch {
    return false;
  }
}

/**
 * Enable biometric login.
 * Triggers a biometric prompt to confirm device ownership, then persists
 * the supplied credentials. Throws if the user cancels or if hardware is
 * unavailable.
 */
export async function enable(
  email: string,
  password: string,
  promptMessage: string,
): Promise<void> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });

  if (!result.success) {
    throw new Error(result.error ?? "biometric_cancelled");
  }

  await Promise.all([
    SecureStore.setItemAsync(KEYS.email, email, SECURE_OPTIONS),
    SecureStore.setItemAsync(KEYS.password, password, SECURE_OPTIONS),
    SecureStore.setItemAsync(KEYS.enabled, "1", SECURE_OPTIONS),
  ]);
}

/**
 * Disable biometric login and wipe stored credentials.
 * Does NOT require a biometric prompt — disabling a security feature must
 * always remain accessible, including after a lock-out.
 */
export async function disable(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.enabled),
      SecureStore.deleteItemAsync(KEYS.email),
      SecureStore.deleteItemAsync(KEYS.password),
    ]);
  } catch {
    // already absent — ignore
  }
}

/**
 * Prompt the user for biometrics and, on success, return the stored
 * credentials.  Returns null if the user cancels or biometric fails.
 */
export async function authenticateAndGetCredentials(
  promptMessage: string,
): Promise<{ email: string; password: string } | null> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });

  if (!result.success) return null;

  try {
    const [email, password] = await Promise.all([
      SecureStore.getItemAsync(KEYS.email, SECURE_OPTIONS),
      SecureStore.getItemAsync(KEYS.password, SECURE_OPTIONS),
    ]);

    if (!email || !password) {
      // Credentials were wiped externally — clean up the flag.
      await SecureStore.deleteItemAsync(KEYS.enabled);
      return null;
    }

    return { email, password };
  } catch {
    return null;
  }
}
