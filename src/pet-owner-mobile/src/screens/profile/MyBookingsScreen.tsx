import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  InteractionManager,
} from "react-native";
import { showGlobalAlertCompat, showGlobalConfirm, showGlobalAlert } from "../../components/global-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useBookingsStore } from "../../store/bookingsStore";
import { bookingsApi } from "../../api/client";
import { ScreenLoadingCenter } from "../../components/shared/ScreenLoadingCenter";
import type { BookingDto } from "../../types/api";
import CancelBookingSheet from "./CancelBookingSheet";
import type { CancelBookingMode } from "./CancelBookingSheet";
import { addBookingToDeviceCalendar } from "../../utils/calendarUtils";

const STATUS_COLORS: Record<string, { bg: string; text: string; dot?: string }> = {
  Pending:    { bg: "#fef9c3", text: "#92400e",  dot: "#f59e0b" },
  Confirmed:  { bg: "#dcfce7", text: "#16a34a",  dot: "#22c55e" },
  Completed:  { bg: "#dbeafe", text: "#1d4ed8",  dot: "#3b82f6" },
  Cancelled:  { bg: "#f3f4f6", text: "#6b7280",  dot: "#9ca3af" },
  Authorized: { bg: "#fff7ed", text: "#c2410c",  dot: "#f97316" }, // amber-orange — funds on hold
  Paid:       { bg: "#dcfce7", text: "#065f46",  dot: "#22c55e" }, // satisfying green
  Voided:     { bg: "#f3f4f6", text: "#6b7280",  dot: "#9ca3af" },
};

type Tab = "outgoing" | "incoming";

