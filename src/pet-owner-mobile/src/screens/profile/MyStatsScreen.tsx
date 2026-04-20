import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { providerApi, usersApi } from "../../api/client";
import { SparklineChart } from "../../components/SparklineChart";
import type {
  AchievementDto,
  EarningsSparklineDto,
  OwnerStatsDto,
  ProviderBookingStatsDto,
  StatRange,
} from "../../types/api";

type TabKey = "spending" | "earnings";

const RANGE_OPTIONS: { key: StatRange; labelKey: string }[] = [
  { key: "7d", labelKey: "statRange7d" },
  { key: "30d", labelKey: "statRange30d" },
  { key: "year", labelKey: "statRangeYear" },
  { key: "all", labelKey: "statRangeAll" },
];

/** Maps achievement codes to a localized label key + Ionicon name. Keep in sync with backend codes. */
const ACHIEVEMENT_META: Record<string, { labelKey: string; icon: keyof typeof Ionicons.glyphMap }> = {
  "owner.first_paid": { labelKey: "achOwnerFirstPaid", icon: "ribbon-outline" },
  "owner.5_paid": { labelKey: "achOwner5Paid", icon: "trophy-outline" },
  "owner.10_paid": { labelKey: "achOwner10Paid", icon: "trophy" },
  "owner.25_paid": { labelKey: "achOwner25Paid", icon: "medal" },
  "owner.first_review": { labelKey: "achOwnerFirstReview", icon: "star-outline" },
  "owner.10_reviews": { labelKey: "achOwner10Reviews", icon: "star" },
  "owner.first_favorite": { labelKey: "achOwnerFirstFavorite", icon: "heart" },

  "provider.first_paid": { labelKey: "achProviderFirstPaid", icon: "ribbon-outline" },
  "provider.5_paid": { labelKey: "achProvider5Paid", icon: "trophy-outline" },
  "provider.10_paid": { labelKey: "achProvider10Paid", icon: "trophy" },
  "provider.25_paid": { labelKey: "achProvider25Paid", icon: "medal-outline" },
  "provider.50_paid": { labelKey: "achProvider50Paid", icon: "medal" },
  "provider.100_paid": { labelKey: "achProvider100Paid", icon: "diamond" },
  "provider.10_reviews": { labelKey: "achProvider10Reviews", icon: "star" },
  "provider.star_sitter": { labelKey: "achStarSitter", icon: "sparkles" },
};

function formatIls(amount: number): string {
  return `₪${Math.round(amount).toLocaleString()}`;
}

