import axios, { type AxiosError } from "axios";
import { getNormalizedApiError } from "./apiUtils";

const SENSITIVE_KEY = /password|token|authorization|secret|otp|cvv|cardnumber|creditcard|refresh/i;

function redactDeep(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[max-depth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length > 500) return `${value.slice(0, 500)}…[truncated]`;
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = redactDeep(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

/** Dev-only: log full Axios failure context with redacted secrets. */
export function logAxiosErrorDev(error: unknown): void {
  if (!__DEV__) return;
  if (!axios.isAxiosError(error)) {
    console.groupCollapsed("[API] non-Axios error");
    console.error(error);
    console.groupEnd();
    return;
  }

  const ax = error as AxiosError;
  const norm = getNormalizedApiError(error);
  const trace = norm.traceId;
  const label = trace ? `[API traceId=${trace}]` : "[API]";
  const method = (ax.config?.method ?? "?").toUpperCase();
  const url = ax.config?.url ?? "";
  const status = ax.response?.status ?? "no-status";

  console.groupCollapsed(`${label} ${method} ${url} → ${status}`);
  console.info("normalized", norm);
  if (ax.config?.params) console.info("params", redactDeep(ax.config.params));
  if (ax.config?.data) console.info("requestBody", redactDeep(ax.config.data));
  if (ax.response?.data !== undefined) console.info("responseData", redactDeep(ax.response.data));
  if (ax.stack) console.info("stack", ax.stack);
  console.groupEnd();
}
