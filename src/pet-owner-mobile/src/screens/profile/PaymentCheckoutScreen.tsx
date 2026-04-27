import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  BackHandler,
  Platform,
  Linking,
  StyleSheet,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { bookingsApi } from "../../api/client";
import { InlineError } from "../../components/shared/InlineError";

/** Must match Grow / backend redirect URLs (intercepted in WebView, not loaded as real pages). */
const SUCCESS_PREFIX = "https://petowner.app/payment/success";
const CANCEL_PREFIX = "https://petowner.app/payment/cancel";

export type PaymentCheckoutParams = {
  bookingId: string;
  paymentUrl: string;
  providerName: string;
};

export function PaymentCheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();

  const { bookingId, paymentUrl, providerName } = route.params as PaymentCheckoutParams;

  const webViewRef = useRef<WebView>(null);
  const handledRedirectRef = useRef(false);
  const pollCancelledRef = useRef(false);
  const mountedRef = useRef(true);

  const [webViewLoading, setWebViewLoading] = useState(true);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  /** idle = showing WebView; processing = success redirect, polling backend */
  const [paymentPhase, setPaymentPhase] = useState<"idle" | "processing">("idle");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollCancelledRef.current = true;
    };
  }, []);

  const finishWithDelayedMessage = useCallback(() => {
    showGlobalAlertCompat(t("paymentTitle"), t("paymentSuccessDelayed"), [
      { text: t("confirmAction"), onPress: () => navigation.goBack() },
    ]);
  }, [navigation, t]);

  const pollUntilPaid = useCallback(async () => {
    for (let i = 0; i < 5; i++) {
      if (pollCancelledRef.current || !mountedRef.current) return;
      try {
        const b = await bookingsApi.getById(bookingId);
        if (b.paymentStatus === "Paid") {
          if (mountedRef.current) navigation.goBack();
          return;
        }
      } catch {
        // continue polling; transient errors
      }
      if (i < 4 && mountedRef.current && !pollCancelledRef.current) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    if (mountedRef.current && !pollCancelledRef.current) {
      finishWithDelayedMessage();
    }
  }, [bookingId, finishWithDelayedMessage, navigation]);

  const handlePaymentSuccess = useCallback(() => {
    if (handledRedirectRef.current) return;
    handledRedirectRef.current = true;
    setPaymentPhase("processing");
    void pollUntilPaid();
  }, [pollUntilPaid]);

  const tryHandleRedirectUrl = useCallback(
    (url: string): boolean => {
      if (url.startsWith(SUCCESS_PREFIX)) {
        handlePaymentSuccess();
        return true;
      }
      if (url.startsWith(CANCEL_PREFIX)) {
        if (handledRedirectRef.current) return true;
        handledRedirectRef.current = true;
        navigation.goBack();
        return true;
      }
      return false;
    },
    [handlePaymentSuccess, navigation],
  );

  const onNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      tryHandleRedirectUrl(navState.url);
    },
    [tryHandleRedirectUrl],
  );

  const reloadWebView = useCallback(() => {
    setWebViewError(null);
    setWebViewLoading(true);
    webViewRef.current?.reload();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        if (paymentPhase === "processing") {
          pollCancelledRef.current = true;
          navigation.goBack();
          return true;
        }
        showGlobalAlertCompat(t("paymentTitle"), t("paymentLeaveConfirm"), [
          { text: t("backStep"), style: "cancel" },
          {
            text: t("confirmAction"),
            style: "destructive",
            onPress: () => navigation.goBack(),
          },
        ]);
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
      return () => sub.remove();
    }, [navigation, paymentPhase, t]),
  );

  const headerTitle = `${t("paymentTitle")} · ${providerName ?? ""}`.trim();

  if (Platform.OS === "web") {
    return (
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: colors.background }}
      >
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 14,
            backgroundColor: colors.surface,
          }}
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
          </Pressable>
          <Text
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: "700",
              color: colors.text,
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View className="flex-1 px-5 pt-6">
          <Text style={[{ fontSize: 15, color: colors.textSecondary, lineHeight: 22 }, rtlText]}>
            {t("paymentWebHint")}
          </Text>
          <Pressable
            onPress={() => Linking.openURL(paymentUrl)}
            className="mt-6 py-4 rounded-xl items-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryText }}>
              {t("paymentOpenInBrowser")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: colors.background }}
    >
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <Text
          style={[
            {
              flex: 1,
              fontSize: 17,
              fontWeight: "700",
              color: colors.text,
              textAlign: "center",
            },
            rtlText,
          ]}
          numberOfLines={1}
        >
          {headerTitle}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {webViewError ? (
        <View className="px-4 pt-3">
          <InlineError message={webViewError} onRetry={reloadWebView} />
        </View>
      ) : null}

      {paymentPhase === "processing" ? (
        <View
          className="flex-1 items-center justify-center px-8"
          style={{ backgroundColor: colors.background }}
        >
          <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
          <Text
            style={[
              {
                marginTop: 20,
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                textAlign: "center",
              },
              rtlText,
            ]}
          >
            {t("paymentProcessing")}
          </Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        </View>
      ) : (
        <View className="flex-1 relative">
          <WebView
            ref={webViewRef}
            source={{ uri: paymentUrl }}
            style={{ flex: 1, backgroundColor: colors.background }}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => {
              setWebViewLoading(false);
              setWebViewError(null);
            }}
            onError={() => {
              setWebViewLoading(false);
              setWebViewError(t("paymentFailed"));
            }}
            onHttpError={() => {
              setWebViewLoading(false);
              setWebViewError(t("paymentFailed"));
            }}
            onNavigationStateChange={onNavigationStateChange}
            onShouldStartLoadWithRequest={(req) => {
              if (tryHandleRedirectUrl(req.url)) return false;
              return true;
            }}
            startInLoadingState
          />
          {webViewLoading ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: `${colors.background}e6`,
                },
              ]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}