function statusKey(
  status: string,
): "statusPending" | "statusConfirmed" | "statusCompleted" | "statusCancelled" {
  switch (status) {
    case "Confirmed":
      return "statusConfirmed";
    case "Completed":
      return "statusCompleted";
    case "Cancelled":
      return "statusCancelled";
    default:
      return "statusPending";
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isFutureBooking(b: BookingDto): boolean {
  return new Date(b.startDate) > new Date();
}

function canAddBookingToCalendar(b: BookingDto): boolean {
  if (!isFutureBooking(b)) return false;
  if (b.status === "Cancelled" || b.status === "Completed") return false;
  return (
    b.status === "Confirmed" ||
    b.paymentStatus === "Authorized" ||
    b.paymentStatus === "Paid"
  );
}

export function MyBookingsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  });
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const role = user?.role ?? "Owner";
  const showTabs = role === "Provider" || role === "Admin";

  const initialTab = route.params?.tab === "incoming" ? "incoming" : "outgoing";

  const allBookings = useBookingsStore((s) => s.allBookings);
  const loading = useBookingsStore((s) => s.loading);
  const fetchMine = useBookingsStore((s) => s.fetchMine);
  const clearBookingError = useBookingsStore((s) => s.clearError);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Cancel / decline sheet state
  const [cancelSheet, setCancelSheet] = useState<{
    booking: BookingDto;
    mode: CancelBookingMode;
  } | null>(null);

  // Per-booking action loading states
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Full-screen overlay while an async payment action runs (capture / void)
  const [actionOverlay, setActionOverlay] = useState<{
    message: string;
    icon: "checkmark-circle" | "close-circle" | "card";
  } | null>(null);

  const fetchBookings = useCallback(
    async (silent = false) => {
      await fetchMine({ silent });
      const err = useBookingsStore.getState().error;
      if (err) {
        showGlobalAlertCompat(tRef.current("genericErrorTitle"), String(err));
        clearBookingError();
      }
      setRefreshing(false);
    },
    // `t` from useTranslation is a new function each render; including it (or a callback
    // that closed over t) in deps caused useFocusEffect to re-run every render while focused.
    [fetchMine, clearBookingError],
  );

  useFocusEffect(
    useCallback(() => {
      void fetchBookings();
    }, [fetchBookings]),
  );

  const { outgoing, incoming } = useMemo(() => {
    const out: BookingDto[] = [];
    const inc: BookingDto[] = [];
    for (const b of allBookings) {
      if (b.providerProfileId === userId) inc.push(b);
      if (b.ownerId === userId) out.push(b);
    }
    return { outgoing: out, incoming: inc };
  }, [allBookings, userId]);

  const pendingIncomingCount = useMemo(
    () => incoming.filter((b) => b.status === "Pending").length,
    [incoming],
  );

  const bookings = activeTab === "incoming" ? incoming : outgoing;

  const handleCancel = useCallback((booking: BookingDto) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isAuthorized = booking.paymentStatus === "Authorized";
    if (isAuthorized) {
      // Extra friction: warn that the credit hold will be released before opening sheet.
      showGlobalConfirm(
        t("cancelAuthorizedTitle"),
        t("cancelAuthorizedMessage"),
        () => setCancelSheet({ booking, mode: "owner" }),
        undefined,
        { confirmText: t("proceedCancelBtn"), cancelText: t("backStep"), destructive: true },
      );
    } else {
      setCancelSheet({ booking, mode: "owner" });
    }
  }, [t]);

  const handleConfirm = useCallback((booking: BookingDto) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showGlobalConfirm(
      t("confirmBookingAction"),
      undefined,
      async () => {
        try {
          await bookingsApi.confirm(booking.id);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showGlobalAlert(t("bookingConfirmed"));
          fetchBookings(true);
        } catch {
          /* error toast from global API interceptor */
        }
      },
      undefined,
      { confirmText: t("confirmBookingAction"), cancelText: t("backStep") },
    );
  }, [t, fetchBookings]);

  const handleDecline = useCallback((booking: BookingDto) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCancelSheet({ booking, mode: "provider" });
  }, []);

  const handleSheetConfirm = useCallback(
    async (reason: string) => {
      if (!cancelSheet) return;
      const snap = cancelSheet;
      const isAuthorized = snap.booking.paymentStatus === "Authorized";

      // Dismiss sheet first so the overlay renders on top cleanly.
      setCancelSheet(null);
      setCancellingId(snap.booking.id);
      setActionOverlay({
        message: isAuthorized ? t("cancellingAuthorizedOverlay") : t("cancelBooking") + "...",
        icon: "close-circle",
      });
      try {
        await bookingsApi.cancel(snap.booking.id, reason);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const successKey = snap.mode === "owner" ? "bookingCancelled" : "bookingDeclined";
        setCancellingId(null);
        setActionOverlay(null);
        InteractionManager.runAfterInteractions(() => {
          showGlobalAlertCompat(t(successKey));
          fetchBookings(true);
        });
      } catch {
        /* error toast from global API interceptor */
      } finally {
        setCancellingId(null);
        setActionOverlay(null);
      }
    },
    [cancelSheet, t, fetchBookings],
  );

  const handleSheetDismiss = useCallback(() => setCancelSheet(null), []);

  const handleMarkComplete = useCallback((booking: BookingDto) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showGlobalConfirm(
      t("markCompleted"),
      t("markCompletedConfirm"),
      async () => {
        setCompletingId(booking.id);
        setActionOverlay({ message: t("completingBookingOverlay"), icon: "card" });
        try {
          await bookingsApi.complete(booking.id);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setCompletingId(null);
          setActionOverlay(null);
          InteractionManager.runAfterInteractions(() => {
            showGlobalAlert(
              t("captureSuccessTitle"),
              t("captureSuccessMessage").replace("{amount}", booking.totalPrice.toFixed(2)),
            );
            fetchBookings(true);
          });
        } catch {
          /* error toast from global API interceptor */
        } finally {
          setCompletingId(null);
          setActionOverlay(null);
        }
      },
      undefined,
      { confirmText: t("markCompleted"), cancelText: t("backStep") },
    );
  }, [t, fetchBookings]);

  const renderOutgoingCard = ({ item }: { item: BookingDto }) => {
    const isAuthorized = item.paymentStatus === "Authorized";
    const isPaid       = item.paymentStatus === "Paid";
    const isVoided     = item.paymentStatus === "Voided";

    // Status chip: prioritise payment state over booking state for visibility.
    const sc = isPaid
      ? STATUS_COLORS.Paid
      : isAuthorized
      ? STATUS_COLORS.Authorized
      : isVoided
      ? STATUS_COLORS.Voided
      : STATUS_COLORS[item.status] ?? STATUS_COLORS.Pending;

    const statusChipText = isPaid
      ? t("statusPaid")
      : isAuthorized
      ? t("statusAuthorized")
      : isVoided
      ? t("statusVoided")
      : t(statusKey(item.status));

    // Owner can cancel until funds are captured (Paid = captured; Authorized = voidable on server).
    const canCancel =
      item.status !== "Completed" &&
      item.status !== "Cancelled" &&
      item.paymentStatus !== "Paid";

    const canLeaveReview = !item.hasReview && item.status === "Completed";

    // Only show Pay button when not yet authorized (payment hasn't been initiated by owner).
    const canPay =
      item.status === "Confirmed" &&
      !!item.paymentUrl &&
      item.paymentStatus === "Pending";

    const canAddToCalendar = canAddBookingToCalendar(item);

    const isCancelling = cancellingId === item.id;

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          marginHorizontal: 20,
          marginBottom: 14,
          padding: 18,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.providerName}
          </Text>
          <View
            style={{
              backgroundColor: sc.bg,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
            }}
          >
            <View style={{
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: sc.dot ?? sc.text,
            }} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: sc.text }}>
              {statusChipText}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="briefcase-outline"
            size={14}
            color={colors.textMuted}
          />
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              fontWeight: "500",
            }}
          >
            {item.service}
          </Text>
        </View>

        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={colors.textMuted}
          />
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            {formatDate(item.startDate)} {formatTime(item.startDate)} —{" "}
            {formatDate(item.endDate)} {formatTime(item.endDate)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text
            style={{ fontSize: 18, fontWeight: "800", color: colors.text }}
          >
            ₪{item.totalPrice.toFixed(2)}
          </Text>
          {canCancel && (
            <Pressable
              onPress={() => !isCancelling && handleCancel(item)}
              disabled={isCancelling}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#dc2626",
                opacity: isCancelling ? 0.6 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isCancelling && (
                <ActivityIndicator size="small" color="#dc2626" />
              )}
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#dc2626" }}
              >
                {t("cancelBooking")}
              </Text>
            </Pressable>
          )}
        </View>

        {canAddToCalendar ? (
          <Pressable
            onPress={() => void addBookingToDeviceCalendar(item, "owner")}
            className="mt-3 py-3 rounded-xl items-center flex-row justify-center gap-2"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>
              {t("addToCalendar")}
            </Text>
          </Pressable>
        ) : null}

        {canPay && item.paymentUrl ? (
          <Pressable
            onPress={() =>
              navigation.navigate("PaymentCheckout", {
                bookingId: item.id,
                paymentUrl: item.paymentUrl,
                providerName: item.providerName,
              })
            }
            className="mt-3 py-3 rounded-xl items-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primaryText }}>
              {t("payNow")}
            </Text>
          </Pressable>
        ) : null}

        {item.notes ? (
          <Text
            style={[
              rtlText,
              {
                fontSize: 12,
                color: colors.textMuted,
                marginTop: 8,
                lineHeight: 18,
              },
            ]}
          >
            {item.notes}
          </Text>
        ) : null}

        {canLeaveReview ? (
          <Pressable
            onPress={() =>
              navigation.navigate("WriteReview", {
                bookingId: item.id,
                providerId: item.providerProfileId,
                providerName: item.providerName,
              })
            }
            className="mt-3 py-3 rounded-xl items-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primaryText }}>
              {t("leaveReview")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const renderIncomingCard = ({ item }: { item: BookingDto }) => {
    // Use Authorized payment color on the chip when funds are on hold.
    const isAuthorized = item.paymentStatus === "Authorized";
    const sc = isAuthorized
      ? STATUS_COLORS.Authorized
      : STATUS_COLORS[item.status] ?? STATUS_COLORS.Pending;
    const isPending = item.status === "Pending";

    // Provider can only complete once the owner has authorized (held) the funds.
    const canMarkComplete = item.paymentStatus === "Authorized";
    const canAddToCalendar = canAddBookingToCalendar(item);
    const isCompleting = completingId === item.id;
    const isCancellingIncoming = cancellingId === item.id;

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          marginHorizontal: 20,
          marginBottom: 14,
          padding: 18,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.text,
              }}
              numberOfLines={1}
            >
              {item.ownerName}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.textMuted,
                marginTop: 2,
              }}
            >
              {t("fromOwner")}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: sc.bg,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
            }}
          >
            <View style={{
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: sc.dot ?? sc.text,
            }} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: sc.text }}>
              {isAuthorized ? t("statusAuthorized") : t(statusKey(item.status))}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="briefcase-outline"
            size={14}
            color={colors.textMuted}
          />
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              fontWeight: "500",
            }}
          >
            {item.service}
          </Text>
        </View>

        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={colors.textMuted}
          />
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            {formatDate(item.startDate)} {formatTime(item.startDate)} —{" "}
            {formatDate(item.endDate)} {formatTime(item.endDate)}
          </Text>
        </View>

        {item.ownerPhone ? (
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <Ionicons name="call-outline" size={14} color={colors.textMuted} />
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              {item.ownerPhone}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text
            style={{ fontSize: 18, fontWeight: "800", color: colors.text }}
          >
            ₪{item.totalPrice.toFixed(2)}
          </Text>

          {isPending && (
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                gap: 8,
              }}
            >
              <Pressable
                onPress={() => handleConfirm(item)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: "#16a34a",
                }}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}
                >
                  {t("confirmBookingAction")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => !isCancellingIncoming && handleDecline(item)}
                disabled={isCancellingIncoming}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#dc2626",
                  opacity: isCancellingIncoming ? 0.6 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isCancellingIncoming && (
                  <ActivityIndicator size="small" color="#dc2626" />
                )}
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#dc2626" }}
                >
                  {t("declineBooking")}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {canAddToCalendar ? (
          <Pressable
            onPress={() => void addBookingToDeviceCalendar(item, "provider")}
            className="mt-3 py-3 rounded-xl items-center flex-row justify-center gap-2"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>
              {t("addToCalendar")}
            </Text>
          </Pressable>
        ) : null}

        {(item.status === "Pending" || item.status === "Confirmed" || item.paymentStatus === "Authorized") && (
          <Pressable
            onPress={() => navigation.navigate("BookingPetCare", { bookingId: item.id })}
            className="mt-2 py-3 rounded-xl items-center flex-row justify-center gap-2"
            style={{
              backgroundColor: "#fef2f2",
              borderWidth: 1,
              borderColor: "#fca5a5",
            }}
          >
            <Ionicons name="heart-circle-outline" size={16} color="#dc2626" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#dc2626" }}>
              {t("careCardButtonLabel")}
            </Text>
          </Pressable>
        )}

        {canMarkComplete ? (
          <Pressable
            onPress={() => !isCompleting && handleMarkComplete(item)}
            disabled={isCompleting}
            className="mt-3 py-3 rounded-xl items-center"
            style={{
              backgroundColor: colors.primary,
              opacity: isCompleting ? 0.7 : 1,
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {isCompleting ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: colors.primaryText }}
              >
                {t("markCompleted")}
              </Text>
            )}
          </Pressable>
        ) : null}

        {item.notes ? (
          <Text
            style={[
              rtlText,
              {
                fontSize: 12,
                color: colors.textMuted,
                marginTop: 8,
                lineHeight: 18,
              },
            ]}
          >
            {item.notes}
          </Text>
        ) : null}
      </View>
    );
  };

  const emptyTitle =
    activeTab === "incoming" ? t("noIncomingBookings") : t("noBookings");
  const emptySubtitle =
    activeTab === "incoming"
      ? t("noIncomingBookingsSubtitle")
      : t("noBookingsSubtitle");

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ marginTop: -8, backgroundColor: colors.background }}
    >
      {/* Header */}
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
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={colors.text}
          />
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
          {t("myBookings")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs (only for providers / admins) */}
      {showTabs && (
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 4,
            gap: 10,
          }}
        >
          <TabPill
            label={t("myBookings")}
            active={activeTab === "outgoing"}
            onPress={() => setActiveTab("outgoing")}
            colors={colors}
          />
          <TabPill
            label={t("incomingRequests")}
            active={activeTab === "incoming"}
            onPress={() => setActiveTab("incoming")}
            badge={pendingIncomingCount}
            colors={colors}
          />
        </View>
      )}

      {loading ? (
        <ScreenLoadingCenter title={`${t("myBookings")}…`} />
      ) : bookings.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons
            name={
              activeTab === "incoming"
                ? "mail-open-outline"
                : "calendar-outline"
            }
            size={56}
            color={colors.textMuted}
          />
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              marginTop: 16,
              textAlign: "center",
            }}
          >
            {emptyTitle}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {emptySubtitle}
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={
            activeTab === "incoming" ? renderIncomingCard : renderOutgoingCard
          }
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchBookings(true);
              }}
              tintColor={colors.text}
            />
          }
        />
      )}

      <CancelBookingSheet
        visible={cancelSheet !== null}
        mode={cancelSheet?.mode ?? "owner"}
        onConfirm={handleSheetConfirm}
        onDismiss={handleSheetDismiss}
      />

      <ActionOverlay overlay={actionOverlay} colors={colors} />
    </SafeAreaView>
  );
}

