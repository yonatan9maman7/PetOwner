import { Alert } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import {
  authenticateAndGetCredentials,
  enable,
} from "../services/biometricService";

jest.mock("expo-local-authentication");
jest.mock("expo-secure-store");

describe("biometricService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation((title, _message, buttons) => {
      if (title === "Debug" && Array.isArray(buttons) && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("authenticateAndGetCredentials returns null when the user fails the biometric prompt", async () => {
    jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
      success: false,
      error: "user_cancel",
    });

    const result = await authenticateAndGetCredentials("Sign in");

    expect(result).toBeNull();
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it("enable throws after a failed prompt and does not persist credentials", async () => {
    jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
      success: false,
      error: "authentication_failed",
    });

    await expect(
      enable("a@b.com", "secret", "Confirm"),
    ).rejects.toThrow("authentication_failed");

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
