import * as Sentry from "@sentry/react-native";
import axios from "axios";
import { isSentryEnabled } from "../services/sentry";
import { redactDeep } from "./apiErrorLogger";
import { isConnectivityAxiosError } from "./apiUtils";

type LogContext = Record<string, unknown>;

function withScope(fn: (scope: Sentry.Scope) => void): void {
  if (!isSentryEnabled()) return;
  Sentry.withScope(fn);
}

export const logger = {
  error(error: unknown, context?: LogContext): void {
    if (!isSentryEnabled()) {
      if (__DEV__) console.error(error, context);
      return;
    }
    withScope((scope) => {
      if (context) {
        scope.setContext("app", redactDeep(context) as Record<string, unknown>);
      }
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error), "error");
      }
    });
  },

  warn(message: string, context?: LogContext): void {
    if (!isSentryEnabled()) {
      if (__DEV__) console.warn(message, context);
      return;
    }
    withScope((scope) => {
      if (context) {
        scope.setContext("app", redactDeep(context) as Record<string, unknown>);
      }
      Sentry.captureMessage(message, "warning");
    });
  },

  info(message: string, context?: LogContext): void {
    if (!isSentryEnabled()) return;
    Sentry.addBreadcrumb({
      category: "app",
      message,
      level: "info",
      data: context ? (redactDeep(context) as Record<string, unknown>) : undefined,
    });
  },

  apiError(
    error: unknown,
    meta?: {
      url?: string;
      method?: string;
      status?: number;
      traceId?: string;
    },
  ): void {
    if (!isSentryEnabled()) return;

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 404) return;
      if (error.code === "ERR_CANCELED") return;
      if (isConnectivityAxiosError(error)) {
        logger.info("API connectivity failure", meta);
        return;
      }

      logger.error(error, {
        ...meta,
        response: redactDeep(error.response?.data),
      });
      return;
    }

    logger.error(error, meta);
  },
};