function formatDateShort(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function MyStatsScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL, language } = useTranslation();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const isProviderUser = user?.role === "Provider" || user?.role === "Admin";
  const { width } = useWindowDimensions();

  const [range, setRange] = useState<StatRange>("all");
  const [tab, setTab] = useState<TabKey>("spending");

  const [ownerStats, setOwnerStats] = useState<OwnerStatsDto | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderBookingStatsDto | null>(null);
  const [sparkline, setSparkline] = useState<EarningsSparklineDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Treat the provider tab as available only when the user actually has a provider profile.
  // We rely on the API to 404 if not — silently switch tabs back to spending in that case.
  const showProviderTab = isProviderUser;

  const fetchAll = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const ownerPromise = usersApi.getStats(range).catch(() => null);
        const providerPromise = isProviderUser
          ? providerApi.getBookingStats(range).catch(() => null)
          : Promise.resolve(null);
        const sparkPromise = isProviderUser
          ? providerApi.getEarningsSparkline(12).catch(() => null)
          : Promise.resolve(null);

        const [own, prov, spark] = await Promise.all([
          ownerPromise,
          providerPromise,
          sparkPromise,
        ]);

        setOwnerStats(own);
        setProviderStats(prov);
        setSparkline(spark);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range, isProviderUser],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const csv =
        tab === "earnings" && providerStats
          ? await providerApi.exportBookingStatsCsv()
          : await usersApi.exportStatsCsv();

      const filename =
        tab === "earnings" ? "my-earnings.csv" : "my-spending.csv";
      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(csv, { encoding: "utf8" });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(t("statsExportNotSupported"));
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: "text/csv",
        dialogTitle: t("statsExportCta"),
        UTI: "public.comma-separated-values-text",
      });
    } catch {
      Alert.alert(t("errorTitle"), t("statsExportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const sparkData = useMemo(
    () => sparkline?.buckets.map((b) => Number(b.total)) ?? [],
    [sparkline],
  );

  const activeStats =
    tab === "earnings" ? providerStats : ownerStats;

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: colors.background, marginTop: -8 }}
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
          {t("myStats")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {showProviderTab && (
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
            label={t("statsTabSpending")}
            active={tab === "spending"}
            onPress={() => setTab("spending")}
            colors={colors}
          />
          <TabPill
            label={t("statsTabEarnings")}
            active={tab === "earnings"}
            onPress={() => setTab("earnings")}
            colors={colors}
          />
        </View>
      )}

      {/* Range chips */}
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          paddingHorizontal: 20,
          paddingVertical: 12,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {RANGE_OPTIONS.map((opt) => (
          <RangeChip
            key={opt.key}
            label={t(opt.labelKey as any)}
            active={range === opt.key}
            onPress={() => setRange(opt.key)}
            colors={colors}
          />
        ))}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : !activeStats ? (
        <EmptyState
          icon="bar-chart-outline"
          title={t("statsEmptyTitle")}
          subtitle={t("statsEmptySubtitle")}
          colors={colors}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAll(true);
              }}
              tintColor={colors.text}
            />
          }
        >
          {tab === "spending" && ownerStats ? (
            <OwnerStatsView
              stats={ownerStats}
              language={language}
              isRTL={isRTL}
              colors={colors}
              t={t}
              cardWidth={(width - 40 - 12) / 2}
            />
          ) : null}

          {tab === "earnings" && providerStats ? (
            <ProviderStatsView
              stats={providerStats}
              sparkData={sparkData}
              language={language}
              isRTL={isRTL}
              colors={colors}
              t={t}
              chartWidth={width - 40 - 32}
              cardWidth={(width - 40 - 12) / 2}
            />
          ) : null}

          {/* Achievements */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: colors.textSecondary,
              marginTop: 24,
              marginBottom: 10,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("statsAchievements")}
          </Text>
          <AchievementsList
            achievements={activeStats.achievements}
            colors={colors}
            t={t}
            language={language}
          />
        </ScrollView>
      )}

      {/* Export CSV footer */}
      {!loading && activeStats ? (
        <SafeAreaView
          edges={["bottom"]}
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
          }}
        >
          <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
            <Pressable
              onPress={handleExport}
              disabled={exporting || Platform.OS === "web"}
              style={{
                paddingVertical: 14,
                borderRadius: 999,
                alignItems: "center",
                backgroundColor: colors.text,
                opacity: exporting || Platform.OS === "web" ? 0.5 : 1,
                flexDirection: isRTL ? "row-reverse" : "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {exporting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Ionicons
                    name="download-outline"
                    size={18}
                    color={colors.textInverse}
                  />
                  <Text
                    style={{
                      color: colors.textInverse,
                      fontWeight: "800",
                      fontSize: 15,
                    }}
                  >
                    {t("statsExportCta")}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────────

function OwnerStatsView({
  stats,
  language,
  isRTL,
  colors,
  t,
  cardWidth,
}: {
  stats: OwnerStatsDto;
  language: string;
  isRTL: boolean;
  colors: any;
  t: (k: any) => string;
  cardWidth: number;
}) {
  return (
    <View>
      {/* Hero card */}
      <HeroCard
        label={t("statsTotalSpent")}
        value={formatIls(stats.totalSpent)}
        sub={`${stats.paidBookings} ${t("statsServices")}`}
        icon="wallet-outline"
        accent="#0f172a"
        colors={colors}
        isRTL={isRTL}
      />

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 12,
        }}
      >
        <StatCard
          width={cardWidth}
          icon="checkmark-circle-outline"
          iconColor="#059669"
          bg={colors.iconGreenBg}
          label={t("statsPaidBookings")}
          value={String(stats.paidBookings)}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="time-outline"
          iconColor="#d97706"
          bg={colors.iconOrangeBg}
          label={t("statsUpcomingSpend")}
          value={formatIls(stats.upcomingSpend)}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="heart-outline"
          iconColor="#dc2626"
          bg={colors.dangerLight}
          label={t("statsFavorites")}
          value={String(stats.favoriteProvidersCount)}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="star-outline"
          iconColor="#f59e0b"
          bg={colors.iconOrangeBg}
          label={t("statsReviewsWritten")}
          value={`${stats.reviewsWritten}${
            stats.reviewsWritten > 0
              ? ` · ${stats.averageRatingGiven.toFixed(1)}★`
              : ""
          }`}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="close-circle-outline"
          iconColor="#94a3b8"
          bg={colors.borderLight}
          label={t("statsCancellationRate")}
          value={`${stats.cancellationRate}%`}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="calendar-outline"
          iconColor="#6366f1"
          bg={colors.iconIndigoBg}
          label={t("statsMemberSince")}
          value={formatDateShort(stats.memberSince, language)}
          colors={colors}
        />
      </View>

      {stats.topService ? (
        <TopServiceCard service={stats.topService} colors={colors} t={t} isRTL={isRTL} />
      ) : null}
    </View>
  );
}

