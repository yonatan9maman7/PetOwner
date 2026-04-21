import axios, { type AxiosError } from "axios";
import { translate } from "../i18n";

/** True when the failure is likely due to no connectivity, timeout, or transport error (no HTTP response body to parse). */
export function isConnectivityAxiosError(error: unknown): error is AxiosError {
  if (!axios.isAxiosError(error)) return false;
  if (error.code === "ECONNABORTED") return true;
  if (error.code === "ERR_NETWORK") return true;
  if (error.message === "Network Error") return true;
  if (!error.response && error.request) return true;
  return false;
}

/**
 * Human-readable API/transport error text for stores and UI.
 * Prefers backend `response.data.message`, then connectivity-specific copy, then `Error.message`, then a generic localized fallback.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object" && data !== null && "message" in data) {
      const m = (data as { message: unknown }).message;
      if (typeof m === "string" && m.trim()) return m;
    }
    const friendly = (error as AxiosError & { userFriendlyMessage?: string })
      .userFriendlyMessage;
    if (typeof friendly === "string" && friendly.trim()) return friendly;
    if (isConnectivityAxiosError(error)) return translate("apiNetworkTimeout");
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return translate("genericErrorDesc");
}
