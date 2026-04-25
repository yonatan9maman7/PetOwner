import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  StyleSheet,
  Keyboard,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import Animated, {
  FadeInDown,
  FadeOut,
  FadeIn,
} from "react-native-reanimated";
import { useTranslation, type TranslationKey } from "../../i18n";
import { useTheme, type ThemeColors } from "../../theme/ThemeContext";
import { mapApi } from "../../api/client";
import { ProviderType, type MapPinDto, type MapSearchFilters } from "../../types/api";

/* ─── Category chip definitions ─── */

interface CategoryChip {
  id: string;
  label: string;
  labelKey?: TranslationKey;
  icon: string;
}

const STATIC_CHIPS: CategoryChip[] = [
  { id: "all", labelKey: "chipAll", icon: "apps", label: "" },
];

type DiscoverNavParams = {
  providerTypeFilter?: ProviderType;
  /** When set (e.g. from Explore FAB), pins match the same viewport as the map. */
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
};

/** Service-type chips to hide in "businesses only" mode (solo / home services, not storefront businesses). */
const INDIVIDUAL_SERVICE_CHIP_IDS = new Set([
  "dog walker",
  "drop-in visit",
  "house sitting",
  "doggy day care",
]);

/** Normalize pin type (API may send enum string with different casing or legacy numeric JSON). */
function mapPinProviderType(p: MapPinDto): ProviderType {
  const anyPin = p as MapPinDto & { ProviderType?: string | number };
  const raw = String(anyPin.providerType ?? anyPin.ProviderType ?? "").trim().toLowerCase();
  if (raw === "business" || raw === "1") return ProviderType.Business;
  if (raw === "individual" || raw === "0") return ProviderType.Individual;
  return ProviderType.Individual;
}

/* Provider type → gradient colors */
const PROVIDER_GRADIENTS: [string, string][] = [
  ["#FDF2F8", "#FBCFE8"],
  ["#ECFDF5", "#A7F3D0"],
  ["#EFF6FF", "#BFDBFE"],
  ["#FFF7ED", "#FED7AA"],
  ["#F5F3FF", "#DDD6FE"],
  ["#F0FDF4", "#BBF7D0"],
];

const PROVIDER_ICON_COLORS = [
  "#DB2777", "#059669", "#2563EB", "#EA580C", "#7C3AED", "#16A34A",
];

function getProviderHeroStyle(index: number) {
  const grad = PROVIDER_GRADIENTS[index % PROVIDER_GRADIENTS.length];
  const ic = PROVIDER_ICON_COLORS[index % PROVIDER_ICON_COLORS.length];
  return { gradient: grad, iconColor: ic };
}

/* ─── Hero sub-component ─── */

