import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { showGlobalAlert } from "../components/global-modal";

const KEYS = {
  enabled: "bio_enabled",
  identifier: "bio_identifier",
  password: "bio_password",
} as const;

/** Legacy key name — kept only for migration reads in authenticateAndGetCredentials. */
const LEGACY_EMAIL_KEY = "bio_email";

const CANCEL_ERRORS = new Set<LocalAuthentication.LocalAuthenticationError>([
  "user_cancel",
  "system_cancel",
  "app_cancel",
]);

/** Intentionally no `keychainAccessible`: WHEN_UNLOCKED_THIS_DEVICE_ONLY often fails silently in Expo Go. */
function secureStoreErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || String(error);
  if (error != null && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function showBiometricErrorAlert(error: unknown): void {
  const msg = secureStoreErrorMessage(error);
  showGlobalAlert("Biometric Error", msg || "Unknown error");
}

export type BiometricTypeLabel = "faceId" | "fingerprint" | "iris" | "generic";

export type BiometricPromptLabels = {
  promptMessage: string;
  cancelLabel: string;
  fallbackLabel?: string;
};

export type BiometricAvailabilityMessages = {
  unavailable: string;
  notEnrolled: string;
  failed: string;
};

/** Thrown when the user dismisses the system biometric prompt. */
export class BiometricCancelledError extends Error {
  constructor(
    code: LocalAuthentication.LocalAuthenticationError = "user_cancel",
  ) {
    super(code);
    this.name = "BiometricCancelledError";
  }
}

function isCancelError(
  error?: LocalAuthentication.LocalAuthenticationError,
): boolean {
  return error != null && CANCEL_ERRORS.has(error);
}

function buildAuthenticateOptions(
  labels: BiometricPromptLabels,
): LocalAuthentication.LocalAuthenticationOptions {
  return {
    promptMessage: labels.promptMessage,
    cancelLabel: labels.cancelLabel,
    disableDeviceFallback: false,
    ...(labels.fallbackLabel ? { fallbackLabel: labels.fallbackLabel } : {}),
    ...(Platform.OS === "android" ? { requireConfirmation: false } : {}),
  };
}

async function ensureBiometricsReady(
  messages: BiometricAvailabilityMessages,
): Promise<boolean> {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  if (!hasHardware) {
    showGlobalAlert(messages.unavailable);
    return false;
  }
  if (!enrolled) {
    showGlobalAlert(messages.notEnrolled);
    return false;
  }
  return true;
}

async function runBiometricPrompt(
  labels: BiometricPromptLabels,
  messages: BiometricAvailabilityMessages,
): Promise<LocalAuthentication.LocalAuthenticationResult | null> {
  if (!(await ensureBiometricsReady(messages))) {
    return null;
  }

  const result = await LocalAuthentication.authenticateAsync(
    buildAuthenticateOptions(labels),
  );

  if (result.success) {
    return result;
  }

  if (isCancelError(result.error)) {
    return result;
  }

  if (
    result.error === "not_enrolled" ||
    result.error === "not_available" ||
    result.error === "passcode_not_set"
  ) {
    showGlobalAlert(messages.notEnrolled);
    return result;
  }

  showGlobalAlert(messages.failed);
  return result;
}

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
 * the supplied credentials. Throws BiometricCancelledError if the user cancels.
 */
export async function enable(
  identifier: string,
  password: string,
  labels: BiometricPromptLabels,
  messages: BiometricAvailabilityMessages,
): Promise<void> {
  try {
    const result = await runBiometricPrompt(labels, messages);

    if (result == null) {
      throw new BiometricCancelledError("not_available");
    }

    if (!result.success) {
      if (isCancelError(result.error)) {
        throw new BiometricCancelledError(result.error);
      }
      throw new Error(result.error ?? "biometric_failed");
    }

    await Promise.all([
      SecureStore.setItemAsync(KEYS.identifier, identifier),
      SecureStore.setItemAsync(KEYS.password, password),
      SecureStore.setItemAsync(KEYS.enabled, "1"),
    ]);
  } catch (error) {
    if (error instanceof BiometricCancelledError) {
      throw error;
    }
    showBiometricErrorAlert(error);
    throw error;
  }
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
      SecureStore.deleteItemAsync(KEYS.identifier),
      SecureStore.deleteItemAsync(KEYS.password),
      SecureStore.deleteItemAsync(LEGACY_EMAIL_KEY),
    ]);
  } catch {
    // already absent — ignore
  }
}

/**
 * Prompt the user for biometrics and, on success, return the stored
 * credentials. Returns null if the user cancels or biometric fails.
 *
 * Automatically migrates credentials stored under the legacy `bio_email` key
 * (from before the identifier-based auth refactor) to `bio_identifier`.
 */
export async function authenticateAndGetCredentials(
  labels: BiometricPromptLabels,
  messages: BiometricAvailabilityMessages,
): Promise<{ identifier: string; password: string } | null> {
  try {
    const result = await runBiometricPrompt(labels, messages);

    if (result == null || !result.success) {
      return null;
    }

    const [storedIdentifier, password] = await Promise.all([
      SecureStore.getItemAsync(KEYS.identifier),
      SecureStore.getItemAsync(KEYS.password),
    ]);

    // Migrate from legacy bio_email key if the new key is absent.
    if (!storedIdentifier) {
      const legacyEmail = await SecureStore.getItemAsync(LEGACY_EMAIL_KEY);
      if (legacyEmail && password) {
        await SecureStore.setItemAsync(KEYS.identifier, legacyEmail);
        await SecureStore.deleteItemAsync(LEGACY_EMAIL_KEY);
        return { identifier: legacyEmail, password };
      }
      await SecureStore.deleteItemAsync(KEYS.enabled);
      return null;
    }

    if (!password) {
      await SecureStore.deleteItemAsync(KEYS.enabled);
      return null;
    }

    return { identifier: storedIdentifier, password };
  } catch (error) {
    showBiometricErrorAlert(error);
    throw error;
  }
}
