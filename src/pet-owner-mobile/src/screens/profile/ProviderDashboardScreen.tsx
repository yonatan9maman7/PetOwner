import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { useProviderDashboardStore } from "../../store/providerDashboardStore";
import { ListSkeleton, ListEmptyState, InlineError } from "../../components/shared";
import type { TranslationKey } from "../../i18n";
import type {
  EarningsTransactionDto,
  TodayScheduleDto,
  UpcomingBookingDto,
} from "../../types/api";

function formatMoney(n: number): string {
  return `₪${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

function StatCard({
  icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: "45%",
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 14,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${color}18`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "600", marginTop: 2 }} numberOfLines={2}>
        {label}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function StatusBadge({ status, t }: { status: string; t: (k: TranslationKey) => string }) {
  const { colors } = useTheme();
  const s = status.toLowerCase();
  let bg = colors.surfaceSecondary;
  let fg = colors.textSecondary;
  let label = status;

  if (s === "accepted") {
    bg = colors.successLight;
    fg = colors.success;
    label = t("statusAccepted");
  } else if (s === "completed") {
    bg = "#dbeafe";
    fg = "#1d4ed8";
    label = t("statusCompleted");
  } else if (s === "captured") {
    bg = colors.successLight;
    fg = colors.success;
    label = t("statusCaptured");
  } else if (s === "authorized") {
    bg = colors.warningLight;
    fg = colors.warning;
    label = t("statusAuthorized");
  } else if (s === "pending") {
    bg = "#fef9c3";
    fg = "#92400e";
    label = t("statusPending");
  } else if (s === "cancelled") {
    bg = colors.dangerLight;
    fg = colors.danger;
    label = t("statusCancelled");
  }

  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: fg }}>{label}</Text>
    </View>
  );
}

function TodayRow({ item, isRTL, rtlText }: { item: TodayScheduleDto; isRTL: boolean; rtlText: object }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      className="rounded-xl p-3 mb-2"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}
    >
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[{ flex: 1, fontWeight: "700", color: colors.text }, rtlText]} numberOfLines={1}>
          {item.timeSlot}
        </Text>
        <StatusBadge status={item.status} t={t} />
      </View>
      <Text style={[{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }, rtlText]}>
        {item.petOwnerName}
        {item.petName ? ` · ${item.petName}` : ""}
      </Text>
    </View>
  );
}

function UpcomingRow({ item, isRTL, rtlText }: { item: UpcomingBookingDto; isRTL: boolean; rtlText: object }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      className="rounded-xl p-3 mb-2"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}
    >
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={[{ fontSize: 15, fontWeight: "700", color: colors.text }, rtlText]} numberOfLines={2}>
            {item.petOwnerName}
            {item.petName ? ` · ${item.petName}` : ""}
          </Text>
          {item.serviceName ? (
            <Text style={[{ fontSize: 12, color: colors.textMuted, marginTop: 2 }, rtlText]} numberOfLines={1}>
              {item.serviceName}
            </Text>
          ) : null}
          <Text style={[{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }, rtlText]}>
            {formatDateTime(item.scheduledStart)} — {formatDateTime(item.scheduledEnd)}
          </Text>
        </View>
        <StatusBadge status={item.status} t={t} />
      </View>
      {item.totalPrice != null ? (
        <Text style={[{ fontSize: 14, fontWeight: "800", color: colors.text, marginTop: 8 }, rtlText]}>
          {formatMoney(item.totalPrice)}
        </Text>
      ) : null}
    </View>
  );
}

function TransactionRow({ item, isRTL, rtlText }: { item: EarningsTransactionDto; isRTL: boolean; rtlText: object }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      className="py-3 border-b"
      style={{ borderBottomColor: colors.borderLight, flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[{ fontWeight: "600", color: colors.text }, rtlText]} numberOfLines={1}>
          {item.ownerName}
        </Text>
        {item.petName ? (
          <Text style={[{ fontSize: 12, color: colors.textMuted, marginTop: 2 }, rtlText]} numberOfLines={1}>
            {item.petName}
          </Text>
        ) : null}
        <Text style={[{ fontSize: 11, color: colors.textMuted, marginTop: 4 }, rtlText]}>
          {formatDateTime(item.createdAt)}
        </Text>
      </View>
      <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
        <Text style={{ fontWeight: "800", color: colors.text }}>{formatMoney(item.netAmount)}</Text>
        <View style={{ marginTop: 4 }}>
          <StatusBadge status={item.status} t={t} />
        </View>
      </View>
    </View>
  );
}