function ProviderStatsView({
  stats,
  sparkData,
  language,
  isRTL,
  colors,
  t,
  chartWidth,
  cardWidth,
}: {
  stats: ProviderBookingStatsDto;
  sparkData: number[];
  language: string;
  isRTL: boolean;
  colors: any;
  t: (k: any) => string;
  chartWidth: number;
  cardWidth: number;
}) {
  const deltaPositive = stats.monthEarnedDeltaPct >= 0;

  return (
    <View>
      <HeroCard
        label={t("statsTotalEarned")}
        value={formatIls(stats.totalEarned)}
        sub={`${stats.completedBookings} ${t("statsServices")}`}
        icon="cash-outline"
        accent="#0f172a"
        colors={colors}
        isRTL={isRTL}
      />

      {stats.isStarSitter ? (
        <View
          style={{
            marginTop: 12,
            backgroundColor: colors.iconOrangeBg,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Ionicons name="sparkles" size={18} color="#d97706" />
          <Text style={{ color: "#92400e", fontWeight: "700", fontSize: 13 }}>
            {t("statsStarSitterBadge")}
          </Text>
        </View>
      ) : null}

      {/* This month + sparkline */}
      <View
        style={{
          marginTop: 12,
          padding: 16,
          backgroundColor: colors.surface,
          borderRadius: 16,
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
            alignItems: "flex-end",
            marginBottom: 12,
          }}
        >
          <View>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              {t("statsThisMonth")}
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 22,
                fontWeight: "800",
                color: colors.text,
              }}
            >
              {formatIls(stats.monthEarned)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: deltaPositive
                ? colors.iconGreenBg
                : colors.dangerLight,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Ionicons
              name={deltaPositive ? "arrow-up" : "arrow-down"}
              size={12}
              color={deltaPositive ? "#059669" : "#dc2626"}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: deltaPositive ? "#059669" : "#dc2626",
              }}
            >
              {Math.abs(stats.monthEarnedDeltaPct).toFixed(1)}%
            </Text>
          </View>
        </View>

        {sparkData.length > 0 ? (
          <SparklineChart
            data={sparkData}
            width={chartWidth}
            height={70}
            caption={t("statsSparklineCaption")}
          />
        ) : null}
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 12,
        }}
      >
        <StatCard
          width={cardWidth}
          icon="star"
          iconColor="#f59e0b"
          bg={colors.iconOrangeBg}
          label={t("statsRating")}
          value={`${stats.averageRating.toFixed(1)} (${stats.reviewCount})`}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="thumbs-up-outline"
          iconColor="#059669"
          bg={colors.iconGreenBg}
          label={t("statsAcceptanceRate")}
          value={`${stats.acceptanceRate}%`}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="time-outline"
          iconColor="#6366f1"
          bg={colors.iconIndigoBg}
          label={t("statsResponseTime")}
          value={
            stats.avgResponseMinutes == null
              ? "—"
              : stats.avgResponseMinutes < 60
                ? `${Math.round(stats.avgResponseMinutes)}m`
                : `${(stats.avgResponseMinutes / 60).toFixed(1)}h`
          }
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="repeat-outline"
          iconColor="#8b5cf6"
          bg={colors.iconPurpleBg}
          label={t("statsRepeatClients")}
          value={String(stats.repeatClientsCount)}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="paw-outline"
          iconColor="#0ea5e9"
          bg={colors.iconBlueBg}
          label={t("statsUniquePets")}
          value={String(stats.uniquePetsServed)}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="hourglass-outline"
          iconColor="#0f172a"
          bg={colors.borderLight}
          label={t("statsHoursWorked")}
          value={`${stats.hoursWorked.toFixed(1)}h`}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="eye-outline"
          iconColor="#6366f1"
          bg={colors.iconIndigoBg}
          label={t("statsProfileViews")}
          value={String(stats.profileViewCount)}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="search-outline"
          iconColor="#0ea5e9"
          bg={colors.iconBlueBg}
          label={t("statsSearchAppearances")}
          value={String(stats.searchAppearanceCount)}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="close-circle-outline"
          iconColor="#dc2626"
          bg={colors.dangerLight}
          label={t("statsCancelRateMine")}
          value={`${stats.cancellationRateByMe}%`}
          colors={colors}
        />
        <StatCard
          width={cardWidth}
          icon="hourglass-outline"
          iconColor="#d97706"
          bg={colors.iconOrangeBg}
          label={t("statsPendingPayouts")}
          value={formatIls(stats.pendingPayouts)}
          colors={colors}
        />
      </View>

      {stats.topService ? (
        <TopServiceCard service={stats.topService} colors={colors} t={t} isRTL={isRTL} />
      ) : null}
    </View>
  );
}

