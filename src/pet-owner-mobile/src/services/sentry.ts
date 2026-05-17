import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";
import { isApiErrorHandledByInterceptor } from "../utils/apiUtils";

const PLACEHOLDER_DSN = "YOUR_DSN_HERE";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

export function isSentryEnabled(): boolean {
  return (
    Platform.OS !== "web" &&
    !__DEV__ &&
    Boolean(dsn) &&
    dsn !== PLACEHOLDER_DSN
  );
}

export const navigationIntegration = Sentry.reactNavigationIntegration();

function resolveEnvironment(): string {
  const fromEnv = process.env.EXPO_PUBLIC_APP_ENV?.trim();
  if (fromEnv) return fromEnv;
  const easProfile = (
    Constants.expoConfig?.extra as { eas?: { buildProfile?: string } } | undefined
  )?.eas?.buildProfile;
  if (easProfile) return easProfile;
  return "production";
}

export function initSentry(): void {
  if (!isSentryEnabled() || !dsn) return;

  Sentry.init({
    dsn,
    environment: resolveEnvironment(),
    tracesSampleRate: 0.2,
    enableLogs: true,
    integrations: [navigationIntegration],
    beforeSend(event, hint) {
      const original = hint.originalException;
      if (!isApiErrorHandledByInterceptor(original)) return event;

      const mechanism = event.exception?.values?.[0]?.mechanism;
      const isUnhandledRejection =
        mechanism?.type === "onunhandledrejection" ||
        mechanism?.type === "unhandledrejection" ||
        mechanism?.handled === false;

      if (isUnhandledRejection) {
        return null;
      }
      return event;
    },
  });
}

export function setSentryUser(userId: string | null): void {
  if (!isSentryEnabled()) return;
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}