export function ProviderDashboardScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();

  const stats = useProviderDashboardStore((s) => s.stats);
  const earnings = useProviderDashboardStore((s) => s.earnings);
  const transactions = useProviderDashboardStore((s) => s.transactions);
  const loading = useProviderDashboardStore((s) => s.loading);
  const earningsLoading = useProviderDashboardStore((s) => s.earningsLoading);
  const transactionsLoading = useProviderDashboardStore((s) => s.transactionsLoading);
  const error = useProviderDashboardStore((s) => s.error);
  const fetchAll = useProviderDashboardStore((s) => s.fetchAll);

  useFocusEffect(
    useCallback(() => {
      void fetchAll();
    }, [fetchAll]),
  );

  const refreshing = loading && stats != null;

  const earningsSectionLoading = earningsLoading && !earnings;

  const ratingSubtitle = stats ? `${stats.reviewCount} ${t("reviews")}` : undefined;

  return (
    <SafeAreaView className="flex-1" edges={["top"]} style={{ marginTop: -8, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <Text
          style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center" }}
          numberOfLines={1}
        >
          {t("providerDashboardTitle")}
        </Text>
        <Pressable
          onPress={() => navigation.navigate("ProviderEdit")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("providerSettings")}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void fetchAll()} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {error ? <InlineError message={error} onRetry={() => void fetchAll()} /> : null}

        {loading && !stats ? (
          <View className="pt-2">
            <ListSkeleton rows={2} variant="card" />
          </View>
        ) : null}

        {stats ? (
          <>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <StatCard
                icon="cash-outline"
                label={t("providerTotalEarnings")}
                value={formatMoney(stats.totalEarnings)}
                color={colors.success}
              />
              <StatCard
                icon="trending-up-outline"
                label={t("providerMonthlyEarnings")}
                value={formatMoney(stats.monthlyEarnings)}
                color={colors.primary}
              />
              <StatCard
                icon="calendar-outline"
                label={t("providerActiveBookings")}
                value={String(stats.pendingBookings)}
                color={colors.warning}
              />
              <StatCard
                icon="star"
                label={t("providerRating")}
                value={stats.averageRating.toFixed(1)}
                color="#f59e0b"
                subtitle={ratingSubtitle}
              />
            </View>

            <View
              className="flex-row flex-wrap gap-2 mb-6"
              style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center" }}
            >
              <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: colors.primaryLight }}>
                <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                  {t("providerCompletionRate")}: {stats.completionRate}%
                </Text>
              </View>
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                {t("providerTotalBookings")}: {stats.totalBookings}
              </Text>
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                {t("providerCompletedBookings")}: {stats.completedBookings}
              </Text>
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                {t("providerCancelledBookings")}: {stats.cancelledBookings}
              </Text>
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                {t("providerThisMonthBookings")}: {stats.thisMonthBookings}
              </Text>
            </View>

            <Text style={[{ fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 10 }, rtlText]}>
              {t("providerTodaySchedule")}
            </Text>
            {stats.todaySchedule.length === 0 ? (
              <ListEmptyState icon="calendar-outline" title={t("providerTodayEmpty")} message={undefined} />
            ) : (
              stats.todaySchedule.map((item) => <TodayRow key={item.id} item={item} isRTL={isRTL} rtlText={rtlText} />)
            )}

            <Text style={[{ fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 20, marginBottom: 10 }, rtlText]}>
              {t("providerUpcoming")}
            </Text>
            {stats.upcomingBookings.length === 0 ? (
              <ListEmptyState icon="calendar-outline" title={t("providerUpcomingEmpty")} message={undefined} />
            ) : (
              stats.upcomingBookings.map((item) => <UpcomingRow key={item.id} item={item} isRTL={isRTL} rtlText={rtlText} />)
            )}

            <Text style={[{ fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 8, marginBottom: 10 }, rtlText]}>
              {t("providerEarningsSection")}
            </Text>

            {earningsSectionLoading ? (
              <ListSkeleton rows={3} variant="row" />
            ) : earnings ? (
              <View
                className="rounded-2xl p-4 mb-4"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                }}
              >
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", gap: 8 }}>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>{t("providerNetEarnings")}</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 4 }}>
                      {formatMoney(earnings.netEarnings)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>{t("providerPendingPayouts")}</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: colors.warning, marginTop: 4 }}>
                      {formatMoney(earnings.pendingAmount)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>{t("providerCompletedBookings")}</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 4 }}>
                      {earnings.completedBookings}
                    </Text>
                  </View>
                </View>
                <Text style={[{ fontSize: 11, color: colors.textMuted, marginTop: 12, textAlign: "center" }, rtlText]}>
                  {t("providerTotalEarnings")}: {formatMoney(earnings.totalEarned)} · {t("providerPlatformFeesLabel")}:{" "}
                  {formatMoney(earnings.platformFees)}
                </Text>
              </View>
            ) : null}

            <Text style={[{ fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 8 }, rtlText]}>
              {t("providerRecentTransactions")}
            </Text>

            {transactionsLoading && transactions.length === 0 ? (
              <ListSkeleton rows={4} variant="row" />
            ) : transactions.length === 0 ? (
              <ListEmptyState icon="receipt-outline" title={t("providerNoTransactions")} message={undefined} />
            ) : (
              <View
                className="rounded-2xl px-3 mb-4"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}
              >
                {transactions.map((tx) => (
                  <TransactionRow key={tx.paymentId} item={tx} isRTL={isRTL} rtlText={rtlText} />
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
