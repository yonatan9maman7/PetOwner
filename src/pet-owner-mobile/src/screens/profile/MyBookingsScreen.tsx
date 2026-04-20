import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { bookingsApi } from "../../api/client";
import type { BookingDto } from "../../types/api";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: "#fef9c3", text: "#92400e" },
  Confirmed: { bg: "#dcfce7", text: "#16a34a" },
  Completed: { bg: "#dbeafe", text: "#1d4ed8" },
  Cancelled: { bg: "#fee2e2", text: "#dc2626" },
  Paid: { bg: "#d1fae5", text: "#065f46" },
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

export function MyBookingsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const role = user?.role ?? "Owner";
  const showTabs = role === "Provider" || role === "Admin";

  const initialTab = route.params?.tab === "incoming" ? "incoming" : "outgoing";

  const [allBookings, setAllBookings] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const fetchBookings = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await bookingsApi.getMine();
        setAllBookings(data);
      } catch (error) {
        if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
          Alert.alert(t("genericErrorTitle"), t("genericErrorDesc"));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
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

  const handleCancel = (booking: BookingDto) => {
    Alert.alert(t("cancelBooking"), t("cancelBookingConfirm"), [
      { text: t("backStep"), style: "cancel" },
      {
        text: t("cancelBooking"),
        style: "destructive",
        onPress: async () => {
          try {
            await bookingsApi.cancel(booking.id);
            Alert.alert(t("bookingCancelled"));
            fetchBookings(true);
          } catch {
            Alert.alert(t("errorTitle"));
          }
        },
      },
    ]);
  };

  const handleConfirm = (booking: BookingDto) => {
    Alert.alert(t("confirmBookingAction"), undefined, [
      { text: t("backStep"), style: "cancel" },
      {
        text: t("confirmBookingAction"),
        onPress: async () => {
          try {
            await bookingsApi.confirm(booking.id);
            Alert.alert(t("bookingConfirmed"));
            fetchBookings(true);
          } catch {
            Alert.alert(t("errorTitle"));
          }
        },
      },
    ]);
  };

  const handleDecline = (booking: BookingDto) => {
    Alert.alert(t("declineBooking"), t("declineBookingConfirm"), [
      { text: t("backStep"), style: "cancel" },
      {
        text: t("declineBooking"),
        style: "destructive",
        onPress: async () => {
          try {
            await bookingsApi.cancel(booking.id);
            Alert.alert(t("bookingDeclined"));
            fetchBookings(true);
          } catch {
            Alert.alert(t("errorTitle"));
          }
        },
      },
    ]);
  };

  const handleMarkComplete = (booking: BookingDto) => {
    Alert.alert(t("markCompleted"), undefined, [
      { text: t("backStep"), style: "cancel" },
      {
        text: t("markCompleted"),
        onPress: async () => {
          try {
            await bookingsApi.complete(booking.id);
            fetchBookings(true);
          } catch {
            Alert.alert(t("errorTitle"));
          }
        },
      },
    ]);
  };

  const renderOutgoingCard = ({ item }: { item: BookingDto }) => {
    const isPaid = item.paymentStatus === "Paid";
    const sc = isPaid
      ? STATUS_COLORS.Paid
      : STATUS_COLORS[item.status] ?? STATUS_COLORS.Pending;
    const canCancel =
      item.status !== "Completed" &&
      item.status !== "Cancelled" &&
      item.paymentStatus !== "Paid" &&
      (item.status === "Pending" || item.status === "Confirmed");
    const canLeaveReview =
      !item.hasReview && item.status === "Completed";
    const canPay =
      item.status === "Confirmed" &&
      !!item.paymentUrl &&
      item.paymentStatus !== "Paid";

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
            flexDirection: isRTL ? "row-reverse" : "row",
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
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: sc.text }}>
              {isPaid ? t("statusPaid") : t(statusKey(item.status))}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
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
            flexDirection: isRTL ? "row-reverse" : "row",
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
            flexDirection: isRTL ? "row-reverse" : "row",
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
              onPress={() => handleCancel(item)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#dc2626",
              }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#dc2626" }}
              >
                {t("cancelBooking")}
              </Text>
            </Pressable>
          )}
        </View>

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
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.Pending;
    const isPending = item.status === "Pending";
    const canMarkComplete =
      item.status !== "Completed" &&
      item.status !== "Cancelled" &&
      (item.status === "Confirmed" || item.paymentStatus === "Paid");

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
            flexDirection: isRTL ? "row-reverse" : "row",
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
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: sc.text }}>
              {t(statusKey(item.status))}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
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
            flexDirection: isRTL ? "row-reverse" : "row",
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
              flexDirection: isRTL ? "row-reverse" : "row",
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
            flexDirection: isRTL ? "row-reverse" : "row",
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
                flexDirection: isRTL ? "row-reverse" : "row",
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
                onPress={() => handleDecline(item)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#dc2626",
                }}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#dc2626" }}
                >
                  {t("declineBooking")}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {canMarkComplete ? (
          <Pressable
            onPress={() => handleMarkComplete(item)}
            className="mt-3 py-3 rounded-xl items-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: colors.primaryText }}
            >
              {t("markCompleted")}
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
          flexDirection: isRTL ? "row-reverse" : "row",
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
            flexDirection: isRTL ? "row-reverse" : "row",
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
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.text} />
        </View>
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
    </SafeAreaView>
  );
}

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
