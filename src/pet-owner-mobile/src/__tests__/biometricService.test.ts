import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import {
  authenticateAndGetCredentials,
  BiometricCancelledError,
  enable,
} from "../services/biometricService";
import { showGlobalAlert } from "../components/global-modal";

jest.mock("expo-local-authentication");
jest.mock("expo-secure-store");
jest.mock("../components/global-modal", () => ({
  showGlobalAlert: jest.fn(),
  showGlobalModal: jest.fn(),
}));

const labels = {
  promptMessage: "Sign in",
  cancelLabel: "Cancel",
  fallbackLabel: "Use Passcode",
};

const messages = {
  unavailable: "Biometrics unavailable",
  notEnrolled: "Biometrics not enrolled",
  failed: "Biometric failed",
};

describe("biometricService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
  });

  it("authenticateAndGetCredentials returns null when the user cancels the biometric prompt", async () => {
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
      success: false,
      error: "user_cancel",
    });

    const result = await authenticateAndGetCredentials(labels, messages);

    expect(result).toBeNull();
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(showGlobalAlert).not.toHaveBeenCalled();
  });

  it("authenticateAndGetCredentials returns null on system_cancel without an alert", async () => {
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
      success: false,
      error: "system_cancel",
    });

    const result = await authenticateAndGetCredentials(labels, messages);

    expect(result).toBeNull();
    expect(showGlobalAlert).not.toHaveBeenCalled();
  });

  it("authenticateAndGetCredentials shows unavailable and skips prompt when there is no hardware", async () => {
    jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);

    const result = await authenticateAndGetCredentials(labels, messages);

    expect(result).toBeNull();
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
    expect(showGlobalAlert).toHaveBeenCalledWith(messages.unavailable);
  });

  it("authenticateAndGetCredentials shows notEnrolled and skips prompt when nothing is enrolled", async () => {
    jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);

    const result = await authenticateAndGetCredentials(labels, messages);

    expect(result).toBeNull();
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
    expect(showGlobalAlert).toHaveBeenCalledWith(messages.notEnrolled);
  });

  it("authenticateAndGetCredentials passes prompt options to authenticateAsync", async () => {
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
      success: true,
    });
    jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => {
      if (key === "bio_email") return "a@b.com";
      if (key === "bio_password") return "secret";
      return null;
    });

    await authenticateAndGetCredentials(labels, messages);

    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        promptMessage: labels.promptMessage,
        cancelLabel: labels.cancelLabel,
        fallbackLabel: labels.fallbackLabel,
        disableDeviceFallback: false,
        ...(Platform.OS === "android" ? { requireConfirmation: false } : {}),
      }),
    );
  });

  it("enable throws BiometricCancelledError without a generic error alert when the user cancels", async () => {
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
      success: false,
      error: "user_cancel",
    });

    await expect(
      enable("a@b.com", "secret", labels, messages),
    ).rejects.toBeInstanceOf(BiometricCancelledError);

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(showGlobalAlert).not.toHaveBeenCalledWith(
      "Biometric Error",
      expect.anything(),
    );
  });

  it("enable throws after a failed prompt and does not persist credentials", async () => {
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
      success: false,
      error: "authentication_failed",
    });

    await expect(
      enable("a@b.com", "secret", labels, messages),
    ).rejects.toThrow("authentication_failed");

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(showGlobalAlert).toHaveBeenCalledWith(messages.failed);
  });
});
