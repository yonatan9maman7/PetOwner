import axios, { type InternalAxiosRequestConfig } from "axios";
import Toast from "react-native-toast-message";
import { translate } from "../i18n";
import type { NormalizedApiError } from "../utils/apiUtils";

/**
 * Whether the global interceptor should show a toast for this failure.
 * Session-expired (401 + bearer) is handled separately in the interceptor.
 * Login/register 401 (no bearer) is handled on the auth screens.
 */
export function shouldToastApiError(
  error: unknown,
  config: InternalAxiosRequestConfig | undefined,
): boolean {
  if (!config) return true;
  if (config.skipGlobalErrorToast) return false;
  if (config.backgroundRequest) return false;
  if (axios.isAxiosError(error) && error.response?.status === 401) return false;
  return true;
}

export function showApiErrorToast(
  normalized: NormalizedApiError,
  options?: { silent?: boolean; title?: string },
): void {
  if (options?.silent) return;
  const title = options?.title ?? normalized.title ?? translate("errorTitle");
  const text2 = normalized.message;
  Toast.show({
    type: "error",
    text1: title,
    text2,
    position: "top",
    visibilityTime: 5500,
  });
}

/** Session expiry UX (non-blocking toast). */
export function showSessionExpiredToast(): void {
  showApiErrorToast({
    message: translate("sessionExpiredDesc"),
    title: translate("sessionExpiredTitle"),
    isConnectivityError: false,
    isAuthError: true,
    isServerError: false,
  });
}
