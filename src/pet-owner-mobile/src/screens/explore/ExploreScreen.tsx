import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import { MapViewWrapper, MarkerWrapper } from "../../components/MapViewWrapper";
import {
  BrandedAppHeader,
  BRAND_HEADER_HORIZONTAL_PAD,
} from "../../components/BrandedAppHeader";
import { useTranslation } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { usePetsStore } from "../../store/petsStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { useTheme } from "../../theme/ThemeContext";
import { DatePickerField } from "../../components/DatePickerField";
import { TimePickerField } from "../../components/TimePickerField";
import { mapApi } from "../../api/client";
import type { MapPinDto, MapSearchFilters } from "../../types/api";

const TEL_AVIV = {
  latitude: 32.0853,
  longitude: 34.7818,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

const DISTANCE_OPTIONS = [
  { value: null, labelKey: "anyDistance" as const },
  { value: 1, label: "1 km" },
  { value: 3, label: "3 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
];

const SERVICE_ICONS: Record<string, { icon: string; active: string }> = {
  boarding: { icon: "home-outline", active: "home" },
  "dog walker": { icon: "footsteps-outline", active: "footsteps" },
  "drop-in visit": { icon: "location-outline", active: "location" },
  "pet insurance": { icon: "shield-outline", active: "shield" },
  "pet sitter": { icon: "eye-outline", active: "eye" },
  "pet trainer": { icon: "school-outline", active: "school" },
  "pet store": { icon: "storefront-outline", active: "storefront" },
};

const SERVICE_I18N_MAP: Record<string, string> = {
  boarding: "serviceBoarding",
  "dog walker": "serviceDogWalking",
  "dog walking": "serviceDogWalking",
  "drop-in visit": "serviceDropInVisit",
  "pet insurance": "serviceInsurance",
  "pet sitter": "servicePetSitting",
  "pet sitting": "servicePetSitting",
  "pet store": "servicePetStore",
  "pet trainer": "serviceTraining",
  training: "serviceTraining",
  insurance: "serviceInsurance",
};

function getServiceIcon(name: string, isActive: boolean) {
  const entry = SERVICE_ICONS[name.toLowerCase()];
  if (!entry) return isActive ? "paw" : "paw-outline";
  return isActive ? entry.active : entry.icon;
}

/* ──────── Paw Marker ──────── */

function PawMarker({ active }: { active?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={pawMarkerStyles.hitArea}>
      <View
        style={[
          pawMarkerStyles.bubble,
          active
            ? {
                backgroundColor: colors.text,
                borderColor: colors.surface,
                shadowColor: colors.text,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }
            : {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
                elevation: 4,
              },
        ]}
      >
        <Ionicons name="paw" size={20} color={active ? colors.textInverse : colors.text} />
      </View>
      <View
        style={[
          pawMarkerStyles.arrow,
          { borderTopColor: active ? colors.text : colors.surface },
        ]}
      />
    </View>
  );
}

const pawMarkerStyles = StyleSheet.create({
  hitArea: {
    padding: 12,
    alignItems: "center",
  },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  arrow: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});

/* ──────── Avatar with SVG fallback ──────── */

function AvatarImage({ uri }: { uri?: string | null }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View
        className="w-20 h-20 rounded-lg items-center justify-center overflow-hidden"
        style={{ backgroundColor: colors.primaryLight }}
      >
        <Ionicons name="person" size={36} color={colors.text} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      className="w-20 h-20 rounded-lg"
      style={{ backgroundColor: colors.primaryLight }}
      onError={() => setFailed(true)}
    />
  );
}

/* ══════════════════════ MAIN SCREEN ══════════════════════ */

export function ExploreScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { t, isRTL, rtlInput } = useTranslation();
  const insets = useSafeAreaInsets();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasPets = usePetsStore((s) => s.pets.length > 0);
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const toggleFavorite = useFavoritesStore((s) => s.toggle);

  const [pins, setPins] = useState<MapPinDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<MapPinDto | null>(null);
  const mapRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markerJustTappedRef = useRef(false);

  /* Service types from API */
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);

  /* Filter state */
  const [searchText, setSearchText] = useState("");
  const [activeServices, setActiveServices] = useState<Set<string>>(new Set());
  const [filterMinRating, setFilterMinRating] = useState<number | null>(null);
  const [filterMaxRate, setFilterMaxRate] = useState("");
  const [filterRadiusKm, setFilterRadiusKm] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterTime, setFilterTime] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  /* User location */
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  /* Current map region for viewport-based queries */
  const mapRegionRef = useRef(TEL_AVIV);

  /* ─── Active filter count (badge) ─── */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeServices.size > 0) count += activeServices.size;
    if (filterMinRating) count++;
    if (filterMaxRate) count++;
    if (filterRadiusKm) count++;
    if (filterDate && filterTime) count++;
    return count;
  }, [activeServices, filterMinRating, filterMaxRate, filterRadiusKm, filterDate, filterTime]);

  /* ─── Load service types ─── */
  useEffect(() => {
    mapApi.getServiceTypes().then(setServiceTypes).catch(() => {});
  }, []);

  /* ─── Request location ─── */
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLat(loc.coords.latitude);
          setUserLng(loc.coords.longitude);
        }
      } catch {}
    })();
  }, []);

  /* ─── Build filters ─── */
  const buildFilters = useCallback((): MapSearchFilters | undefined => {
    const f: MapSearchFilters = {};

    if (searchText.trim()) f.searchTerm = searchText.trim();
    if (activeServices.size > 0) f.serviceType = [...activeServices].join(",");
    if (filterMinRating) f.minRating = filterMinRating;
    if (filterMaxRate && Number(filterMaxRate) > 0)
      f.maxRate = Number(filterMaxRate);

    if (filterDate && filterTime) {
      f.requestedTime = `${filterDate}T${filterTime}:00`;
    }

    if (filterRadiusKm && userLat != null && userLng != null) {
      f.radiusKm = filterRadiusKm;
      f.latitude = userLat;
      f.longitude = userLng;
    } else {
      const region = mapRegionRef.current;
      const latDelta = region.latitudeDelta / 2;
      const lngDelta = region.longitudeDelta / 2;
      const diagKm =
        Math.sqrt(
          Math.pow(latDelta * 111, 2) +
            Math.pow(lngDelta * 111 * Math.cos((region.latitude * Math.PI) / 180), 2),
        ) * 1.2;
      f.latitude = region.latitude;
      f.longitude = region.longitude;
      f.radiusKm = Math.max(1.2, Math.min(diagKm, 80));
    }

    return Object.keys(f).length > 0 ? f : undefined;
  }, [
    searchText,
    activeServices,
    filterMinRating,
    filterMaxRate,
    filterRadiusKm,
    filterDate,
    filterTime,
    userLat,
    userLng,
  ]);

  /* ─── Fetch pins ─── */
  const fetchPins = useCallback(
    async (filters?: MapSearchFilters) => {
      setLoading(true);
      try {
        const data = await mapApi.fetchPins(filters);
        setPins(data);
      } catch {
        setPins([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadPins = useCallback(() => {
    fetchPins(buildFilters());
  }, [fetchPins, buildFilters]);

  /* Always-fresh ref so debounced / native callbacks never go stale */
  const loadPinsRef = useRef(loadPins);
  loadPinsRef.current = loadPins;

  /* ─── Initial load ─── */
  useEffect(() => {
    loadPins();
  }, []);

  /* ─── Focus on a specific provider (e.g. from ProviderProfileScreen Navigate button) ─── */
  useEffect(() => {
    const focusProviderId = route.params?.focusProviderId as string | undefined;
    if (!focusProviderId) return;

    const tryFocus = (pinsToSearch: MapPinDto[]) => {
      const pin = pinsToSearch.find((p) => p.providerId === focusProviderId);
      if (pin) {
        setSelectedPin(pin);
        mapRef.current?.animateToRegion?.(
          {
            latitude: pin.latitude,
            longitude: pin.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          600,
        );
      }
    };

    if (pins.length > 0) {
      tryFocus(pins);
    } else {
      // Pins not yet loaded — fetch without filters and then focus
      setLoading(true);
      mapApi.fetchPins().then((data) => {
        setPins(data);
        setLoading(false);
        tryFocus(data);
      }).catch(() => setLoading(false));
    }
  }, [route.params?.focusProviderId]);

  /* ─── Service pill toggle (same as web) ─── */
  const toggleServiceFilter = useCallback(
    (svc: string) => {
      setActiveServices((prev) => {
        const next = new Set(prev);
        if (next.has(svc)) next.delete(svc);
        else next.add(svc);
        return next;
      });
    },
    [],
  );

  /* ─── Search (debounced) ─── */
  const handleSearchSubmit = useCallback(() => {
    setSelectedPin(null);
    loadPinsRef.current();
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSelectedPin(null);
        loadPinsRef.current();
      }, 500);
    },
    [],
  );

  /* ─── Map region change (viewport refresh) ─── */
  const handleRegionChange = useCallback(
    (region: any) => {
      mapRegionRef.current = region;
      if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
      moveDebounceRef.current = setTimeout(() => {
        loadPinsRef.current();
      }, 500);
    },
    [],
  );

  /* ─── Filter panel actions ─── */
  const applyFilter = useCallback(() => {
    setShowFilterPanel(false);
    setSelectedPin(null);
    loadPinsRef.current();
  }, []);

  const clearFilter = useCallback(() => {
    setActiveServices(new Set());
    setFilterMinRating(null);
    setFilterMaxRate("");
    setFilterRadiusKm(null);
    setFilterDate("");
    setFilterTime("");
    setSearchText("");
    setSelectedPin(null);
    setShowFilterPanel(false);
    setTimeout(() => loadPinsRef.current(), 0);
  }, []);

  /* ─── Marker press ─── */
  const handleMarkerPress = useCallback((pin: MapPinDto) => {
    markerJustTappedRef.current = true;
    setTimeout(() => { markerJustTappedRef.current = false; }, 300);
    setSelectedPin(pin);
  }, []);

  const handleWhatsApp = useCallback((pin: MapPinDto) => {
    if (pin.whatsAppNumber) {
      const cleaned = pin.whatsAppNumber.replace(/\D/g, "");
      Linking.openURL(`https://wa.me/${cleaned}`);
    }
  }, []);

  /* ═════════════════════ RENDER ═════════════════════ */

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <MapViewWrapper
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={TEL_AVIV}
        fallbackLabel="Explore Map"
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: 110, left: 0 }}
        onRegionChangeComplete={handleRegionChange}
        onPress={() => {
          Keyboard.dismiss();
          if (!markerJustTappedRef.current) setSelectedPin(null);
        }}
        {...(Platform.OS === "android" && { mapType: "standard" })}
      >
        {userLat != null && userLng != null && (
          <MarkerWrapper
            coordinate={{ latitude: userLat, longitude: userLng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </MarkerWrapper>
        )}
        {pins.map((pin) => (
          <MarkerWrapper
            key={pin.providerId}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            onPress={() => handleMarkerPress(pin)}
            tracksViewChanges={false}
          >
            <PawMarker active={selectedPin?.providerId === pin.providerId} />
          </MarkerWrapper>
        ))}
      </MapViewWrapper>

      <SafeAreaView edges={["top"]} style={{ zIndex: 10, marginTop: -8 }}>
        <BrandedAppHeader />

        <View className="mt-2" style={{ paddingHorizontal: BRAND_HEADER_HORIZONTAL_PAD }}>
          {/* Search bar */}
          <View
            className="rounded-full px-5 py-3 flex-row items-center gap-3"
            style={[styles.searchBar, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
          >
            <Ionicons name="search" size={22} color={colors.text} />
            <TextInput
              className="flex-1 text-base font-medium"
              style={[rtlInput, { color: colors.textSecondary }]}
              placeholder={t("searchPlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={handleSearchChange}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchText.length > 0 ? (
              <Pressable onPress={() => handleSearchChange("")}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </Pressable>
            ) : (
              <Pressable onPress={() => setShowFilterPanel(true)}>
                <View>
                  <Ionicons name="options" size={22} color={activeFilterCount > 0 ? colors.text : colors.textMuted} />
                  {activeFilterCount > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -6,
                        backgroundColor: "#ef4444",
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "800",
                          color: "#fff",
                        }}
                      >
                        {activeFilterCount}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            )}
          </View>

          {/* Active filter chips (compact summary) */}
          {activeServices.size > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingTop: 10,
                gap: 6,
                flexDirection: isRTL ? "row-reverse" : "row",
              }}
            >
              {[...activeServices].map((svc) => (
                <View
                  key={svc}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.text,
                    borderRadius: 16,
                    paddingLeft: 10,
                    paddingRight: 6,
                    paddingVertical: 5,
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textInverse }}>
                    {SERVICE_I18N_MAP[svc.toLowerCase()] ? t(SERVICE_I18N_MAP[svc.toLowerCase()] as any) : svc}
                  </Text>
                  <Pressable
                    onPress={() => {
                      toggleServiceFilter(svc);
                      setTimeout(() => loadPinsRef.current(), 0);
                    }}
                    hitSlop={6}
                  >
                    <Ionicons name="close-circle" size={14} color={colors.textInverse} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      )}

      {/* Empty state */}
      {!loading && pins.length === 0 && (
        <View style={styles.emptyOverlay}>
          <View
            className="rounded-2xl px-8 py-6 items-center"
            style={[styles.emptyCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
          >
            <Ionicons name="search-outline" size={40} color={colors.textMuted} />
            <Text className="text-base font-semibold mt-3" style={{ color: colors.textSecondary }}>
              {t("noProviders")}
            </Text>
          </View>
        </View>
      )}

      {/* My Location button */}
      <Pressable
        onPress={async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;
            const loc = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = loc.coords;
            setUserLat(latitude);
            setUserLng(longitude);
            mapRef.current?.animateToRegion?.({
              latitude,
              longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }, 600);
          } catch {}
        }}
        style={{
          position: "absolute",
          bottom: selectedPin ? 290 : 180,
          ...(isRTL ? { left: 20 } : { right: 20 }),
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 17,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Ionicons name="navigate" size={22} color={colors.text} />
      </Pressable>

      {/* Report Lost Pet button */}
      <Pressable
        onPress={() => {
          if (!isLoggedIn) {
            navigation.navigate("Login");
            return;
          }
          if (!hasPets) {
            navigation.getParent()?.navigate("MyPets");
            return;
          }
          navigation
            .getParent()
            ?.navigate("MyPets", { screen: "ReportLost" });
        }}
        style={{
          position: "absolute",
          bottom: selectedPin ? 230 : 120,
          alignSelf: isRTL ? "flex-start" : "flex-end",
          ...(isRTL ? { left: 20 } : { right: 20 }),
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: "#dc2626",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 24,
          zIndex: 18,
          shadowColor: "#dc2626",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <Ionicons name="alert-circle" size={20} color="#fff" />
        <Text style={{ fontSize: 13, fontWeight: "800", color: "#fff" }}>
          {t("reportLostMapBtn")}
        </Text>
      </Pressable>

      {/* Discover Businesses FAB */}
      <Pressable
        onPress={() => navigation.navigate("Discover")}
        style={{
          position: "absolute",
          bottom: selectedPin ? 230 : 120,
          ...(isRTL ? { right: 20 } : { left: 20 }),
          alignItems: "center",
          zIndex: 18,
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          <Ionicons name="storefront" size={22} color="#fff" />
        </View>
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: colors.primary,
            marginTop: 4,
          }}
        >
          {t("tabExplore")}
        </Text>
      </Pressable>

      {/* Selected pin card */}
      {selectedPin && (
        <View
          className="absolute left-0 right-0"
          style={{ bottom: 110, zIndex: 20, paddingHorizontal: BRAND_HEADER_HORIZONTAL_PAD }}
        >
          <View
            className="p-4 rounded-xl flex-row items-center gap-4"
            style={[styles.sitterCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
          >
            <Pressable
              className="relative active:opacity-80"
              onPress={() =>
                navigation.navigate("ProviderProfile", {
                  providerId: selectedPin.providerId,
                  requestedDate: filterDate || undefined,
                  requestedTime: filterTime || undefined,
                })
              }
            >
              <AvatarImage uri={selectedPin.profileImageUrl} />
              {selectedPin.isEmergencyService && (
                <View
                  className="absolute -bottom-1 -right-1 rounded-full border-2 p-0.5"
                  style={{ backgroundColor: "#dc2626", borderColor: colors.surface }}
                >
                  <Ionicons name="medkit" size={12} color="#fff" />
                </View>
              )}
            </Pressable>

            <View className="flex-1">
              <View className="flex-row justify-between items-start">
                <Text
                  className="text-lg font-bold"
                  numberOfLines={1}
                  style={{ flex: 1, color: colors.text }}
                >
                  {selectedPin.name}
                </Text>
                <Pressable
                  onPress={() => toggleFavorite(selectedPin.providerId)}
                  hitSlop={8}
                  className="ml-2"
                >
                  <Ionicons
                    name={favoriteIds.has(selectedPin.providerId) ? "heart" : "heart-outline"}
                    size={22}
                    color={favoriteIds.has(selectedPin.providerId) ? "#e11d48" : colors.textMuted}
                  />
                </Pressable>
                {selectedPin.averageRating != null && (
                  <View className="flex-row items-center gap-1 bg-[#e9e2d1] px-2 py-0.5 rounded-full ml-2">
                    <Ionicons name="star" size={14} color="#1e1c11" />
                    <Text className="text-xs font-bold text-[#1e1c11]">
                      {selectedPin.averageRating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                className="text-sm font-medium"
                numberOfLines={1}
                style={{ color: colors.textSecondary }}
              >
                {selectedPin.services}
              </Text>

              {selectedPin.reviewCount > 0 && (
                <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                  {selectedPin.reviewCount} {t("reviews")}
                </Text>
              )}

              <View className="mt-1.5 flex-row items-center justify-between">
                <View className="flex-row items-baseline">
                  <Text className="text-xl font-bold" style={{ color: colors.text }}>
                    ₪{selectedPin.minRate}
                  </Text>
                  <Text className="text-xs font-medium ml-1" style={{ color: colors.textSecondary }}>
                    {t("perHour")}
                  </Text>
                </View>

                <View className="flex-row items-center gap-2">
                  {selectedPin.whatsAppNumber && (
                    <Pressable
                      onPress={() => handleWhatsApp(selectedPin)}
                      className="bg-[#25d366] w-8 h-8 rounded-full items-center justify-center active:opacity-90"
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                    </Pressable>
                  )}
                  <Pressable
                    className="px-4 py-1.5 rounded-full active:opacity-90"
                    style={{
                      backgroundColor: colors.text,
                      shadowColor: colors.text,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                    onPress={() =>
                      navigation.navigate("ProviderProfile", {
                        providerId: selectedPin.providerId,
                        requestedDate: filterDate || undefined,
                        requestedTime: filterTime || undefined,
                      })
                    }
                  >
                    <Text className="text-sm font-bold" style={{ color: colors.textInverse }}>
                      {t("viewProfile")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ═══════════ FILTER PANEL MODAL ═══════════ */}
      <Modal
        visible={showFilterPanel}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterPanel(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setShowFilterPanel(false)}
        />
        <View style={[styles.filterSheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Handle */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: colors.border,
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />

            {/* Title row */}
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {t("filters")}
              </Text>
              <Pressable onPress={clearFilter}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#ef4444",
                  }}
                >
                  {t("clearFilters")}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 20, paddingBottom: 20 }}
            >
              {/* ── Service type (multi-select) ── */}
              <View>
                <Text style={filterLabel(isRTL, colors)}>
                  {t("filterByService")}
                </Text>
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {serviceTypes.map((svc) => {
                    const active = activeServices.has(svc);
                    return (
                      <Pressable
                        key={svc}
                        onPress={() => toggleServiceFilter(svc)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: active ? colors.text : colors.surfaceSecondary,
                          paddingHorizontal: 14,
                          paddingVertical: 9,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: active ? colors.text : colors.border,
                        }}
                      >
                        <Ionicons
                          name={getServiceIcon(svc, active) as any}
                          size={16}
                          color={active ? colors.textInverse : colors.textSecondary}
                        />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: active ? colors.textInverse : colors.textSecondary }}>
                          {SERVICE_I18N_MAP[svc.toLowerCase()] ? t(SERVICE_I18N_MAP[svc.toLowerCase()] as any) : svc}
                        </Text>
                        {active && (
                          <Ionicons name="checkmark-circle" size={14} color={colors.textInverse} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* ── Min rating ── */}
              <View>
                <Text style={filterLabel(isRTL, colors)}>
                  {t("minRating")}
                </Text>
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    gap: 8,
                  }}
                >
                  <Pressable
                    onPress={() => setFilterMinRating(null)}
                    style={chipStyle(!filterMinRating, colors)}
                  >
                    <Text style={chipText(!filterMinRating, colors)}>
                      {t("anyRating")}
                    </Text>
                  </Pressable>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setFilterMinRating(filterMinRating === n ? null : n)}
                      style={chipStyle(filterMinRating === n, colors)}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Ionicons
                          name="star"
                          size={12}
                          color={
                            filterMinRating === n ? colors.textInverse : "#f59e0b"
                          }
                        />
                        <Text style={chipText(filterMinRating === n, colors)}>
                          {n}+
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* ── Max price ── */}
              <View>
                <Text style={filterLabel(isRTL, colors)}>
                  {t("maxPrice")} (₪)
                </Text>
                <TextInput
                  value={filterMaxRate}
                  onChangeText={setFilterMaxRate}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    backgroundColor: colors.surfaceTertiary,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.text,
                    textAlign: isRTL ? "right" : "left",
                  }}
                />
              </View>

              {/* ── Distance ── */}
              <View>
                <Text style={filterLabel(isRTL, colors)}>
                  {t("distanceKm")}
                </Text>
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {DISTANCE_OPTIONS.map((opt) => {
                    const isActive =
                      opt.value === filterRadiusKm ||
                      (opt.value === null && filterRadiusKm === null);
                    const label =
                      "labelKey" in opt ? t(opt.labelKey as any) : opt.label!;
                    return (
                      <Pressable
                        key={String(opt.value)}
                        onPress={() => setFilterRadiusKm(opt.value)}
                        style={chipStyle(isActive, colors)}
                      >
                        <Text style={chipText(isActive, colors)}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* ── Date + Time ── */}
              <View>
                <Text style={filterLabel(isRTL, colors)}>
                  {t("availableOn")}
                </Text>
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <DatePickerField
                      value={filterDate}
                      onChange={setFilterDate}
                      placeholder={t("date")}
                      isRTL={isRTL}
                      minimumDate={new Date()}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TimePickerField
                      value={filterTime}
                      onChange={setFilterTime}
                      placeholder={t("time")}
                      isRTL={isRTL}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Apply button */}
            <Pressable
              onPress={applyFilter}
              style={{
                backgroundColor: colors.text,
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text
                style={{ fontSize: 15, fontWeight: "700", color: colors.textInverse }}
              >
                {t("applyFilters")}
              </Text>
            </Pressable>
        </View>
      </Modal>
    </View>
  );
}

/* ═══════════ Style helpers ═══════════ */

function filterLabel(isRTL: boolean, colors: any) {
  return {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: isRTL ? ("right" as const) : ("left" as const),
  };
}

function chipStyle(active: boolean, colors: any) {
  return {
    backgroundColor: active ? colors.text : colors.surfaceSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  };
}

function chipText(active: boolean, colors: any) {
  return {
    fontSize: 13,
    fontWeight: "600" as const,
    color: active ? colors.textInverse : colors.textSecondary,
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchBar: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  sitterCard: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderRadius: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
    pointerEvents: "none",
  },
  emptyCard: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
  },
  filterSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    maxHeight: "75%",
  },
  userDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(60,130,246,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  userDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
