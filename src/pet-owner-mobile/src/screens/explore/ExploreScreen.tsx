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
  Alert,
  FlatList,
  InteractionManager,
} from "react-native";
import axios from "axios";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
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
import { ProviderType, type MapPinDto, type MapSearchFilters } from "../../types/api";
import { MapViewWrapper, MarkerWrapper } from "../../components/MapViewWrapper";
import { groupPinsForMapMarkers, sortMarkerItemsStable } from "./mapCollision";
import { ExploreMapMarkers } from "./ExploreMapMarkers";
import {
  EXPLORE_MAP_INITIAL_REGION,
  EXPLORE_MAP_PADDING,
  EXPLORE_USER_MARKER_ANCHOR,
} from "./exploreMapLayoutConstants";

/** iOS MapKit often passes transient/invalid regions during gestures; guard all map math. */
function isValidMapRegion(region: {
  latitude?: unknown;
  longitude?: unknown;
  latitudeDelta?: unknown;
  longitudeDelta?: unknown;
}): boolean {
  const lat = Number(region.latitude);
  const lng = Number(region.longitude);
  const dLat = Number(region.latitudeDelta);
  const dLng = Number(region.longitudeDelta);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) return false;
  if (dLat <= 0 || dLng <= 0) return false;
  return true;
}

/** Debounce for silent pin refresh after map gestures (reduces GET /map/pins churn while dragging). */
const MAP_VIEWPORT_DEBOUNCE_MS = 500;
const PROGRAMMATIC_MAP_MOVE_SUPPRESS_MS = Platform.OS === "ios" ? 1100 : 850;
/** Longer than MAP_VIEWPORT_DEBOUNCE_MS — skip silent refetch right after a marker tap (can fire onRegionChangeComplete). */
const MARKER_TAP_VIEWPORT_SUPPRESS_MS = MAP_VIEWPORT_DEBOUNCE_MS + 450;

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
  "house sitting": { icon: "key-outline", active: "key" },
  "doggy day care": { icon: "sunny-outline", active: "sunny" },
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
  "house sitting": "serviceHouseSitting",
  "doggy day care": "serviceDoggyDayCare",
};

function getServiceIcon(name: string, isActive: boolean) {
  const entry = SERVICE_ICONS[name.toLowerCase()];
  if (!entry) return isActive ? "paw" : "paw-outline";
  return isActive ? entry.active : entry.icon;
}

