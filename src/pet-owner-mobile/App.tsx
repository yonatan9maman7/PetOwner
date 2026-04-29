import "./global.css";
import { useEffect, useRef } from "react";
import { DevSettings, I18nManager, Keyboard, Platform, View, LogBox } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "react-error-boundary";

// react-native-maps on iOS triggers this warning when MapKit's native gesture
// recognizer absorbs touches before RN Gesture Handler can count them.
// It is harmless and has no user-visible effect.
LogBox.ignoreLogs(["Ended a touch event which was not counted in"]);
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { AppNavigator, navigationRef } from "./src/navigation/AppNavigator";
import { useAuthStore } from "./src/store/authStore";
import { useThemeStore } from "./src/store/themeStore";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { ErrorFallback } from "./src/components/ErrorFallback";
import { ImageSourcePickerHost } from "./src/components/ImageSourcePickerHost";
import { GlobalModalProvider } from "./src/components/global-modal";
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
        onStateChange={() => {
          if (Platform.OS !== "web") {
            Keyboard.dismiss();
          }
        }}
      >
        <AppNavigator />
        <StatusBar style={isDark ? "light" : "dark"} />
      </NavigationContainer>
      <Toast />
      <ImageSourcePickerHost />
    </>
  );
}

export default function App() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const language = useAuthStore((s) => s.language);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const themeHydrated = useThemeStore((s) => s.hydrated);
  const coldStartHandled = useRef(false);
  const coldStartNavPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    hydrateAuth();
    hydrateTheme();
  }, [hydrateAuth, hydrateTheme]);

  useEffect(() => {
    if (!authHydrated || Platform.OS === "web") return;

    const shouldBeRTL = language === "he";
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL);
      I18nManager.allowRTL(true);
      if (!__DEV__) {
        import("expo-updates").then((Updates) =>
          Updates.reloadAsync().catch(() => {}),
        );
      } else if (Platform.OS === "android") {
        // `forceRTL` on Android is only fully applied after restart; in dev a reload syncs
        // `I18nManager.isRTL` with the in-app language (without this, LTR/RTL can appear inverted).
        DevSettings.reload();
      }
    }
  }, [authHydrated, language]);

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
    return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <GlobalModalProvider>
              <AppInner />
            </GlobalModalProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
