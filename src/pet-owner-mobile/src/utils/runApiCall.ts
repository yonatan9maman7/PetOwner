import {
  getNormalizedApiError,
  type NormalizedApiError,
} from "./apiUtils";

export type ApiCallResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: NormalizedApiError };

/**
 * Wraps a single API promise so screens/stores always get a result object instead of
 * an unhandled rejection. Global toast + Sentry still run in the Axios interceptor.
 */
export async function runApiCall<T>(
  fn: () => Promise<T>,
): Promise<ApiCallResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e: unknown) {
    return { ok: false, error: getNormalizedApiError(e) };
  }
}