// ── Reusable bits ────────────────────────────────────────────────────────────

function HeroCard({
  label,
  value,
  sub,
  icon,
  accent,
  colors,
  isRTL,
}: {
  label: string;
  value: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  colors: any;
  isRTL: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: accent,
        borderRadius: 18,
        padding: 20,
        flexDirection: isRTL ? "row-reverse" : "row",
        justifyContent: "space-between",
        alignItems: "center",
        shadowColor: accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      <View>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: "#cbd5e1",
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            marginTop: 6,
            fontSize: 30,
            fontWeight: "800",
            color: "#ffffff",
          }}
        >
          {value}
        </Text>
        <Text style={{ marginTop: 2, color: "#cbd5e1", fontSize: 13 }}>
          {sub}
        </Text>
      </View>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: "rgba(255,255,255,0.12)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={28} color={colors.textInverse} />
      </View>
    </View>
  );
}

function StatCard({
  width,
  icon,
  iconColor,
  bg,
  label,
  value,
  colors,
}: {
  width: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bg: string;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View
      style={{
        width,
        backgroundColor: colors.surface,
        borderRadius: 14,
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
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
        {value}
      </Text>
    </View>
  );
}

function TopServiceCard({
  service,
  colors,
  t,
  isRTL,
}: {
  service: { service: string; count: number; totalAmount: number };
  colors: any;
  t: (k: any) => string;
  isRTL: boolean;
}) {
  return (
    <View
      style={{
        marginTop: 16,
        padding: 16,
        backgroundColor: colors.surface,
        borderRadius: 16,
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        gap: 14,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: colors.iconIndigoBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="trending-up" size={22} color="#6366f1" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>
          {t("statsTopService")}
        </Text>
        <Text
          style={{
            marginTop: 2,
            fontSize: 16,
            fontWeight: "700",
            color: colors.text,
          }}
        >
          {service.service}
        </Text>
        <Text
          style={{ marginTop: 2, fontSize: 12, color: colors.textSecondary }}
        >
          {service.count} ×  ·  {formatIls(service.totalAmount)}
        </Text>
      </View>
    </View>
  );
}

function AchievementsList({
  achievements,
  colors,
  t,
  language,
}: {
  achievements: AchievementDto[];
  colors: any;
  t: (k: any) => string;
  language: string;
}) {
  if (achievements.length === 0) {
    return (
      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderRadius: 14,
          alignItems: "center",
        }}
      >
        <Ionicons name="trophy-outline" size={36} color={colors.textMuted} />
        <Text style={{ marginTop: 8, color: colors.textMuted, fontSize: 13 }}>
          {t("statsNoAchievements")}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {achievements.map((a) => {
        const meta = ACHIEVEMENT_META[a.code];
        const label = meta ? t(meta.labelKey as any) : a.code;
        const icon = meta?.icon ?? "trophy-outline";
        return (
          <View
            key={a.code}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 12,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: colors.iconOrangeBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={icon} size={18} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: colors.text }}
              >
                {label}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                {formatDateShort(a.unlockedAt, language)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RangeChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? colors.text : colors.surface,
        borderWidth: active ? 0 : 1,
        borderColor: colors.borderLight,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: active ? colors.textInverse : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TabPill({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: active ? colors.text : colors.surface,
        borderWidth: active ? 0 : 1,
        borderColor: colors.borderLight,
        alignItems: "center",
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
    </Pressable>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  colors: any;
}) {
  return (
    <View className="flex-1 items-center justify-center px-10">
      <Ionicons name={icon} size={56} color={colors.textMuted} />
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: colors.text,
          marginTop: 16,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}