function ProviderHeroArea({
  pin,
  index,
}: {
  pin: MapPinDto;
  index: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const { gradient, iconColor } = getProviderHeroStyle(index);

  if (pin.profileImageUrl && !imgFailed) {
    return (
      <Image
        source={{ uri: pin.profileImageUrl }}
        style={c.heroImg}
        resizeMode="cover"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <View style={[c.hero, { backgroundColor: gradient[0] }]}>
      <View style={[c.heroCircle1, { backgroundColor: gradient[1], opacity: 0.6 }]} />
      <View style={[c.heroCircle2, { backgroundColor: `${iconColor}33`, opacity: 0.4 }]} />
      <View style={c.heroIconWrap}>
        <View style={[c.heroIconBg, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name="paw" size={48} color={iconColor} />
        </View>
      </View>
    </View>
  );
}

/* ─── Rating badge ─── */

function FloatingRatingBadge({ rating }: { rating?: number }) {
  if (rating == null) return null;
  return (
    <View style={c.floatingRating}>
      <Ionicons name="star" size={13} color="#F59E0B" />
      <Text style={c.floatingRatingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

/* ══════════════════ MAIN SCREEN ══════════════════ */

export function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Discover: DiscoverNavParams | undefined }, "Discover">>();
  const providerTypeFilter = route.params?.providerTypeFilter;
  const viewportLat = route.params?.latitude;
  const viewportLng = route.params?.longitude;
  const viewportRadiusKm = route.params?.radiusKm;
  const { colors } = useTheme();
  const { t, isRTL, rtlText, rtlInput } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [providers, setProviders] = useState<MapPinDto[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildFilters = useCallback(
    (search?: string): MapSearchFilters | undefined => {
      const f: MapSearchFilters = {};
      const q = search?.trim();
      if (q) f.searchTerm = q;
      if (providerTypeFilter != null) f.providerType = providerTypeFilter;
      if (
        viewportLat != null &&
        viewportLng != null &&
        viewportRadiusKm != null &&
        Number.isFinite(viewportLat) &&
        Number.isFinite(viewportLng) &&
        Number.isFinite(viewportRadiusKm)
      ) {
        f.latitude = viewportLat;
        f.longitude = viewportLng;
        f.radiusKm = viewportRadiusKm;
      }
      if (Object.keys(f).length === 0) return undefined;
      return f;
    },
    [providerTypeFilter, viewportLat, viewportLng, viewportRadiusKm],
  );

  const loadProviders = useCallback(
    (search?: string) => {
      setLoading(true);
      mapApi
        .fetchPins(buildFilters(search))
        .then((pins) => {
          if (providerTypeFilter === ProviderType.Business) {
            return pins.filter((p) => mapPinProviderType(p) === ProviderType.Business);
          }
          if (providerTypeFilter === ProviderType.Individual) {
            return pins.filter((p) => mapPinProviderType(p) === ProviderType.Individual);
          }
          return pins;
        })
        .then(setProviders)
        .catch(() => setProviders([]))
        .finally(() => setLoading(false));
    },
    [buildFilters, providerTypeFilter],
  );

  useEffect(() => {
    mapApi.getServiceTypes().then(setServiceTypes).catch(() => {});
  }, []);

  useEffect(() => {
    loadProviders("");
  }, [loadProviders]);

  /* ─── Category chips (All + dynamic from API) ─── */
  const chips: CategoryChip[] = useMemo(() => {
    const typesForChips =
      providerTypeFilter === ProviderType.Business
        ? serviceTypes.filter((svc) => !INDIVIDUAL_SERVICE_CHIP_IDS.has(svc.toLowerCase()))
        : serviceTypes;
    const dynamic: CategoryChip[] = typesForChips.map((svc) => ({
      id: svc.toLowerCase(),
      label: svc,
      icon: serviceIcon(svc),
    }));
    return [
      { id: "all", labelKey: "chipAll" as TranslationKey, icon: "apps", label: "" },
      ...dynamic,
    ];
  }, [serviceTypes, providerTypeFilter]);

  /* If "businesses only" hides a chip, drop a stale selection (e.g. dog walker). */
  useEffect(() => {
    const ids = new Set(chips.map((c) => c.id));
    if (!ids.has(selectedCategory)) setSelectedCategory("all");
  }, [chips, selectedCategory]);

  const onCategoryPress = useCallback((id: string) => {
    setSelectedCategory(id);
  }, []);

  const onCancelSearch = useCallback(() => {
    setSearchQuery("");
    setIsSearchFocused(false);
    Keyboard.dismiss();
    loadProviders("");
  }, [loadProviders]);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => loadProviders(text), 500);
    },
    [loadProviders],
  );

  /* ─── Filter by selected category (client-side) ─── */
  const filteredProviders = useMemo(() => {
    if (selectedCategory === "all") return providers;
    return providers.filter((p) =>
      p.services.toLowerCase().includes(selectedCategory),
    );
  }, [providers, selectedCategory]);

  const onViewProvider = useCallback(
    (providerId: string) => {
      navigation.navigate("ProviderProfile", { providerId });
    },
    [navigation],
  );

  const onGlobalMap = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderCard = useCallback(
    ({ item, index }: { item: MapPinDto; index: number }) => (
      <Animated.View
        entering={FadeInDown.delay(index * 80).duration(500).springify()}
        exiting={FadeOut.duration(200)}
        key={item.providerId}
      >
        <Pressable
          style={({ pressed }) => [
            styles.card,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => onViewProvider(item.providerId)}
        >
          {/* Hero image area */}
          <View style={c.heroContainer}>
            <ProviderHeroArea pin={item} index={index} />
            <FloatingRatingBadge rating={item.averageRating} />
            {item.isEmergencyService && (
              <View style={c.emergencyBadge}>
                <Ionicons name="medkit" size={11} color="#fff" />
                <Text style={c.emergencyBadgeText}>Emergency</Text>
              </View>
            )}
          </View>

          {/* Content area */}
          <View style={c.cardContent}>
            {/* Category + distance row */}
            <View style={[c.topMetaRow, isRTL && c.rowReverse]}>
              <Text style={[styles.categoryLabel, rtlText]} numberOfLines={1}>
                {item.services.split(",")[0]?.toUpperCase() ?? ""}
              </Text>
              {item.minRate > 0 && (
                <View style={[c.distancePill, isRTL && c.rowReverse]}>
                  <Text style={styles.distanceText}>
                    ₪{item.minRate}{t("perHour")}
                  </Text>
                </View>
              )}
            </View>

            {/* Business name */}
            <Text style={[styles.businessName, rtlText]} numberOfLines={2}>
              {item.name}
            </Text>

            {/* Footer */}
            <View style={[c.cardFooter, { borderTopColor: colors.borderLight }]}>
              <View style={[c.footerInner, isRTL && c.rowReverse]}>
                <Pressable
                  style={[c.mapLink, isRTL && c.rowReverse]}
                  onPress={() => onViewProvider(item.providerId)}
                >
                  <Text style={[c.mapLinkText, { color: colors.primary }]}>
                    {t("viewProfile")}
                  </Text>
                  <Ionicons
                    name={isRTL ? "arrow-back" : "arrow-forward"}
                    size={15}
                    color={colors.primary}
                  />
                </Pressable>

                {item.reviewCount > 0 && (
                  <View style={[c.reviewPill, isRTL && c.rowReverse]}>
                    <Ionicons name="chatbubble" size={12} color={colors.textMuted} />
                    <Text style={[c.reviewPillText, { color: colors.textMuted }]}>
                      {item.reviewCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    ),
    [colors, isRTL, onViewProvider, rtlText, styles, t],
  );

  const ListEmpty = useMemo(
    () =>
      loading ? (
        <View style={c.emptyWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptySubtitle, { marginTop: 12 }]}>
            {t("loadingProviders")}
          </Text>
        </View>
      ) : (
        <View style={c.emptyWrap}>
          <View style={[c.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="search-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle]}>{t("noBusinessesFound")}</Text>
          <Text style={[styles.emptySubtitle]}>
            {t("noBusinessesFoundSubtitle")}
          </Text>
        </View>
      ),
    [colors, loading, styles, t],
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={[c.safe, { backgroundColor: colors.background }]}
    >
      {/* ── Header ── */}
      <Animated.View entering={FadeIn.duration(300)} style={c.header}>
        <View style={[c.headerRow, isRTL && c.rowReverse]}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={[c.backBtn, { backgroundColor: colors.surface }]}
          >
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={22}
              color={colors.text}
            />
          </Pressable>
          <Text style={[styles.title, { flex: 1 }, rtlText]}>
            {t("discoverTitle")}
          </Text>
        </View>
      </Animated.View>

      {/* ── Search bar ── */}
      <View style={c.searchSection}>
        <View
          style={[
            styles.searchBar,
            isSearchFocused && { borderColor: colors.primary, borderWidth: 2 },
            isRTL && { flexDirection: "row-reverse" },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={isSearchFocused ? colors.primary : colors.textMuted}
            style={{ marginHorizontal: 12 }}
          />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, rtlInput, { flex: 1 }]}
            placeholder={t("discoverSearchPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            onSubmitEditing={() => loadProviders(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearchChange("")} style={c.clearBtn}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        {isSearchFocused && (
          <Pressable onPress={onCancelSearch} style={c.cancelBtn}>
            <Text style={[c.cancelText, { color: colors.primary }]}>
              {t("discoverCancelSearch")}
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── Category chips ── */}
      <View style={c.chipWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            c.chipList,
            isRTL && { flexDirection: "row-reverse" },
          ]}
        >
          {chips.map((item) => {
            const isActive = item.id === selectedCategory;
            const label = item.labelKey ? t(item.labelKey) : item.label;
            return (
              <Pressable
                key={item.id}
                onPress={() => onCategoryPress(item.id)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={isActive ? "#fff" : colors.textSecondary}
                />
                <Text
                  style={[styles.chipLabel, isActive && styles.chipLabelActive]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Provider cards list ── */}
      <FlatList
        data={filteredProviders}
        keyExtractor={(item) => item.providerId}
        renderItem={renderCard}
        contentContainerStyle={[
          c.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={ListEmpty}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        onRefresh={() => loadProviders(searchQuery)}
        refreshing={loading}
      />

      {/* ── Global Map FAB ── */}
      <Pressable
        onPress={onGlobalMap}
        style={({ pressed }) => [
          styles.globalFab,
          {
            bottom: insets.bottom + 24,
            [isRTL ? "left" : "right"]: 20,
          },
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
      >
        <Ionicons name="map" size={20} color="#fff" />
        <Text style={c.fabText}>{t("globalMap")}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

/* ─── helpers ─── */

function serviceIcon(svc: string): string {
  const s = svc.toLowerCase();
  if (s.includes("groom")) return "cut";
  if (s.includes("vet") || s.includes("clinic")) return "medkit";
  if (s.includes("store") || s.includes("shop")) return "storefront";
  if (s.includes("train")) return "school";
  if (s.includes("board")) return "home";
  if (s.includes("walk")) return "footsteps";
  if (s.includes("sit")) return "eye";
  return "paw";
}

/* ═══════════ THEME-AWARE STYLES ═══════════ */

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 28,
      height: 50,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    searchInput: {
      fontSize: 14,
      color: colors.text,
      paddingVertical: 0,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 28,
      backgroundColor: colors.surfaceTertiary,
      marginRight: 10,
    },
    chipActive: {
      backgroundColor: colors.text,
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    chipLabelActive: {
      color: "#fff",
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      overflow: "hidden",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 24,
      elevation: 8,
    },
    categoryLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textSecondary,
      letterSpacing: 1.5,
      flex: 1,
    },
    distanceText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    businessName: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.3,
      marginTop: 6,
      lineHeight: 28,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      marginTop: 16,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: "center",
      paddingHorizontal: 32,
    },
    globalFab: {
      position: "absolute",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.text,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 28,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 14,
    },
  });
}

/* ═══════════ STATIC STYLES ═══════════ */

const c = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 10,
  },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { fontSize: 14, fontWeight: "600" },
  chipWrapper: { flexShrink: 0 },
  chipList: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    paddingBottom: 14,
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  rowReverse: { flexDirection: "row-reverse" },

  /* ─── Hero ─── */
  heroContainer: { position: "relative" },
  hero: {
    height: 200,
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  heroImg: {
    height: 200,
    width: "100%",
  },
  heroCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -40,
    right: -30,
  },
  heroCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -20,
    left: -20,
  },
  heroIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ─── Floating badges ─── */
  floatingRating: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingRatingText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  emergencyBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dc2626",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emergencyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },

  /* ─── Card content ─── */
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 0,
  },
  topMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  /* ─── Card footer ─── */
  cardFooter: {
    marginTop: 20,
    borderTopWidth: 1,
    paddingVertical: 18,
  },
  footerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mapLinkText: {
    fontSize: 14,
    fontWeight: "700",
  },
  reviewPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewPillText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* ─── Empty state ─── */
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ─── FAB ─── */
  fabText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
