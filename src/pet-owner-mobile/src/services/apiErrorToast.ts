import axios, { type InternalAxiosRequestConfig } from "axios";
import Toast from "react-native-toast-message";
import { translate } from "../i18n";
import type { NormalizedApiError } from "../utils/apiUtils";

/**
 * Whether the global interceptor should show a toast for this failure.
 * Session-expired (401 + bearer) is handled separately in the interceptor.
 * Login/register 401 (no bearer) is handled on the auth screens.
 */
function requestPath(config: InternalAxiosRequestConfig | undefined): string {
  if (!config?.url) return "";
  const u = config.url.replace(/\?.*$/, "");
  return u.startsWith("/") ? u : `/${u}`;
}

/**
 * GET /providers/me returns 404 when the user is not a provider yet — expected, not an error UX.
 */
function isExpectedNoProviderProfile404(
  error: unknown,
  config: InternalAxiosRequestConfig | undefined,
): boolean {
  if (!axios.isAxiosError(error) || error.response?.status !== 404) return false;
  if ((config?.method ?? "get").toLowerCase() !== "get") return false;
  const path = requestPath(config);
  return path === "/providers/me";
}

export function shouldToastApiError(
  error: unknown,
  config: InternalAxiosRequestConfig | undefined,
): boolean {
  if (!config) return true;
  if (config.skipGlobalErrorToast) return false;
  if (config.backgroundRequest) return false;
  if (axios.isAxiosError(error) && error.response?.status === 401) return false;
  if (isExpectedNoProviderProfile404(error, config)) return false;
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
