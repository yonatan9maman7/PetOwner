import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    /** When true, the global API error toast is not shown for this request. */
    skipGlobalErrorToast?: boolean;
    /** Optional toast title override for global API errors. */
    errorToastTitle?: string;
    /** When true, failures are treated as non-user-facing (no global toast). */
    backgroundRequest?: boolean;
  }
}
