import { isApiErrorHandledByInterceptor } from "../utils/apiUtils";

/**
 * Dev-only guard: warns when an API rejection was handled globally but the caller
 * did not attach `.catch()` / `try/catch` (avoids noisy Sentry "unhandled" dupes via beforeSend).
 */
export function installApiUnhandledRejectionGuard(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracking = require("promise/setimmediate/rejection-tracking") as {
      enable: (options: {
        allRejections: boolean;
        onUnhandled: (id: number, error: unknown) => void;
      }) => void;
    };
    tracking.enable({
      allRejections: true,
      onUnhandled: (_id, error) => {
        if (!isApiErrorHandledByInterceptor(error)) return;
        if (__DEV__) {
          console.warn(
            "[API] Unhandled promise rejection after global interceptor (add .catch in caller).",
            error,
          );
        }
      },
    });
  } catch {
    // rejection-tracking is not available on all runtimes (e.g. some web builds).
  }
}