function formatMapPinRating(rating: unknown): string | null {
  if (rating == null) return null;
  const n = Number(rating);
  return Number.isFinite(n) ? n.toFixed(1) : null;
}

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
  const pinsRef = useRef<MapPinDto[]>(pins);
  pinsRef.current = pins;
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<MapPinDto | null>(null);
  const [collocatedChooserPins, setCollocatedChooserPins] = useState<MapPinDto[] | null>(null);
  const mapRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markerJustTappedRef = useRef(false);
  /** Ignore stale map/pin responses when the user pans or zooms faster than the network. */
  const pinsFetchGenRef = useRef(0);
  /** Last viewport used for a silent (background) pin refresh — avoids duplicate fetches when the map fires near-identical region events. */
  const lastSilentFetchRegionRef = useRef<{
    lat: number;
    lng: number;
    dLat: number;
    dLng: number;
  } | null>(null);
  /** Skip viewport pin refresh while `animateToRegion` runs (avoids iOS churn / crashes). */
  const suppressViewportFetchRef = useRef(false);
  /** Invalidates stale debounced callbacks when the user pans again before the timer fires. */
  const regionChangeSeqRef = useRef(0);
  /** Skip viewport pin refresh briefly after marker/cluster taps (avoids refetch churn and marker glitches). */
  const suppressViewportFetchAfterMarkerMsRef = useRef(0);
  /** Avoid map/pin state updates while this screen is not focused (prevents native crashes from updates off-screen). */
  const exploreScreenFocusedRef = useRef(true);

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
  const mapRegionRef = useRef(EXPLORE_MAP_INITIAL_REGION);

  /* ─── Active filter count (badge) ─── */
  const mapMarkerItems = useMemo(
    () => sortMarkerItemsStable(groupPinsForMapMarkers(pins)),
    [pins],
  );

  /** User location — stable coordinate object so Marker does not get a new `coordinate` ref every render. */
  const userLocationCoordinate = useMemo(
    () =>
      userLat != null && userLng != null
        ? { latitude: userLat, longitude: userLng }
        : null,
    [userLat, userLng],
  );

  const selectedPinRatingLabel = selectedPin
    ? formatMapPinRating(selectedPin.averageRating)
    : null;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeServices.size > 0) count += activeServices.size;
    if (filterMinRating) count++;
    if (filterMaxRate) count++;
    if (filterRadiusKm) count++;
    if (filterDate && filterTime) count++;
    return count;
  }, [activeServices, filterMinRating, filterMaxRate, filterRadiusKm, filterDate, filterTime]);

  useFocusEffect(
    useCallback(() => {
      exploreScreenFocusedRef.current = true;
      return () => {
        exploreScreenFocusedRef.current = false;
      };
    }, []),
  );

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
      const raw = mapRegionRef.current;
      const region = isValidMapRegion(raw) ? raw : EXPLORE_MAP_INITIAL_REGION;
      const latDelta = region.latitudeDelta / 2;
      const lngDelta = region.longitudeDelta / 2;
      // Distance from map center to a corner of the visible region, with extra padding so
      // providers near the viewport edge are not dropped (projection vs SQL geography tolerance).
      const diagKm =
        Math.sqrt(
          Math.pow(latDelta * 111, 2) +
            Math.pow(lngDelta * 111 * Math.cos((region.latitude * Math.PI) / 180), 2),
        ) * 1.38;
      f.latitude = region.latitude;
      f.longitude = region.longitude;
      f.radiusKm = Math.max(1.75, Math.min(diagKm, 80));
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
    async (filters?: MapSearchFilters, options?: { showLoading?: boolean }) => {
      const showLoading = options?.showLoading !== false;
      const gen = ++pinsFetchGenRef.current;
      if (showLoading) setLoading(true);
      try {
        const data = await mapApi.fetchPins(filters);
        if (gen !== pinsFetchGenRef.current) return;
        if (!exploreScreenFocusedRef.current) return;
        setPins(data);
      } catch (error) {
        if (gen !== pinsFetchGenRef.current) return;
        // Keep existing pins visible; do not clear the map on transient errors.
        if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
          Alert.alert(t("genericErrorTitle"), t("genericErrorDesc"));
        }
      } finally {
        if (gen === pinsFetchGenRef.current && showLoading) {
          setLoading(false);
        }
      }
    },
    [t],
  );

  const loadPins = useCallback(
    (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!silent) lastSilentFetchRegionRef.current = null;
      fetchPins(buildFilters(), { showLoading: !silent });
    },
    [fetchPins, buildFilters],
  );

  /* Always-fresh ref so debounced / native callbacks never go stale */
  const loadPinsRef = useRef(loadPins);
  loadPinsRef.current = loadPins;

  /* ─── Initial load ─── */
  useEffect(() => {
    loadPins();
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
    };
  }, []);

  const beginProgrammaticMapMove = useCallback(() => {
    suppressViewportFetchRef.current = true;
    setTimeout(() => {
      suppressViewportFetchRef.current = false;
    }, PROGRAMMATIC_MAP_MOVE_SUPPRESS_MS);
  }, []);

  /* ─── Focus on a specific provider (e.g. from ProviderProfileScreen Navigate button) ─── */
  useEffect(() => {
    const focusProviderId = route.params?.focusProviderId as string | undefined;
    if (!focusProviderId) return;

    const tryFocus = (pinsToSearch: MapPinDto[]) => {
      const pin = pinsToSearch.find((p) => p.providerId === focusProviderId);
      if (pin) {
        setSelectedPin(pin);
        beginProgrammaticMapMove();
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
      // Pins not yet loaded — fetch without filters and then focus (same gen guard as fetchPins)
      const gen = ++pinsFetchGenRef.current;
      setLoading(true);
      mapApi
        .fetchPins()
        .then((data) => {
          if (gen !== pinsFetchGenRef.current) return;
          if (!exploreScreenFocusedRef.current) return;
          setPins(data);
          tryFocus(data);
        })
        .catch((error) => {
          if (gen !== pinsFetchGenRef.current) return;
          if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
            Alert.alert(t("genericErrorTitle"), t("genericErrorDesc"));
          }
        })
        .finally(() => {
          if (gen === pinsFetchGenRef.current) setLoading(false);
        });
    }
  }, [route.params?.focusProviderId, t, beginProgrammaticMapMove]);

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
    setCollocatedChooserPins(null);
    loadPinsRef.current();
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSelectedPin(null);
        setCollocatedChooserPins(null);
        loadPinsRef.current({ silent: true });
      }, 500);
    },
    [],
  );

  /* ─── Map region change (viewport refresh) ─── */
  const handleRegionChange = useCallback(
    (region: any) => {
      if (isValidMapRegion(region)) {
        mapRegionRef.current = region;
      }
      const seq = ++regionChangeSeqRef.current;
      if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
      moveDebounceRef.current = setTimeout(() => {
        if (seq !== regionChangeSeqRef.current) return;
        if (suppressViewportFetchRef.current) return;
        const r = mapRegionRef.current;
        if (!isValidMapRegion(r)) return;
        if (Date.now() < suppressViewportFetchAfterMarkerMsRef.current) return;

        const prev = lastSilentFetchRegionRef.current;
        const latSpan = Math.max(r.latitudeDelta, 1e-9);
        const lngSpan = Math.max(r.longitudeDelta, 1e-9);
        if (prev) {
          const smallMove =
            Math.abs(prev.lat - r.latitude) < latSpan * 0.04 &&
            Math.abs(prev.lng - r.longitude) < lngSpan * 0.04;
          const smallZoom =
            Math.abs(prev.dLat - r.latitudeDelta) < latSpan * 0.12 &&
            Math.abs(prev.dLng - r.longitudeDelta) < lngSpan * 0.12;
          if (smallMove && smallZoom) return;
        }
        lastSilentFetchRegionRef.current = {
          lat: r.latitude,
          lng: r.longitude,
          dLat: r.latitudeDelta,
          dLng: r.longitudeDelta,
        };

        InteractionManager.runAfterInteractions(() => {
          if (seq !== regionChangeSeqRef.current) return;
          if (!exploreScreenFocusedRef.current) return;
          if (suppressViewportFetchRef.current) return;
          setCollocatedChooserPins(null);
          loadPinsRef.current({ silent: true });
        });
      }, MAP_VIEWPORT_DEBOUNCE_MS);
    },
    [],
  );

  /* ─── Filter panel actions ─── */
  const applyFilter = useCallback(() => {
    setShowFilterPanel(false);
    setSelectedPin(null);
    setCollocatedChooserPins(null);
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
    setCollocatedChooserPins(null);
    setShowFilterPanel(false);
    setTimeout(() => loadPinsRef.current(), 0);
  }, []);

  /* ─── Marker press (id-based so marker row callbacks stay stable across re-renders) ─── */
  const onPressProviderMarkerId = useCallback((providerId: string) => {
    const pin = pinsRef.current.find((p) => p.providerId === providerId);
    if (!pin) return;
    suppressViewportFetchAfterMarkerMsRef.current = Date.now() + MARKER_TAP_VIEWPORT_SUPPRESS_MS;
    markerJustTappedRef.current = true;
    setTimeout(() => {
      markerJustTappedRef.current = false;
    }, 300);
    setCollocatedChooserPins(null);
    setSelectedPin(pin);
  }, []);

  const openCollocatedChooser = useCallback((clusterPins: MapPinDto[]) => {
    suppressViewportFetchAfterMarkerMsRef.current = Date.now() + MARKER_TAP_VIEWPORT_SUPPRESS_MS;
    markerJustTappedRef.current = true;
    setTimeout(() => {
      markerJustTappedRef.current = false;
    }, 300);
    setCollocatedChooserPins(clusterPins);
  }, []);

  const pickFromCollocatedList = useCallback((pin: MapPinDto) => {
    suppressViewportFetchAfterMarkerMsRef.current = Date.now() + MARKER_TAP_VIEWPORT_SUPPRESS_MS;
    markerJustTappedRef.current = true;
    setTimeout(() => {
      markerJustTappedRef.current = false;
    }, 300);
    setSelectedPin(pin);
    setCollocatedChooserPins(null);
  }, []);

  const handleWhatsApp = useCallback((pin: MapPinDto) => {
    if (pin.whatsAppNumber) {
      const cleaned = pin.whatsAppNumber.replace(/\D/g, "");
      Linking.openURL(`https://wa.me/${cleaned}`);
    }
  }, []);

  /** Stable callback — inline `onPress` on MapView was a new function every render and forced MapKit churn on iOS. */
  const handleMapBackgroundPress = useCallback(() => {
    Keyboard.dismiss();
    if (!markerJustTappedRef.current) {
      setSelectedPin(null);
      setCollocatedChooserPins(null);
    }
  }, []);

  const selectedProviderIdForMap = selectedPin?.providerId ?? null;

  /* ═════════════════════ RENDER ═════════════════════ */

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* MapView must be a direct child of a positioned View — wrapping it in a custom memo component breaks iOS MapKit layout */}
      <MapViewWrapper
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={EXPLORE_MAP_INITIAL_REGION}
        fallbackLabel="Explore Map"
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        moveOnMarkerPress={false}
        mapPadding={EXPLORE_MAP_PADDING}
        onRegionChangeComplete={handleRegionChange}
        onPress={handleMapBackgroundPress}
        {...(Platform.OS === "android" && { mapType: "standard" })}
      >
        {userLocationCoordinate != null && (
          <MarkerWrapper
            coordinate={userLocationCoordinate}
            anchor={EXPLORE_USER_MARKER_ANCHOR}
            pinColor={colors.primary as string}
            tracksViewChanges={false}
          />
        )}
        <ExploreMapMarkers
          items={mapMarkerItems}
          selectedProviderId={selectedProviderIdForMap}
          onPressProviderId={onPressProviderMarkerId}
          onPressClusterPins={openCollocatedChooser}
        />
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
            beginProgrammaticMapMove();
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
        onPress={() =>
          navigation.navigate("Discover", { providerTypeFilter: ProviderType.Business })
        }
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
                {selectedPinRatingLabel != null && (
                  <View className="flex-row items-center gap-1 bg-[#e9e2d1] px-2 py-0.5 rounded-full ml-2">
                    <Ionicons name="star" size={14} color="#1e1c11" />
                    <Text className="text-xs font-bold text-[#1e1c11]">
                      {selectedPinRatingLabel}
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

      <Modal
        visible={collocatedChooserPins != null && collocatedChooserPins.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setCollocatedChooserPins(null)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay }]}
            onPress={() => setCollocatedChooserPins(null)}
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
          />
          <View
            style={[
              styles.collocatedSheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: Math.max(insets.bottom, 20),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 16,
              },
            ]}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: colors.border,
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 14,
              }}
            />
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 6,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: colors.text,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {t("mapCollocatedProvidersTitle")}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    textAlign: isRTL ? "right" : "left",
                    marginTop: 4,
                  }}
                >
                  {t("mapCollocatedProvidersHint")}
                </Text>
              </View>
              <Pressable
                onPress={() => setCollocatedChooserPins(null)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("cancel")}
                style={({ pressed }) => ({
                  padding: 4,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <Ionicons name="close" size={26} color={colors.textMuted} />
              </Pressable>
            </View>
            <FlatList
              data={collocatedChooserPins ?? []}
              keyExtractor={(p) => p.providerId}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 380 }}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 4 }}
              renderItem={({ item: pin }) => {
                const servicesLine = pin.services?.trim();
                const servicesDisplay =
                  servicesLine || t("mapCollocatedServicesPlaceholder");
                const rate =
                  typeof pin.minRate === "number" && Number.isFinite(pin.minRate)
                    ? pin.minRate
                    : 0;
                const collocatedRatingLabel = formatMapPinRating(pin.averageRating);

                const openProfile = () => {
                  setCollocatedChooserPins(null);
                  navigation.navigate("ProviderProfile", {
                    providerId: pin.providerId,
                    requestedDate: filterDate || undefined,
                    requestedTime: filterTime || undefined,
                  });
                };

                return (
                  <Pressable
                    onPress={() => pickFromCollocatedList(pin)}
                    accessibilityRole="button"
                    accessibilityLabel={pin.name}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.96 : 1,
                      marginBottom: 12,
                    })}
                  >
                    <View
                      className="p-4 rounded-xl flex-row items-center gap-4"
                      style={[
                        styles.sitterCard,
                        {
                          backgroundColor: colors.surface,
                          shadowColor: colors.shadow,
                          flexDirection: isRTL ? "row-reverse" : "row",
                        },
                      ]}
                    >
                      <Pressable
                        className="relative active:opacity-80"
                        onPress={openProfile}
                      >
                        <AvatarImage uri={pin.profileImageUrl} />
                        {pin.isEmergencyService && (
                          <View
                            className="absolute -bottom-1 -right-1 rounded-full border-2 p-0.5"
                            style={{
                              backgroundColor: "#dc2626",
                              borderColor: colors.surface,
                            }}
                          >
                            <Ionicons name="medkit" size={12} color="#fff" />
                          </View>
                        )}
                      </Pressable>

                      <View className="flex-1" style={{ minWidth: 0 }}>
                        <View className="flex-row justify-between items-start">
                          <Text
                            className="text-lg font-bold"
                            numberOfLines={1}
                            style={{
                              flex: 1,
                              color: colors.text,
                              textAlign: isRTL ? "right" : "left",
                            }}
                          >
                            {pin.name}
                          </Text>
                          <Pressable
                            onPress={() => toggleFavorite(pin.providerId)}
                            hitSlop={8}
                            className="ml-2"
                          >
                            <Ionicons
                              name={
                                favoriteIds.has(pin.providerId)
                                  ? "heart"
                                  : "heart-outline"
                              }
                              size={22}
                              color={
                                favoriteIds.has(pin.providerId)
                                  ? "#e11d48"
                                  : colors.textMuted
                              }
                            />
                          </Pressable>
                          {collocatedRatingLabel != null && (
                            <View className="flex-row items-center gap-1 bg-[#e9e2d1] px-2 py-0.5 rounded-full ml-2">
                              <Ionicons name="star" size={14} color="#1e1c11" />
                              <Text className="text-xs font-bold text-[#1e1c11]">
                                {collocatedRatingLabel}
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text
                          className="text-sm font-medium mt-0.5"
                          numberOfLines={2}
                          style={{
                            color: servicesLine
                              ? colors.textSecondary
                              : colors.textMuted,
                            textAlign: isRTL ? "right" : "left",
                            fontStyle: servicesLine ? "normal" : "italic",
                            minHeight: 40,
                          }}
                        >
                          {servicesDisplay}
                        </Text>

                        {pin.reviewCount > 0 && (
                          <Text
                            className="text-xs mt-0.5"
                            style={{
                              color: colors.textMuted,
                              textAlign: isRTL ? "right" : "left",
                            }}
                          >
                            {pin.reviewCount} {t("reviews")}
                          </Text>
                        )}

                        <View
                          className="mt-1.5 flex-row items-center justify-between"
                          style={{
                            flexDirection: isRTL ? "row-reverse" : "row",
                          }}
                        >
                          <View className="flex-row items-baseline">
                            <Text
                              className="text-xl font-bold"
                              style={{ color: colors.text }}
                            >
                              ₪{rate}
                            </Text>
                            <Text
                              className="text-xs font-medium ml-1"
                              style={{ color: colors.textSecondary }}
                            >
                              {t("perHour")}
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-2">
                            {pin.whatsAppNumber ? (
                              <Pressable
                                onPress={() => {
                                  setCollocatedChooserPins(null);
                                  handleWhatsApp(pin);
                                }}
                                className="bg-[#25d366] w-8 h-8 rounded-full items-center justify-center active:opacity-90"
                              >
                                <Ionicons
                                  name="logo-whatsapp"
                                  size={18}
                                  color="#fff"
                                />
                              </Pressable>
                            ) : null}
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
                              onPress={openProfile}
                            >
                              <Text
                                className="text-sm font-bold"
                                style={{ color: colors.textInverse }}
                              >
                                {t("viewProfile")}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>

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
  collocatedSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "62%",
  },
});
