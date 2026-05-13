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
import type { BookingDto } from "../../types/api";
import { InlineError } from "../../components/shared/InlineError";

/** Must match Grow / backend redirect URLs (intercepted in WebView, not loaded as real pages). */
const SUCCESS_PREFIX = "https://petowner.app/payment/success";
const CANCEL_PREFIX = "https://petowner.app/payment/cancel";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 15_000;

export type PaymentCheckoutParams = {
  bookingId: string;
  paymentUrl: string;
  providerName: string;
};

type PostPayPhase = "idle" | "processing" | "verifying_manual";

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
  /** After success redirect: polling backend, then optional manual verify. */
  const [postPayPhase, setPostPayPhase] = useState<PostPayPhase>("idle");
  const [bookingDetail, setBookingDetail] = useState<BookingDto | null>(null);
  const [detailLoadError, setDetailLoadError] = useState<string | null>(null);
  const [refreshBusy, setRefreshBusy] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollCancelledRef.current = true;
    };
  }, []);

  const loadBookingDetail = useCallback(async () => {
    try {
      const b = await bookingsApi.getById(bookingId);
      if (mountedRef.current) {
        setBookingDetail(b);
        setDetailLoadError(null);
      }
      return b;
    } catch {
      if (mountedRef.current) {
        setDetailLoadError(t("genericErrorDesc"));
      }
      return null;
    }
  }, [bookingId, t]);

  useEffect(() => {
    void loadBookingDetail();
  }, [loadBookingDetail]);

  const pollUntilPaid = useCallback(async () => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (!pollCancelledRef.current && mountedRef.current && Date.now() < deadline) {
      try {
        const b = await bookingsApi.getById(bookingId);
        if (mountedRef.current) {
          setBookingDetail(b);
          if (b.paymentStatus === "Paid") {
            navigation.goBack();
            return;
          }
        }
      } catch {
        // transient — continue until timeout
      }
      if (pollCancelledRef.current || !mountedRef.current) return;
      if (Date.now() >= deadline) break;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    if (mountedRef.current && !pollCancelledRef.current) {
      setPostPayPhase("verifying_manual");
    }
  }, [bookingId, navigation]);

  const handlePaymentSuccess = useCallback(() => {
    if (handledRedirectRef.current) return;
    handledRedirectRef.current = true;
    setPostPayPhase("processing");
    void pollUntilPaid();
  }, [pollUntilPaid]);

  const onRefreshStatusPress = useCallback(async () => {
    setRefreshBusy(true);
    try {
      const b = await bookingsApi.getById(bookingId);
      if (!mountedRef.current) return;
      setBookingDetail(b);
      if (b.paymentStatus === "Paid") {
        navigation.goBack();
        return;
      }
    } catch {
      showGlobalAlertCompat(t("genericErrorTitle"), t("genericErrorDesc"));
    } finally {
      if (mountedRef.current) setRefreshBusy(false);
    }
  }, [bookingId, navigation, t]);

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

  const awaitingPostPay = postPayPhase === "processing" || postPayPhase === "verifying_manual";

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        if (awaitingPostPay) {
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
    }, [navigation, awaitingPostPay, t]),
  );

  const headerTitle = `${t("paymentTitle")} · ${providerName ?? ""}`.trim();

  const showItemized =
    bookingDetail &&
    (bookingDetail.grossAmount > 0 || bookingDetail.serviceFee > 0 || bookingDetail.totalPrice > 0);

  const breakdownCard = showItemized ? (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        padding: 16,
        borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <Text style={[rtlText, { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 10 }]}>
        {t("paymentSummaryTitle")}
      </Text>
      {bookingDetail!.grossAmount > 0 || bookingDetail!.serviceFee > 0 ? (
        <>
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text style={[rtlText, { flex: 1, fontSize: 13, color: colors.textSecondary, paddingEnd: 8 }]}>
              {t("bookingBreakdownBase")}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
              ₪{bookingDetail!.grossAmount.toFixed(2)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text style={[rtlText, { flex: 1, fontSize: 13, color: colors.textSecondary, paddingEnd: 8 }]}>
              {t("bookingBreakdownFee")}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
              ₪{bookingDetail!.serviceFee.toFixed(2)}
            </Text>
          </View>
        </>
      ) : null}
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: bookingDetail!.grossAmount > 0 || bookingDetail!.serviceFee > 0 ? 10 : 0,
          borderTopWidth: bookingDetail!.grossAmount > 0 || bookingDetail!.serviceFee > 0 ? 1 : 0,
          borderTopColor: colors.borderLight,
        }}
      >
        <Text style={[rtlText, { flex: 1, fontSize: 14, fontWeight: "800", color: colors.text, paddingEnd: 8 }]}>
          {t("bookingBreakdownTotal")}
        </Text>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.primary }}>
          ₪{bookingDetail!.totalPrice.toFixed(2)}
        </Text>
      </View>
    </View>
  ) : null;

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
        {breakdownCard}
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

      {detailLoadError ? (
        <View className="px-4 pt-2">
          <InlineError
            message={detailLoadError}
            onRetry={() => {
              void loadBookingDetail();
            }}
          />
        </View>
      ) : null}

      {postPayPhase === "idle" ? breakdownCard : null}

      {webViewError ? (
        <View className="px-4 pt-3">
          <InlineError message={webViewError} onRetry={reloadWebView} />
        </View>
      ) : null}

      {postPayPhase === "processing" ? (
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
      ) : postPayPhase === "verifying_manual" ? (
        <View
          className="flex-1 items-center justify-center px-8"
          style={{ backgroundColor: colors.background }}
        >
          <Ionicons name="time-outline" size={56} color={colors.primary} />
          <Text
            style={[
              {
                marginTop: 20,
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                textAlign: "center",
                lineHeight: 24,
              },
              rtlText,
            ]}
          >
            {t("paymentVerifyingWithProvider")}
          </Text>
          <Pressable
            onPress={() => void onRefreshStatusPress()}
            disabled={refreshBusy}
            style={{
              marginTop: 28,
              paddingVertical: 14,
              paddingHorizontal: 28,
              borderRadius: 14,
              backgroundColor: colors.primary,
              minWidth: 200,
              alignItems: "center",
              justifyContent: "center",
              opacity: refreshBusy ? 0.7 : 1,
            }}
          >
            {refreshBusy ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryText }}>
                {t("paymentRefreshStatus")}
              </Text>
            )}
          </Pressable>
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
