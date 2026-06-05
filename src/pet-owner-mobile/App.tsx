import "./global.css";
import { useEffect, useRef, type ReactNode } from "react";
import { Keyboard, Platform, View, LogBox } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "react-error-boundary";
import * as Sentry from "@sentry/react-native";
import { initSentry, isSentryEnabled, navigationIntegration } from "./src/services/sentry";

// Must run before `Sentry.wrap(App)` below. Static imports are hoisted, so
// placing this call here (before the export) ensures Sentry.init executes
// prior to Sentry.wrap regardless of the import order in index.ts.
initSentry();

// react-native-maps on iOS triggers this warning when MapKit's native gesture
// recognizer absorbs touches before RN Gesture Handler can count them.
// expo-notifications remote-push warnings are expected in Expo Go (SDK 53+).
LogBox.ignoreLogs([
  "Ended a touch event which was not counted in",
  "expo-notifications: Android Push notifications",
  "`expo-notifications` functionality is not fully supported in Expo Go",
]);
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { AppNavigator, navigationRef } from "./src/navigation/AppNavigator";
import { useAuthStore } from "./src/store/authStore";
import { useThemeStore } from "./src/store/themeStore";
import { useDogParkStore } from "./src/store/dogParkStore";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";

/** Tab-bar navy — paints behind Android system navigation bar before theme hydrates. */
const ANDROID_EDGE_BG = "#0D1B42";
const APP_LAYOUT_ROOT = {
  direction: "ltr" as const,
};

function RootShell({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.tabBar }}>
      {children}
    </View>
  );
}
import { ErrorFallback } from "./src/components/ErrorFallback";
import { ImageSourcePickerHost } from "./src/components/ImageSourcePickerHost";
import { GlobalModalProvider } from "./src/components/global-modal";
import { MarkerBitmapPrerender } from "./src/screens/explore/markerBitmapCache";
import { attachNotificationListeners, type TapPayload } from "./src/services/pushService";
import { routeForNotification } from "./src/services/notificationRouter";
import Toast from "react-native-toast-message";

// Set the foreground notification handler once at module scope (before first render).
// Without this, Expo silently drops notifications when the app is in the foreground.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function AppInner() {
  const { colors, isDark } = useTheme();

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      };

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        theme={navTheme}
        onReady={() => {
          if (isSentryEnabled()) {
            navigationIntegration.registerNavigationContainer(navigationRef);
          }
        }}
        onStateChange={() => {
          if (Platform.OS !== "web") {
            Keyboard.dismiss();
          }
        }}
      >
        <AppNavigator />
        <StatusBar style={isDark ? "light" : "dark"} />
      </NavigationContainer>
      <View style={{ zIndex: 9999 }} pointerEvents="box-none">
        <Toast />
      </View>
      <ImageSourcePickerHost />
    </>
  );
}

function App() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const themeHydrated = useThemeStore((s) => s.hydrated);
  const hydrateDogPark = useDogParkStore((s) => s.hydrate);
  const coldStartHandled = useRef(false);
  const coldStartNavPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    hydrateAuth();
    hydrateTheme();
    hydrateDogPark();
  }, [hydrateAuth, hydrateTheme, hydrateDogPark]);

  // Attach notification tap listener and handle cold-start tap once after hydration.
  useEffect(() => {
    if (!authHydrated || Platform.OS === "web") return;

    let effectCancelled = false;

    const cleanup = attachNotificationListeners((payload: TapPayload) => {
      routeForNotification(navigationRef, payload);
    });

    // Cold-start: check if the app was opened via a notification tap.
    if (!coldStartHandled.current) {
      coldStartHandled.current = true;
      const maxNavPollAttempts = 100; // 100 × 100ms = 10s max
      let navPollAttempts = 0;

      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (effectCancelled || !response) return;
        const data = response.notification.request.content.data as TapPayload;
        if (data?.type) {
          coldStartNavPollRef.current = setInterval(() => {
            if (effectCancelled) {
              if (coldStartNavPollRef.current) {
                clearInterval(coldStartNavPollRef.current);
                coldStartNavPollRef.current = null;
              }
              return;
            }
            if (navigationRef.isReady()) {
              if (coldStartNavPollRef.current) {
                clearInterval(coldStartNavPollRef.current);
                coldStartNavPollRef.current = null;
              }
              routeForNotification(navigationRef, data);
              return;
            }
            navPollAttempts += 1;
            if (navPollAttempts >= maxNavPollAttempts && coldStartNavPollRef.current) {
              clearInterval(coldStartNavPollRef.current);
              coldStartNavPollRef.current = null;
            }
          }, 100);
        }
      });
    }

    return () => {
      effectCancelled = true;
      cleanup();
      if (coldStartNavPollRef.current) {
        clearInterval(coldStartNavPollRef.current);
        coldStartNavPollRef.current = null;
      }
    };
  }, [authHydrated]);

  if (!authHydrated || !themeHydrated) {
    return (
      <View
        style={{
          flex: 1,
          ...APP_LAYOUT_ROOT,
          backgroundColor: Platform.OS === "android" ? ANDROID_EDGE_BG : "#fff",
        }}
      />
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        if (isSentryEnabled()) {
          Sentry.captureException(error, {
            extra: { componentStack: info.componentStack },
          });
        }
      }}
    >
      <GestureHandlerRootView
        style={{
          flex: 1,
          ...APP_LAYOUT_ROOT,
          backgroundColor: Platform.OS === "android" ? ANDROID_EDGE_BG : undefined,
        }}
      >
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <ThemeProvider>
            <RootShell>
              <GlobalModalProvider>
                <MarkerBitmapPrerender>
                  <AppInner />
                </MarkerBitmapPrerender>
              </GlobalModalProvider>
            </RootShell>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default isSentryEnabled() ? Sentry.wrap(App) : App;
