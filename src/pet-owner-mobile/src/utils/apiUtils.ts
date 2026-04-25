import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { translate } from "../i18n";

const NORMALIZED_KEY = "__normalizedApiError" as const;

/** True when the failure is likely due to no connectivity, timeout, or transport error (no HTTP response body to parse). */
export function isConnectivityAxiosError(error: unknown): error is AxiosError {
  if (!axios.isAxiosError(error)) return false;
  if (error.code === "ECONNABORTED") return true;
  if (error.code === "ERR_NETWORK") return true;
  if (error.message === "Network Error") return true;
  if (!error.response && error.request) return true;
  return false;
}

function requestHadBearerToken(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config?.headers) return false;
  const h = config.headers;
  const auth =
    typeof (h as { get?: (name: string) => unknown }).get === "function"
      ? (h as { get: (name: string) => unknown }).get("Authorization")
      : (h as { Authorization?: unknown }).Authorization;
  return typeof auth === "string" && auth.startsWith("Bearer ");
}

function collectAspNetValidationMessages(errorsField: unknown): string[] {
  if (!errorsField || typeof errorsField !== "object") return [];
  const out: string[] = [];
  for (const v of Object.values(errorsField as Record<string, unknown>)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string" && item.trim()) out.push(item.trim());
      }
    } else if (typeof v === "string" && v.trim()) {
      out.push(v.trim());
    }
  }
  return out;
}

function readTraceId(data: Record<string, unknown>): string | undefined {
  const direct = data.traceId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const ext = data.extensions;
  if (ext && typeof ext === "object" && ext !== null) {
    const tid = (ext as Record<string, unknown>).traceId;
    if (typeof tid === "string" && tid.trim()) return tid.trim();
  }
  return undefined;
}

function pickBackendStrings(data: Record<string, unknown>): {
  message?: string;
  detail?: string;
  title?: string;
  code?: string;
  traceId?: string;
  details: string[];
} {
  const message =
    typeof data.message === "string" && data.message.trim() ? data.message.trim() : undefined;
  const detail =
    typeof data.detail === "string" && data.detail.trim() ? data.detail.trim() : undefined;
  const title =
    typeof data.title === "string" && data.title.trim() ? data.title.trim() : undefined;
  const code =
    typeof data.code === "string" && data.code.trim() ? data.code.trim() : undefined;
  const traceId = readTraceId(data);

  const validationDetails =
    data.errors && typeof data.errors === "object" && !Array.isArray(data.errors)
      ? collectAspNetValidationMessages(data.errors)
      : [];

  const extra: string[] = [];
  if (typeof data.error === "string" && data.error.trim()) extra.push(data.error.trim());
  if (Array.isArray(data.errors)) {
    for (const e of data.errors) {
      if (typeof e === "string" && e.trim()) extra.push(e.trim());
    }
  }

  const details = [...new Set([...validationDetails, ...extra])];
  return { message, detail, title, code, traceId, details };
}

function statusFallbackKey(
  status: number,
  hadBearerOn401: boolean,
):
  | "apiErrorBadRequest"
  | "apiErrorUnauthorized"
  | "apiErrorForbidden"
  | "apiErrorNotFound"
  | "apiErrorConflict"
  | "apiErrorValidation"
  | "apiErrorTooManyRequests"
  | "apiErrorServer"
  | "genericErrorDesc"
  | "sessionExpiredDesc" {
  switch (status) {
    case 400:
      return "apiErrorBadRequest";
    case 401:
      return hadBearerOn401 ? "sessionExpiredDesc" : "apiErrorUnauthorized";
    case 403:
      return "apiErrorForbidden";
    case 404:
      return "apiErrorNotFound";
    case 409:
      return "apiErrorConflict";
    case 422:
      return "apiErrorValidation";
    case 429:
      return "apiErrorTooManyRequests";
    default:
      if (status >= 500) return "apiErrorServer";
      return "genericErrorDesc";
  }
}

export type NormalizedApiError = {
  message: string;
  title?: string;
  status?: number;
  code?: string;
  traceId?: string;
  details?: string[];
  isConnectivityError: boolean;
  isAuthError: boolean;
  isServerError: boolean;
  /** Dev-only diagnostics; never show in UI */
  raw?: unknown;
};

/**
 * Normalize any thrown value (Axios or not) into a stable shape for UI and logging.
 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const hadBearer = requestHadBearerToken(error.config);

    if (isConnectivityAxiosError(error)) {
      const msg = translate("apiNetworkTimeout");
      return {
        message: msg,
        status,
        isConnectivityError: true,
        isAuthError: status === 401,
        isServerError: typeof status === "number" && status >= 500,
        raw: __DEV__ ? error.response?.data : undefined,
      };
    }

    const data = error.response?.data;
    const dataObj =
      data && typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;

    const picked = dataObj ? pickBackendStrings(dataObj) : { details: [] as string[] };

    const friendly = (error as AxiosError & { userFriendlyMessage?: string }).userFriendlyMessage;
    if (typeof friendly === "string" && friendly.trim()) {
      return {
        message: friendly.trim(),
        status,
        traceId: picked.traceId,
        code: picked.code,
        isConnectivityError: false,
        isAuthError: status === 401,
        isServerError: typeof status === "number" && status >= 500,
        raw: __DEV__ ? data : undefined,
      };
    }

    let message = picked.message;
    if (!message && picked.detail) message = picked.detail;
    if (!message && picked.title && picked.title !== "An unexpected error occurred.") {
      message = picked.title;
    }
    if (!message && picked.details.length > 0) {
      message = picked.details.join(" ");
    }

    if (!message && typeof status === "number") {
      message = translate(statusFallbackKey(status, hadBearer));
    }

    if (!message && error.message.trim()) {
      message = error.message.trim();
    }
    if (!message) {
      message = translate("genericErrorDesc");
    }

    const title =
      status === 401 && hadBearer
        ? translate("sessionExpiredTitle")
        : status && status >= 500
          ? translate("genericErrorTitle")
          : translate("errorTitle");

    return {
      message,
      title,
      status,
      code: picked.code,
      traceId: picked.traceId,
      details: picked.details.length ? picked.details : undefined,
      isConnectivityError: false,
      isAuthError: status === 401,
      isServerError: typeof status === "number" && status >= 500,
      raw: __DEV__ ? data : undefined,
    };
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      message: error.message.trim(),
      isConnectivityError: false,
      isAuthError: false,
      isServerError: false,
      raw: __DEV__ ? undefined : undefined,
    };
  }

  return {
    message: translate("genericErrorDesc"),
    isConnectivityError: false,
    isAuthError: false,
    isServerError: false,
  };
}

export function attachNormalizedApiError(error: unknown, normalized: NormalizedApiError): void {
  if (error && typeof error === "object") {
    (error as Record<string, unknown>)[NORMALIZED_KEY] = normalized;
  }
}

export function getNormalizedApiError(error: unknown): NormalizedApiError {
  if (error && typeof error === "object" && NORMALIZED_KEY in error) {
    const n = (error as Record<string, unknown>)[NORMALIZED_KEY];
    if (n && typeof n === "object" && "message" in n) {
      return n as NormalizedApiError;
    }
  }
  return normalizeApiError(error);
}

/**
 * Human-readable API/transport error text for stores and UI.
 * Delegates to {@link normalizeApiError}; prefers backend body, connectivity copy, then fallbacks.
 */
export function getApiErrorMessage(error: unknown): string {
  return getNormalizedApiError(error).message;
}