// ─── Action Overlay ───────────────────────────────────────────────────────────

type OverlayIconName = "checkmark-circle" | "close-circle" | "card";

function ActionOverlay({
  overlay,
  colors,
}: {
  overlay: { message: string; icon: OverlayIconName } | null;
  colors: ReturnType<typeof import("../../theme/ThemeContext").useTheme>["colors"];
}) {
  if (!overlay) return null;

  const iconColor =
    overlay.icon === "checkmark-circle"
      ? "#22c55e"
      : overlay.icon === "close-circle"
      ? "#ef4444"
      : colors.primary;

  return (
    <View
      pointerEvents="auto"
      style={[StyleSheet.absoluteFillObject, overlayStyles.host]}
    >
      <View style={overlayStyles.backdrop}>
        <View style={[overlayStyles.card, { backgroundColor: colors.surface }]}>
          <Ionicons name={overlay.icon} size={52} color={iconColor} />
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 20 }}
          />
          <Text style={[overlayStyles.message, { color: colors.text }]}>
            {overlay.message}
          </Text>
        </View>
      </View>
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  host: {
    zIndex: 50,
    elevation: 50,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
  },
});

// ─── Tab Pill ────────────────────────────────────────────────────────────────

function TabPill({
  label,
  active,
  onPress,
  badge,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: active ? colors.text : colors.surface,
        borderWidth: active ? 0 : 1,
        borderColor: colors.borderLight,
        gap: 6,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: active ? colors.textInverse : colors.textSecondary,
        }}
      >
        {label}
      </Text>
      {!!badge && badge > 0 && (
        <View
          style={{
            backgroundColor: active ? "#dc2626" : "#fef9c3",
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 5,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: active ? "#fff" : "#92400e",
            }}
          >
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
