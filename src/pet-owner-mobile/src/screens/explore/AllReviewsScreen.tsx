import { useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  RefreshControl,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { useReviewsStore } from "../../store/reviewsStore";
import type { ReviewDto } from "../../types/api";
import { ListSkeleton, ListEmptyState, InlineError } from "../../components/shared";
import { ReviewCard } from "./components/ReviewCard";

const STAR_COLOR = "#f59e0b";

function useRatingDistribution(reviews: ReviewDto[]) {
  return useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const r of reviews) {
      if (r.rating >= 1 && r.rating <= 5) counts[5 - r.rating] += 1;
    }
    const max = Math.max(1, ...counts);
    return { counts, max };
  }, [reviews]);
}

export function AllReviewsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const providerId = route.params?.providerId as string;
  const providerName = route.params?.providerName as string | undefined;

  const { colors } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();

  const reviews = useReviewsStore((s) => s.byProviderId[providerId]?.reviews ?? []);
  const loading = useReviewsStore((s) => s.byProviderId[providerId]?.loading ?? true);
  const error = useReviewsStore((s) => s.byProviderId[providerId]?.error ?? null);
  const fetchProviderReviews = useReviewsStore((s) => s.fetchProviderReviews);
  const clearProvider = useReviewsStore((s) => s.clearProvider);

  useEffect(() => {
    if (!providerId) return;
    void fetchProviderReviews(providerId);
    return () => clearProvider(providerId);
  }, [providerId, fetchProviderReviews, clearProvider]);

  const onRefresh = useCallback(() => {
    if (providerId) void fetchProviderReviews(providerId);
  }, [providerId, fetchProviderReviews]);

  const average = useMemo(() => {
    if (!reviews.length) return null;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const { counts, max } = useRatingDistribution(reviews);

  const ListHeader = useCallback(
    () => (
      <View className="px-5 pt-2 pb-4">
        {error ? (
          <InlineError message={error} onRetry={onRefresh} />
        ) : null}

        {loading && reviews.length === 0 ? (
          <View className="pt-2">
            <ListSkeleton rows={6} variant="row" />
          </View>
        ) : null}

        {reviews.length > 0 ? (
          <View
            className="rounded-2xl p-4 mb-4"
            style={{
              backgroundColor: colors.surface,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View
              className="flex-row items-center gap-3"
              style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
            >
              {average != null ? (
                <>
                  <View className="items-center justify-center rounded-2xl px-4 py-3 bg-[#fef9c3]">
                    <Ionicons name="star" size={28} color={STAR_COLOR} />
                    <Text className="text-2xl font-extrabold mt-1" style={{ color: colors.text }}>
                      {average.toFixed(1)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text style={[rtlText, { color: colors.text }]} className="text-base font-bold">
                      {t("reviews")}
                    </Text>
                    <Text style={[rtlText, { color: colors.textSecondary }]} className="text-sm mt-1">
                      {t("reviewsCount").replace("{count}", String(reviews.length))}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>

            <View className="mt-4 pt-4 border-t" style={{ borderColor: colors.borderLight }}>
              <Text style={[rtlText, { color: colors.text }]} className="text-sm font-bold mb-3">
                {t("ratingDistribution")}
              </Text>
              {[5, 4, 3, 2, 1].map((star) => {
                const idx = 5 - star;
                const c = counts[idx];
                const pct = (c / max) * 100;
                return (
                  <View
                    key={star}
                    className="flex-row items-center gap-2 mb-2"
                    style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
                  >
                    <Text className="text-xs font-semibold w-6" style={{ color: colors.textSecondary }}>
                      {star}
                    </Text>
                    <Ionicons name="star" size={12} color={STAR_COLOR} />
                    <View className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.surfaceSecondary }}>
                      <View
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          borderRadius: 4,
                          backgroundColor: colors.primary,
                        }}
                      />
                    </View>
                    <Text
                      className="text-xs w-6"
                      style={{
                        color: colors.textMuted,
                        textAlign: isRTL ? "left" : "right",
                      }}
                    >
                      {c}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    ),
    [error, loading, reviews.length, average, counts, max, colors, isRTL, rtlText, t, onRefresh],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ReviewDto; index: number }) => (
      <View className="px-5" style={{ backgroundColor: colors.background }}>
        <ReviewCard review={item} borderTop={index > 0} avatarSize={40} />
      </View>
    ),
    [colors.background],
  );

  if (!providerId) {
    return (
      <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: colors.background }}>
        <Text className="p-5" style={{ color: colors.textMuted }}>
          {t("genericError")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" edges={["top"]} style={{ marginTop: -8, backgroundColor: colors.background }}>
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
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <Text
          style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center" }}
          numberOfLines={1}
        >
          {providerName ?? t("allReviewsTitle")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <FlashList<ReviewDto>
        className="flex-1"
        data={loading && reviews.length === 0 ? [] : reviews}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !loading && !error && reviews.length === 0 ? (
            <ListEmptyState
              icon="chatbubble-outline"
              title={t("reviewEmptyTitle")}
              message={t("reviewEmptySubtitle")}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={loading && reviews.length > 0} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      />
    </SafeAreaView>
  );
}
