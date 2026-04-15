import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "../../i18n";
import { useTheme, type ThemeColors } from "../../theme/ThemeContext";
import { useFavoritesStore } from "../../store/favoritesStore";
import { ListSkeleton, ListEmptyState, InlineError } from "../../components/shared";
import type { FavoriteProviderDto } from "../../types/api";

function ProviderAvatar({ uri, size = 56 }: { uri?: string; size?: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const half = size / 2;

  if (!uri || failed) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: half,
          backgroundColor: colors.primaryLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="person" size={size * 0.46} color={colors.text} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: size,
        borderRadius: half,
        backgroundColor: colors.primaryLight,
      }}
      onError={() => setFailed(true)}
    />
  );
}

export function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();
  const styles = createStyles(colors);

  const providers = useFavoritesStore((s) => s.providers);
  const loading = useFavoritesStore((s) => s.loading);
  const error = useFavoritesStore((s) => s.error);
  const fetchProviders = useFavoritesStore((s) => s.fetchProviders);
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const toggleFavorite = useFavoritesStore((s) => s.toggle);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProviders();
    setRefreshing(false);
  }, [fetchProviders]);

  const renderItem = useCallback(
    ({ item }: { item: FavoriteProviderDto }) => {
      const isFav = favoriteIds.has(item.userId);

      return (
        <Pressable
          onPress={() =>
            navigation.navigate("ProviderProfile", { providerId: item.userId })
          }
          style={({ pressed }) => [
            styles.card,
            pressed && { opacity: 0.85 },
          ]}
        >
          <ProviderAvatar uri={item.profileImageUrl} />

          <View style={s.cardBody}>
            <View style={[s.nameRow, isRTL && s.rowReverse]}>
              <Text
                style={[styles.name, rtlText, { flex: 1 }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Pressable
                onPress={() => toggleFavorite(item.userId)}
                hitSlop={10}
              >
                <Ionicons
                  name={isFav ? "heart" : "heart-outline"}
                  size={22}
                  color={isFav ? "#e11d48" : colors.textMuted}
                />
              </Pressable>
            </View>

            <Text
              style={[styles.services, rtlText]}
              numberOfLines={1}
            >
              {item.services}
            </Text>

            <View style={[s.metaRow, isRTL && s.rowReverse]}>
              {item.averageRating > 0 && (
                <View style={[s.ratingPill, isRTL && s.rowReverse]}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.rating}>
                    {item.averageRating.toFixed(1)}
                  </Text>
                  <Text style={styles.reviewCount}>
                    ({item.reviewCount})
                  </Text>
                </View>
              )}

              <View style={[s.pricePill, isRTL && s.rowReverse]}>
                <Text style={styles.price}>₪{item.minRate}</Text>
              </View>

              <View
                style={[
                  s.availBadge,
                  {
                    backgroundColor: item.isAvailableNow
                      ? colors.successLight ?? "#dcfce7"
                      : colors.surfaceSecondary,
                  },
                ]}
              >
                <View
                  style={[
                    s.availDot,
                    {
                      backgroundColor: item.isAvailableNow
                        ? colors.success
                        : colors.textMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.availText,
                    {
                      color: item.isAvailableNow
                        ? colors.success
                        : colors.textMuted,
                    },
                  ]}
                >
                  {item.isAvailableNow ? t("available") : t("unavailable")}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      );
    },
    [colors, favoriteIds, isRTL, navigation, rtlText, styles, t, toggleFavorite],
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={[s.safe, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[s.header, isRTL && s.rowReverse]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={[s.backBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={22}
            color={colors.text}
          />
        </Pressable>
        <Text style={[styles.title, rtlText]}>{t("favorites")}</Text>
      </View>

      {/* Content */}
      {loading && providers.length === 0 ? (
        <ListSkeleton variant="row" rows={6} />
      ) : error && providers.length === 0 ? (
        <View style={s.errorWrap}>
          <InlineError message={t("favoritesError")} onRetry={fetchProviders} />
        </View>
      ) : (
        <FlashList
          data={providers}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <ListEmptyState
              icon="heart-outline"
              title={t("noFavorites")}
              message={t("noFavoritesSubtitle")}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text}
              colors={[colors.text]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    services: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.textSecondary,
      marginTop: 2,
    },
    rating: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      marginLeft: 3,
    },
    reviewCount: {
      fontSize: 12,
      color: colors.textMuted,
      marginLeft: 2,
    },
    price: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    availText: {
      fontSize: 11,
      fontWeight: "600",
    },
  });
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBody: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  pricePill: {
    flexDirection: "row",
    alignItems: "center",
  },
  availBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  errorWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});
