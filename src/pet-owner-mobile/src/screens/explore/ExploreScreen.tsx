import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  type PropsWithChildren,
} from "react";
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
  FlatList,
  InteractionManager,
  useWindowDimensions,
} from "react-native";
import axios from "axios";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_HEADER_HORIZONTAL_PAD } from "../../components/BrandedAppHeader";

/** Tight crop of `petcare-logo-transparent.png` (Explore header only). */
const EXPLORE_HEADER_LOGO = require("../../../assets/petcare-logo-header-trimmed.png");
const EXPLORE_HEADER_LOGO_ASPECT = 639 / 246;
import { useTranslation, rowDirectionForAppLayout, type TranslationKey } from "../../i18n";
import { getNormalizedApiError } from "../../utils/apiUtils";
import { showApiErrorToast } from "../../services/apiErrorToast";
import { useAuthStore } from "../../store/authStore";
import { usePetsStore } from "../../store/petsStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { useTheme } from "../../theme/ThemeContext";
import { DatePickerField } from "../../components/DatePickerField";
import { TimePickerField } from "../../components/TimePickerField";
import { mapApi, communityApi, palsApi } from "../../api/client";
import {
  ProviderType,
  PetSpecies,
  type DogParkDto,
  type MapPinDto,
  type MapSearchFilters,
  type PlaydateMapPinDto,
} from "../../types/api";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { MapViewWrapper, MarkerWrapper, CircleWrapper } from "../../components/MapViewWrapper";
import { groupPinsForMapMarkers, sortMarkerItemsStable } from "./mapCollision";
import {
  ExploreMapMarkers,
  ExploreSelectedMarkerOverlay,
  OFFSCREEN_COORDINATE,
  type MarkerPoolSlot,
} from "./ExploreMapMarkers";
import { mapDiag } from "./exploreMapDiag";
import {
  EXPLORE_MAP_INITIAL_REGION,
  EXPLORE_MAP_PADDING,
  EXPLORE_USER_MARKER_ANCHOR,
  isValidMapRegion,
  viewportPinsSearchParamsFromRegion,
} from "./exploreMapLayoutConstants";

/** Debounce for silent pin refresh after map gestures (reduces GET /map/pins churn while dragging). */
const MAP_VIEWPORT_DEBOUNCE_MS = 500;
const PROGRAMMATIC_MAP_MOVE_SUPPRESS_MS = Platform.OS === "ios" ? 1100 : 850;
/** Longer than MAP_VIEWPORT_DEBOUNCE_MS — skip silent refetch right after a marker tap (can fire onRegionChangeComplete). */
const MARKER_TAP_VIEWPORT_SUPPRESS_MS = MAP_VIEWPORT_DEBOUNCE_MS + 450;
/** Filter sheet drag-dismiss: translate past this (px) guarantees off-screen on all devices. */
const FILTER_SHEET_DISMISS_SLIDE_PX = 960;

const DISTANCE_OPTIONS = [
  { value: null, labelKey: "anyDistance" as const },
  { value: 1, labelKey: "distanceOption1km" as const },
  { value: 3, labelKey: "distanceOption3km" as const },
  { value: 5, labelKey: "distanceOption5km" as const },
  { value: 10, labelKey: "distanceOption10km" as const },
  { value: 25, labelKey: "distanceOption25km" as const },
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

/** Map API comma-separated English service labels to current locale (same keys as filter chips). */
function translateServiceNamesCsv(
  services: string | null | undefined,
  t: (key: TranslationKey) => string,
): string {
  const raw = services?.trim();
  if (!raw) return "";
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const key = SERVICE_I18N_MAP[part.toLowerCase()] as TranslationKey | undefined;
      return key ? t(key) : part;
    })
    .join(", ");
}

function getServiceIcon(name: string, isActive: boolean) {
  const entry = SERVICE_ICONS[name.toLowerCase()];
  if (!entry) return isActive ? "paw" : "paw-outline";
  return isActive ? entry.active : entry.icon;
}

/**
 * Google Maps on Android can stop receiving gestures after `I18nManager.forceRTL`
 * (language toggle → reload). Keep the map subtree in native LTR; Explore chrome
 * still uses `rowDirectionForAppLayout` / `rtlInput` for RTL UI.
 */
function AndroidMapRtlIsolation({ children }: PropsWithChildren) {
  if (Platform.OS !== "android") return <>{children}</>;
  return (
    <View
      style={[StyleSheet.absoluteFillObject, styles.androidMapLtrShell]}
      pointerEvents="box-none"
    >
      {children}
    </View>
  );
}

function formatMapPinRating(rating: unknown): string | null {
  if (rating == null) return null;
  const n = Number(rating);
  return Number.isFinite(n) ? n.toFixed(1) : null;
}

/** Best-effort city/locality from a freeform address (e.g. "Street, City"). */
function cityHintFromParkAddress(address: string | undefined | null): string | undefined {
  const raw = address?.trim();
  if (!raw) return undefined;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1];
  return undefined;
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
  /** `t` is a new function every render from useTranslation — never use it as a useEffect dep for one-shot fetches. */
  const tRef = useRef(t);
  tRef.current = t;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  /** Scroll region inside filter sheet: `flex:1` on ScrollView collapsed when the sheet had no fixed height (only maxHeight). */
  const filterSheetScrollMaxHeight = useMemo(() => {
    const sheetCap = Math.round(windowHeight * 0.75);
    const chrome = 128 + Math.max(insets.bottom, 16);
    return Math.max(220, sheetCap - chrome);
  }, [windowHeight, insets.bottom]);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasPets = usePetsStore((s) => s.pets.length > 0);
  const pets = usePetsStore((s) => s.pets);
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
  /**
   * Aborts any in-flight `GET /map/pins` call when a new one is issued. Without this, rapid panning
   * stacks HTTP responses in memory (they can't be GC'd until axios resolves them), which pressures
   * the native bridge and is a known MapKit crash trigger on Expo Go.
   */
  const pinsAbortRef = useRef<AbortController | null>(null);
  /** `route.params.focusProviderId` navigation: avoid duplicate unfiltered fetches and re-animations. */
  const focusProviderParamPrevRef = useRef<string | undefined>(undefined);
  const focusProviderFetchInFlightRef = useRef(false);
  const focusProviderAnimatedForRef = useRef<string | null>(null);

  /* Service types from API */
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [serviceTypesError, setServiceTypesError] = useState(false);
  /** Location permission / one-shot location errors (non-blocking banner / toast). */
  const [locationHint, setLocationHint] = useState<"none" | "denied">("none");

  /* Filter state */
  const [searchText, setSearchText] = useState("");
  const [activeServices, setActiveServices] = useState<Set<string>>(new Set());
  const [filterMinRating, setFilterMinRating] = useState<number | null>(null);
  const [filterMaxRate, setFilterMaxRate] = useState("");
  const [filterRadiusKm, setFilterRadiusKm] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterTime, setFilterTime] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  /* Playdate-on-map layer */
  const [playdateMode, setPlaydateMode] = useState(false);
  const [playdatePins, setPlaydatePins] = useState<PlaydateMapPinDto[]>([]);
  const [selectedPlaydate, setSelectedPlaydate] = useState<PlaydateMapPinDto | null>(null);
  const playdateAbortRef = useRef<AbortController | null>(null);

  /* Dog parks catalog (GET /api/parks) — fetched once, not on map pan */
  const [dogParks, setDogParks] = useState<DogParkDto[]>([]);
  const dogParksFetchGenRef = useRef(0);
  const dogParksAbortRef = useRef<AbortController | null>(null);
  const [showDogParksOnly, setShowDogParksOnly] = useState(false);
  const showDogParksOnlyRef = useRef(false);
  const [selectedDogPark, setSelectedDogPark] = useState<DogParkDto | null>(null);
  const [dogParkCheckInLoading, setDogParkCheckInLoading] = useState(false);

  /* User location */
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  /** Prevent the map from auto-centering more than once per session. */
  const hasAutocenteredRef = useRef(false);
  /** True while the locate-me button is waiting for a GPS fix. */
  const [locating, setLocating] = useState(false);
  /**
   * Enforces a minimum interval between consecutive `setPins` calls. MapKit needs time
   * to fully commit one annotation batch before the next removeAnnotation/addAnnotation
   * set arrives — without this gap, accumulated state corruption crashes the map after
   * several rapid panning-induced refetches. 800ms matches MapKit's internal animation
   * budget for annotation layout passes.
   */
  const lastPinsAppliedAtRef = useRef(0);
  /** High watermark for the marker object pool — pool size only grows, never shrinks. */
  const poolHighWaterRef = useRef(0);
  /**
   * Previous rendered location — only update state when the user moves ≥ 10 m.
   * GPS jitter (sub-metre drifts every 5 s) would otherwise cause the user-dot
   * Marker and accuracy Circle to receive new props on every watchPositionAsync
   * tick, creating concurrent overlay + annotation updates that crash MapKit.
   */
  const prevUserLatRef = useRef<number | null>(null);
  const prevUserLngRef = useRef<number | null>(null);

  /* Current map region for viewport-based queries */
  const mapRegionRef = useRef(EXPLORE_MAP_INITIAL_REGION);
  const mapLatDeltaRef = useRef(EXPLORE_MAP_INITIAL_REGION.latitudeDelta);
  const [mapLatDelta, setMapLatDelta] = useState(EXPLORE_MAP_INITIAL_REGION.latitudeDelta);

  /* ─── Marker object pool (RecyclerView / view-recycling pattern) ─── */
  const markerPool: MarkerPoolSlot[] = useMemo(() => {
    const pinSource = showDogParksOnly ? [] : pins;
    const items = sortMarkerItemsStable(groupPinsForMapMarkers(pinSource, mapLatDelta));

    let singles = 0;
    let clusters = 0;
    let clusterPinsTotal = 0;
    for (const it of items) {
      if (it.kind === "single") singles++;
      else { clusters++; clusterPinsTotal += it.pins.length; }
    }
    mapDiag("markerItems.rebuild", {
      pins: pinSource.length,
      total: items.length,
      singles,
      clusters,
      clusterPinsTotal,
    });

    if (items.length > poolHighWaterRef.current) {
      poolHighWaterRef.current = items.length;
    }
    const poolSize = poolHighWaterRef.current;

    const pool: MarkerPoolSlot[] = [];
    for (let i = 0; i < poolSize; i++) {
      if (i < items.length) {
        const item = items[i];
        if (item.kind === "single") {
          pool.push({
            kind: "single",
            coordinate: {
              latitude: Number(item.pin.latitude),
              longitude: Number(item.pin.longitude),
            },
            providerId: item.pin.providerId,
            clusterKey: null,
            clusterCount: 0,
            clusterPins: null,
          });
        } else {
          pool.push({
            kind: "cluster",
            coordinate: { latitude: item.latitude, longitude: item.longitude },
            providerId: null,
            clusterKey: item.key,
            clusterCount: item.pins.length,
            clusterPins: item.pins,
          });
        }
      } else {
        pool.push({
          kind: "offscreen",
          coordinate: OFFSCREEN_COORDINATE,
          providerId: null,
          clusterKey: null,
          clusterCount: 0,
          clusterPins: null,
        });
      }
    }
    return pool;
  }, [pins, showDogParksOnly, mapLatDelta]);



  /** Stable coordinate object — new reference only when user actually moves ≥ 10 m. */
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
    if (playdateMode) count++;
    if (showDogParksOnly) count++;
    return count;
  }, [activeServices, filterMinRating, filterMaxRate, filterRadiusKm, filterDate, filterTime, playdateMode, showDogParksOnly]);

  useFocusEffect(
    useCallback(() => {
      exploreScreenFocusedRef.current = true;
      mapDiag("screen.focus");
      return () => {
        exploreScreenFocusedRef.current = false;
        mapDiag("screen.blur");
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      Location.getForegroundPermissionsAsync()
        .then(({ status }) => {
          if (status === "granted") {
            setLocationHint("none");
          }
        })
        .catch(() => {});
    }, []),
  );

  useEffect(() => {
    showDogParksOnlyRef.current = showDogParksOnly;
  }, [showDogParksOnly]);

  /* ─── Dog parks catalog (one fetch per screen mount) ─── */
  useEffect(() => {
    const gen = ++dogParksFetchGenRef.current;
    dogParksAbortRef.current?.abort();
    const ctrl = new AbortController();
    dogParksAbortRef.current = ctrl;

    mapApi
      .fetchDogParks(ctrl.signal)
      .then((data) => {
        if (gen !== dogParksFetchGenRef.current) return;
        if (!exploreScreenFocusedRef.current) return;
        setDogParks(data);
      })
      .catch((error) => {
        if (gen !== dogParksFetchGenRef.current) return;
        if (!exploreScreenFocusedRef.current) return;
        setDogParks([]);
        if (axios.isCancel(error) || (error as Error)?.name === "CanceledError") return;
        showApiErrorToast(getNormalizedApiError(error), {
          title: tRef.current("genericErrorTitle"),
        });
      });

    return () => {
      ctrl.abort();
    };
  }, []);

  useEffect(() => {
    mapDiag("selection.change", {
      providerId: selectedPin?.providerId ?? null,
      lat: selectedPin?.latitude,
      lng: selectedPin?.longitude,
    });
  }, [selectedPin]);

  /* ─── Load service types ─── */
  useEffect(() => {
    setServiceTypesError(false);
    mapApi
      .getServiceTypes()
      .then((types) => {
        setServiceTypes(types);
        setServiceTypesError(false);
      })
      .catch(() => {
        setServiceTypes([]);
        setServiceTypesError(true);
      });
  }, []);

  /* ─── Playdate pin layer ─── */
  useEffect(() => {
    if (!playdateMode) {
      playdateAbortRef.current?.abort();
      setPlaydatePins([]);
      setSelectedPlaydate(null);
      return;
    }
    playdateAbortRef.current?.abort();
    const ctrl = new AbortController();
    playdateAbortRef.current = ctrl;

    const r = mapRegionRef.current;
    const lat = userLat ?? r.latitude;
    const lng = userLng ?? r.longitude;
    const latDelta = r.latitudeDelta / 2;
    const lngDelta = r.longitudeDelta / 2;
    const diagKm = Math.sqrt(
      Math.pow(latDelta * 111, 2) +
        Math.pow(lngDelta * 111 * Math.cos((lat * Math.PI) / 180), 2),
    ) * 1.38;
    const radius = filterRadiusKm ?? Math.max(5, Math.min(diagKm, 80));

    mapApi
      .fetchPlaydatePins({ latitude: lat, longitude: lng, radiusKm: radius }, ctrl.signal)
      .then((data) => {
        if (!exploreScreenFocusedRef.current) return;
        setPlaydatePins(data);
      })
      .catch((error) => {
        if (axios.isCancel(error) || (error as Error)?.name === "CanceledError") return;
        if (!exploreScreenFocusedRef.current) return;
        showApiErrorToast(getNormalizedApiError(error), {
          title: tRef.current("genericErrorTitle"),
        });
      });
  }, [playdateMode, userLat, userLng, filterRadiusKm]);

  /* ─── Request location ─── */
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationHint("denied");
          return;
        }
        setLocationHint("none");

        // Subscribe to position updates so the blue dot + circle stay live.
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => {
            const { latitude, longitude } = loc.coords;
            // Only update state (and therefore re-render the dot/circle) when the
            // user physically moves ≥ 10 m. GPS jitter while stationary produces
            // sub-metre coordinate changes on every 5 s tick; those tiny updates
            // would push new props to the CircleWrapper and dot MarkerWrapper,
            // potentially conflicting with concurrent annotation batch operations.
            const pLat = prevUserLatRef.current;
            const pLng = prevUserLngRef.current;
            const MIN_MOVE = 0.00009; // ~10 m in decimal degrees
            if (
              pLat != null &&
              pLng != null &&
              Math.abs(latitude - pLat) < MIN_MOVE &&
              Math.abs(longitude - pLng) < MIN_MOVE
            ) {
              return; // stationary — skip state update
            }
            prevUserLatRef.current = latitude;
            prevUserLngRef.current = longitude;
            setUserLat(latitude);
            setUserLng(longitude);

            // Auto-center once on the first real fix.
            if (!hasAutocenteredRef.current) {
              hasAutocenteredRef.current = true;
              beginProgrammaticMapMove();
              mapRef.current?.animateToRegion?.(
                { latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
                700,
              );
            }
          },
        );
      } catch {}
    })();
    return () => { sub?.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const geo = viewportPinsSearchParamsFromRegion(region);
      if (geo) {
        f.latitude = geo.latitude;
        f.longitude = geo.longitude;
        f.radiusKm = geo.radiusKm;
      }
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

  /**
   * Commit a new pins list to state only when something actually changed, and only
   * after any running native gesture has settled. This is the single biggest lever
   * for MapKit stability: avoids rebuilding the entire annotation set mid-pan and
   * keeps the `pins` array reference stable when the server returns the same set.
   */
  /**
   * Quantizes incoming pin coordinates so sub-meter float drift between fetches does
   * not invalidate base-marker memo equality. Precision ≈ 1m — well below anything
   * visible on screen at any zoom level. This keeps the React reference graph stable
   * so MapKit does not receive coordinate prop updates for already-mounted annotations.
   */
  const normalizePins = useCallback((incoming: MapPinDto[]): MapPinDto[] => {
    return incoming.map((p) => {
      const lat = Math.round(Number(p.latitude) * 1e5) / 1e5;
      const lng = Math.round(Number(p.longitude) * 1e5) / 1e5;
      if (lat === p.latitude && lng === p.longitude) return p;
      return { ...p, latitude: lat, longitude: lng };
    });
  }, []);

  /**
   * Commit a new pin set to state. With the object-pool architecture, `setPins`
   * never triggers `removeAnnotation` — the pool memo maps active pins to slots
   * 0..N-1 and parks unused slots at OFFSCREEN_COORDINATE. MapKit only sees
   * coordinate prop updates on already-mounted annotations, which is safe at
   * any time, including mid-gesture.
   *
   * No staging, no deferral, no rate-limiting needed. The only guard is
   * `InteractionManager.runAfterInteractions` to batch the React commit after
   * the current gesture frame completes.
   */
  const commitPins = useCallback(
    (rawIncoming: MapPinDto[]) => {
      const incoming = normalizePins(rawIncoming);
      const current = pinsRef.current;

      if (current.length === incoming.length) {
        let identical = true;
        for (let i = 0; i < current.length; i++) {
          const a = current[i];
          const b = incoming[i];
          if (
            a.providerId !== b.providerId ||
            a.latitude !== b.latitude ||
            a.longitude !== b.longitude
          ) {
            identical = false;
            break;
          }
        }
        if (identical) {
          mapDiag("commitPins.skip-identical", { count: incoming.length });
          return;
        }
      }

      mapDiag("commitPins.queue", { from: current.length, to: incoming.length });

      InteractionManager.runAfterInteractions(() => {
        if (!exploreScreenFocusedRef.current) {
          mapDiag("commitPins.drop-unfocused", { to: incoming.length });
          return;
        }
        lastPinsAppliedAtRef.current = Date.now();
        mapDiag("commitPins.apply", { count: incoming.length });
        setPins(incoming);
      });
    },
    [normalizePins],
  );

  /* ─── Fetch pins ─── */
  const fetchPins = useCallback(
    async (filters?: MapSearchFilters, options?: { showLoading?: boolean }) => {
      const showLoading = options?.showLoading !== false;
      const gen = ++pinsFetchGenRef.current;

      // Cancel the previous in-flight request so axios can release its response buffer.
      const wasAborted = pinsAbortRef.current != null;
      pinsAbortRef.current?.abort();
      const controller = new AbortController();
      pinsAbortRef.current = controller;

      mapDiag("fetchPins.start", { gen, showLoading, aborted_previous: wasAborted, filters });
      const startedAt = Date.now();
      if (showLoading) setLoading(true);
      try {
        const data = await mapApi.fetchPins(filters, controller.signal);
        const dur = Date.now() - startedAt;
        if (gen !== pinsFetchGenRef.current) {
          mapDiag("fetchPins.stale-gen", { gen, cur: pinsFetchGenRef.current, dur, count: data.length });
          return;
        }
        if (!exploreScreenFocusedRef.current) {
          mapDiag("fetchPins.unfocused", { gen, dur, count: data.length });
          return;
        }
        mapDiag("fetchPins.ok", { gen, dur, count: data.length });
        commitPins(data);
      } catch (error) {
        const dur = Date.now() - startedAt;
        if (gen !== pinsFetchGenRef.current) {
          mapDiag("fetchPins.err-stale", { gen, dur });
          return;
        }
        if (axios.isCancel(error) || (error as Error)?.name === "CanceledError") {
          mapDiag("fetchPins.cancel", { gen, dur });
          return;
        }
        mapDiag("fetchPins.error", { gen, dur, msg: (error as Error)?.message });
        // Keep existing pins visible; do not clear the map on transient errors.
        if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
          showApiErrorToast(getNormalizedApiError(error), {
            title: t("genericErrorTitle"),
          });
        }
      } finally {
        if (gen === pinsFetchGenRef.current) {
          setLoading(false);
        }
      }
    },
    [t, commitPins],
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
      pinsAbortRef.current?.abort();
      dogParksAbortRef.current?.abort();
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
    const id = route.params?.focusProviderId as string | undefined;
    if (!id) {
      focusProviderParamPrevRef.current = undefined;
      focusProviderFetchInFlightRef.current = false;
      focusProviderAnimatedForRef.current = null;
      return;
    }

    if (focusProviderParamPrevRef.current !== id) {
      focusProviderParamPrevRef.current = id;
      focusProviderFetchInFlightRef.current = false;
      focusProviderAnimatedForRef.current = null;
    }

    const applyFocusedPin = (pin: MapPinDto) => {
      setSelectedPin(pin);
      if (focusProviderAnimatedForRef.current !== id) {
        focusProviderAnimatedForRef.current = id;
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

    const hit = pins.find((p) => p.providerId === id);
    if (hit) {
      applyFocusedPin(hit);
      return;
    }

    if (focusProviderFetchInFlightRef.current) return;
    focusProviderFetchInFlightRef.current = true;

    const gen = ++pinsFetchGenRef.current;
    pinsAbortRef.current?.abort();
    const ctrl = new AbortController();
    pinsAbortRef.current = ctrl;
    setLoading(true);
    mapApi
      .fetchPins(undefined, ctrl.signal)
      .then((data) => {
        focusProviderFetchInFlightRef.current = false;
        if (gen !== pinsFetchGenRef.current) return;
        if (!exploreScreenFocusedRef.current) return;
        commitPins(data);
        const p = data.find((x) => x.providerId === id);
        if (p) applyFocusedPin(p);
      })
      .catch((error) => {
        focusProviderFetchInFlightRef.current = false;
        if (gen !== pinsFetchGenRef.current) return;
        if (axios.isCancel(error) || (error as Error)?.name === "CanceledError") return;
        if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
          showApiErrorToast(getNormalizedApiError(error), {
            title: t("genericErrorTitle"),
          });
        }
      })
      .finally(() => {
        if (gen === pinsFetchGenRef.current) setLoading(false);
      });
  }, [route.params?.focusProviderId, pins, t, beginProgrammaticMapMove, commitPins]);

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
    setSelectedDogPark(null);
    setCollocatedChooserPins(null);
    loadPinsRef.current();
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSelectedPin(null);
        setSelectedDogPark(null);
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
      const prev = mapLatDeltaRef.current;
      const next = region.latitudeDelta;
      if (Math.abs(next - prev) / Math.max(prev, 1e-9) > 0.15) {
        mapLatDeltaRef.current = next;
        setMapLatDelta(next);
      }
      const seq = ++regionChangeSeqRef.current;
      mapDiag("region.change", {
        seq,
        lat: Number(region?.latitude)?.toFixed?.(4),
        lng: Number(region?.longitude)?.toFixed?.(4),
        dLat: Number(region?.latitudeDelta)?.toFixed?.(4),
        dLng: Number(region?.longitudeDelta)?.toFixed?.(4),
      });
      if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
      moveDebounceRef.current = setTimeout(() => {
        if (seq !== regionChangeSeqRef.current) {
          mapDiag("region.debounce.stale", { seq });
          return;
        }
        if (suppressViewportFetchRef.current) {
          mapDiag("region.debounce.suppressed-programmatic", { seq });
          return;
        }
        const r = mapRegionRef.current;
        if (!isValidMapRegion(r)) {
          mapDiag("region.debounce.invalid-region", { seq });
          return;
        }
        if (Date.now() < suppressViewportFetchAfterMarkerMsRef.current) {
          mapDiag("region.debounce.suppressed-marker-tap", { seq });
          return;
        }

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
          if (smallMove && smallZoom) {
            mapDiag("region.debounce.suppressed-small-move", { seq });
            return;
          }
        }
        lastSilentFetchRegionRef.current = {
          lat: r.latitude,
          lng: r.longitude,
          dLat: r.latitudeDelta,
          dLng: r.longitudeDelta,
        };

        mapDiag("region.debounce.fire-refetch", { seq });
        InteractionManager.runAfterInteractions(() => {
          if (seq !== regionChangeSeqRef.current) {
            mapDiag("region.refetch.stale", { seq });
            return;
          }
          if (!exploreScreenFocusedRef.current) {
            mapDiag("region.refetch.unfocused", { seq });
            return;
          }
          if (suppressViewportFetchRef.current) {
            mapDiag("region.refetch.suppressed", { seq });
            return;
          }
          if (showDogParksOnlyRef.current) {
            mapDiag("region.refetch.skipped-dog-parks-only", { seq });
            return;
          }
          setCollocatedChooserPins(null);
          loadPinsRef.current({ silent: true });
        });
      }, MAP_VIEWPORT_DEBOUNCE_MS);
    },
    [],
  );

  /* ─── Filter panel: closing applies filters to the map (same as former "Apply") ─── */
  const filterSheetTranslateY = useSharedValue(0);
  const closeFilterPanelRef = useRef<() => void>(() => {});

  const invokeFilterCloseFromGesture = useCallback(() => {
    closeFilterPanelRef.current();
  }, []);

  const closeFilterPanel = useCallback(() => {
    Keyboard.dismiss();
    setShowFilterPanel(false);
    setSelectedPin(null);
    setSelectedPlaydate(null);
    setSelectedDogPark(null);
    setCollocatedChooserPins(null);
    loadPinsRef.current();
  }, []);

  useEffect(() => {
    closeFilterPanelRef.current = closeFilterPanel;
  }, [closeFilterPanel]);

  useLayoutEffect(() => {
    if (showFilterPanel) {
      filterSheetTranslateY.value = 0;
    }
  }, [showFilterPanel, filterSheetTranslateY]);

  const filterSheetDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: filterSheetTranslateY.value }],
  }));

  const filterPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-32, 32])
        .onUpdate((e) => {
          const t = e.translationY;
          filterSheetTranslateY.value = t > 0 ? t : t * 0.2;
        })
        .onEnd((e) => {
          const y = filterSheetTranslateY.value;
          const dismiss = y > 72 || e.velocityY > 700;
          if (dismiss) {
            filterSheetTranslateY.value = withTiming(
              FILTER_SHEET_DISMISS_SLIDE_PX,
              { duration: 240 },
              (finished) => {
                if (finished) {
                  runOnJS(invokeFilterCloseFromGesture)();
                }
              },
            );
          } else {
            filterSheetTranslateY.value = withSpring(0, { damping: 22, stiffness: 280 });
          }
        }),
    [invokeFilterCloseFromGesture],
  );

  const clearFilter = useCallback(() => {
    setActiveServices(new Set());
    setFilterMinRating(null);
    setFilterMaxRate("");
    setFilterRadiusKm(null);
    setFilterDate("");
    setFilterTime("");
    setSearchText("");
    setPlaydateMode(false);
    setShowDogParksOnly(false);
    setSelectedPin(null);
    setSelectedPlaydate(null);
    setSelectedDogPark(null);
    setCollocatedChooserPins(null);
    setTimeout(() => loadPinsRef.current(), 0);
  }, []);

  /* ─── Marker press (id-based so marker row callbacks stay stable across re-renders) ─── */
  const onPressProviderMarkerId = useCallback((providerId: string) => {
    mapDiag("marker.press", { providerId });
    const pin = pinsRef.current.find((p) => p.providerId === providerId);
    if (!pin) {
      mapDiag("marker.press.miss", { providerId });
      return;
    }
    suppressViewportFetchAfterMarkerMsRef.current =
      Date.now() + MARKER_TAP_VIEWPORT_SUPPRESS_MS;
    markerJustTappedRef.current = true;
    setTimeout(() => {
      markerJustTappedRef.current = false;
    }, 300);
    setCollocatedChooserPins(null);
    setSelectedPin(pin);
  }, []);

  const openCollocatedChooser = useCallback(
    (clusterPins: MapPinDto[], clusterCoordinate: { latitude: number; longitude: number }) => {
      mapDiag("cluster.press", { count: clusterPins.length });
      suppressViewportFetchAfterMarkerMsRef.current = Date.now() + MARKER_TAP_VIEWPORT_SUPPRESS_MS;
      markerJustTappedRef.current = true;
      setTimeout(() => {
        markerJustTappedRef.current = false;
      }, 300);
      if (mapRegionRef.current.latitudeDelta > 0.1) {
        beginProgrammaticMapMove();
        mapRef.current?.animateToRegion?.(
          {
            ...clusterCoordinate,
            latitudeDelta: mapRegionRef.current.latitudeDelta / 3,
            longitudeDelta: mapRegionRef.current.longitudeDelta / 3,
          },
          500,
        );
        return;
      }
      setCollocatedChooserPins(clusterPins);
    },
    [beginProgrammaticMapMove],
  );

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
      setSelectedDogPark(null);
      setCollocatedChooserPins(null);
    }
  }, []);

  const hasBottomOverlay = Boolean(selectedPin || selectedPlaydate || selectedDogPark);
  const bottomActionOffset = hasBottomOverlay ? 132 : 16;
  const locationButtonOffset = hasBottomOverlay ? 194 : 78;
  const selectedPinCardOffset = 16;

  const openDogParkNavigation = useCallback((park: DogParkDto) => {
    const lat = park.latitude;
    const lng = park.longitude;
    const waze = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(waze).catch(() => {
      void Linking.openURL(gmaps);
    });
  }, []);

  const handleDogParkCheckIn = useCallback(
    async (park: DogParkDto) => {
      if (!isLoggedIn) {
        navigation.navigate("Login");
        return;
      }
      if (!hasPets) {
        navigation.getParent()?.navigate("MyPets");
        return;
      }
      setDogParkCheckInLoading(true);
      try {
        const dogPets = pets.filter((p) => p.species === PetSpecies.Dog);
        const petIdsForBeacon =
          dogPets.length > 0 ? dogPets.map((p) => p.id) : pets.map((p) => p.id);
        const primaryPet = dogPets[0] ?? pets[0];

        let communityOk = false;
        try {
          await communityApi.startParkCheckIn({
            placeId: park.id,
            placeName: park.name,
            latitude: park.latitude,
            longitude: park.longitude,
            petId: primaryPet?.id,
            durationMinutes: 75,
          });
          communityOk = true;
        } catch {
          /* continue to beacon */
        }

        let beaconOk = false;
        try {
          await palsApi.startBeacon({
            placeName: park.name,
            latitude: park.latitude,
            longitude: park.longitude,
            city: cityHintFromParkAddress(park.address),
            durationMinutes: 60,
            petIds: petIdsForBeacon,
            species: "DOG",
          });
          beaconOk = true;
        } catch {
          /* ignore */
        }

        if (beaconOk || communityOk) {
          showGlobalAlertCompat(
            t("dogParkCheckInSuccessTitle"),
            t("dogParkCheckInSuccessMessage"),
          );
        } else {
          showApiErrorToast(
            {
              message: t("genericErrorDesc"),
              isConnectivityError: false,
              isAuthError: false,
              isServerError: false,
            },
            { title: t("genericErrorTitle") },
          );
        }
      } finally {
        setDogParkCheckInLoading(false);
      }
    },
    [hasPets, isLoggedIn, navigation, pets, t],
  );

  /* ═════════════════════ RENDER ═════════════════════ */

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* MapView: iOS stays a direct child of the root; Android uses AndroidMapRtlIsolation (positioned View + LTR) so Google Maps keeps gestures after RTL language reload. */}
      <AndroidMapRtlIsolation>
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
          <>
            {/*
             * Fixed-radius accuracy halo — 80 m constant, never changes.
             * A constant radius means CircleWrapper never receives new props while
             * the user is stationary, eliminating the concurrent overlay+annotation
             * update that was causing crashes with the variable accuracy radius.
             */}
            <CircleWrapper
              center={userLocationCoordinate}
              radius={80}
              strokeColor="rgba(66,133,244,0.30)"
              fillColor="rgba(66,133,244,0.12)"
              strokeWidth={1.5}
            />
            {/* Blue dot — updates only when user moves ≥ 10 m (see prevUserLatRef gate) */}
            <MarkerWrapper
              coordinate={userLocationCoordinate}
              anchor={EXPLORE_USER_MARKER_ANCHOR}
              tracksViewChanges={false}
              zIndex={500}
            >
              <View style={styles.userDotOuter}>
                <View style={styles.userDotInner} />
              </View>
            </MarkerWrapper>
          </>
        )}
        {!showDogParksOnly && (
          <ExploreMapMarkers
            pool={markerPool}
            onPressProviderId={onPressProviderMarkerId}
            onPressClusterPins={openCollocatedChooser}
          />
        )}
        {/*
         * Overlay marker for the selected pin — rendered AFTER the base marker set so
         * the dark-paw annotation sits on top. Using a separate <Marker> (instead of
         * flipping a prop on the base paw) means MapKit only sees a clean
         * add / remove when selection changes, not a property update mid-gesture.
         */}
        {!showDogParksOnly && (
          <ExploreSelectedMarkerOverlay
            providerId={selectedPin?.providerId ?? null}
            latitude={selectedPin?.latitude ?? null}
            longitude={selectedPin?.longitude ?? null}
          />
        )}
        {showDogParksOnly &&
          dogParks.map((park) => (
            <MarkerWrapper
              key={park.id}
              coordinate={{ latitude: park.latitude, longitude: park.longitude }}
              tracksViewChanges={false}
              zIndex={400}
              onPress={() => {
                suppressViewportFetchAfterMarkerMsRef.current =
                  Date.now() + MARKER_TAP_VIEWPORT_SUPPRESS_MS;
                markerJustTappedRef.current = true;
                setTimeout(() => {
                  markerJustTappedRef.current = false;
                }, 300);
                setSelectedDogPark(park);
                setSelectedPin(null);
                setSelectedPlaydate(null);
                setCollocatedChooserPins(null);
              }}
            >
              <View style={styles.dogParkMarkerOuter}>
                <Ionicons name="leaf" size={16} color="#fff" />
              </View>
            </MarkerWrapper>
          ))}
        {playdateMode && !showDogParksOnly && playdatePins.map((pd) => (
          <MarkerWrapper
            key={pd.eventId}
            coordinate={{ latitude: pd.latitude, longitude: pd.longitude }}
            tracksViewChanges={false}
            onPress={() => {
              suppressViewportFetchAfterMarkerMsRef.current = Date.now() + MARKER_TAP_VIEWPORT_SUPPRESS_MS;
              setSelectedPlaydate(pd);
              setSelectedPin(null);
              setCollocatedChooserPins(null);
            }}
          >
            <View style={styles.playdateMarker}>
              <Ionicons name="paw" size={14} color="#fff" />
              <Ionicons name="calendar" size={10} color="#fff" style={{ marginLeft: 2 }} />
            </View>
          </MarkerWrapper>
        ))}
        </MapViewWrapper>
      </AndroidMapRtlIsolation>

      <SafeAreaView
        edges={["top"]}
        style={[
          { zIndex: 10, marginTop: -8 },
          Platform.OS === "android" && { elevation: 22 },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: BRAND_HEADER_HORIZONTAL_PAD,
            paddingVertical: 10,
            gap: 12,
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexShrink: 1,
              minWidth: 0,
              gap: 12,
            }}
          >
            <View
              style={{
                backgroundColor: colors.brand,
                borderRadius: 10,
                paddingHorizontal: 4,
                paddingVertical: 3,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={EXPLORE_HEADER_LOGO}
                style={{ height: 40, aspectRatio: EXPLORE_HEADER_LOGO_ASPECT }}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

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

          {locationHint === "denied" && (
            <Text
              style={{
                marginTop: 10,
                fontSize: 12,
                lineHeight: 17,
                color: colors.textSecondary,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("mapLocationDeniedHint")}
            </Text>
          )}

          {/* Active filter chips (compact summary) */}
          {playdateMode && (
            <View style={{ paddingTop: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  backgroundColor: colors.text,
                  borderRadius: 16,
                  paddingLeft: 10,
                  paddingRight: 6,
                  paddingVertical: 5,
                  gap: 4,
                }}
              >
                <Ionicons name="paw" size={12} color={colors.textInverse} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textInverse }}>
                  {t("filterPlayWithPal")}
                </Text>
                <Pressable onPress={() => setPlaydateMode(false)} hitSlop={6}>
                  <Ionicons name="close-circle" size={14} color={colors.textInverse} />
                </Pressable>
              </View>
            </View>
          )}
          {showDogParksOnly && (
            <View style={{ paddingTop: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  backgroundColor: "#16a34a",
                  borderRadius: 16,
                  paddingLeft: 10,
                  paddingRight: 6,
                  paddingVertical: 5,
                  gap: 4,
                }}
              >
                <Ionicons name="leaf" size={12} color="#fff" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
                  {t("dogParksLayerTitle")}
                </Text>
                <Pressable onPress={() => setShowDogParksOnly(false)} hitSlop={6}>
                  <Ionicons name="close-circle" size={14} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}
          {activeServices.size > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingTop: 10,
                gap: 6,
                flexDirection: rowDirectionForAppLayout(isRTL),
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

      {/* Loading — do not block touches; map/header stay usable while pins load */}
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      )}

      {/* Empty state */}
      {!loading && !showDogParksOnly && pins.length === 0 && (
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

      {showDogParksOnly && dogParks.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <View
            className="rounded-2xl px-8 py-6 items-center"
            style={[styles.emptyCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
          >
            <Ionicons name="leaf-outline" size={40} color="#16a34a" />
            <Text className="text-base font-semibold mt-3" style={{ color: colors.textSecondary, textAlign: "center" }}>
              {t("dogParksNoneAvailable")}
            </Text>
          </View>
        </View>
      )}

      {/* My Location button */}
      <Pressable
        onPress={async () => {
          // If we already have a cached position, center immediately.
          if (userLat != null && userLng != null) {
            beginProgrammaticMapMove();
            mapRef.current?.animateToRegion?.(
              { latitude: userLat, longitude: userLng, latitudeDelta: 0.015, longitudeDelta: 0.015 },
              600,
            );
            return;
          }
          // No cached position yet — request one and show a spinner.
          try {
            setLocating(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
              setLocationHint("denied");
              return;
            }
            setLocationHint("none");
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = loc.coords;
            setUserLat(latitude);
            setUserLng(longitude);
            hasAutocenteredRef.current = true;
            beginProgrammaticMapMove();
            mapRef.current?.animateToRegion?.(
              { latitude, longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 },
              600,
            );
          } catch {
            showApiErrorToast(
              {
                message: t("mapLocationErrorHint"),
                isConnectivityError: false,
                isAuthError: false,
                isServerError: false,
              },
              { title: t("genericErrorTitle") },
            );
          } finally {
            setLocating(false);
          }
        }}
        style={{
          position: "absolute",
          bottom: locationButtonOffset,
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
        {locating
          ? <ActivityIndicator size="small" color={colors.primary as string} />
          : <Ionicons name="navigate" size={22} color={userLat != null ? colors.primary as string : colors.text} />
        }
      </Pressable>

      {/* Report Lost Pet — SOS (nested tab target matches GlobalSosFab / BookingScreen) */}
      <View
        style={{
          position: "absolute",
          bottom: bottomActionOffset,
          alignSelf: isRTL ? "flex-start" : "flex-end",
          ...(isRTL ? { left: 20 } : { right: 20 }),
          zIndex: 18,
          borderRadius: 24,
          ...Platform.select({
            ios: {
              shadowColor: "#b91c1c",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
            },
            android: { elevation: 8 },
            default: {},
          }),
        }}
      >
        <Pressable
          onPress={() => {
            if (!isLoggedIn) {
              navigation.navigate("Login");
              return;
            }
            navigation.navigate("MyPets", { screen: "ReportLost" });
          }}
          accessibilityRole="button"
          accessibilityLabel={t("reportLostMapBtn")}
          style={({ pressed }) => ({
            borderRadius: 24,
            overflow: "hidden",
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <LinearGradient
            colors={["#ef4444", "#b91c1c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.28)",
            }}
          >
            <Ionicons name="alert-circle" size={22} color="#ffffff" />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#ffffff",
              }}
            >
              {t("reportLostMapBtn")}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Discover Businesses FAB */}
      <Pressable
        onPress={() => {
          const raw = mapRegionRef.current;
          const geo =
            viewportPinsSearchParamsFromRegion(raw) ??
            viewportPinsSearchParamsFromRegion(EXPLORE_MAP_INITIAL_REGION)!;
          navigation.navigate("Discover", {
            providerTypeFilter: ProviderType.Business,
            latitude: geo.latitude,
            longitude: geo.longitude,
            radiusKm: geo.radiusKm,
          });
        }}
        style={{
          position: "absolute",
          bottom: bottomActionOffset,
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
      {selectedPin && !showDogParksOnly && (
        <View
          className="absolute left-0 right-0"
          style={{ bottom: selectedPinCardOffset, zIndex: 20, paddingHorizontal: BRAND_HEADER_HORIZONTAL_PAD }}
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
                {translateServiceNamesCsv(selectedPin.services, t)}
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

      {/* Selected playdate card */}
      {selectedPlaydate && !showDogParksOnly && (
        <View
          className="absolute left-0 right-0"
          style={{ bottom: 110, zIndex: 20, paddingHorizontal: BRAND_HEADER_HORIZONTAL_PAD }}
        >
          <View
            className="p-4 rounded-xl"
            style={[styles.sitterCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: colors.primaryLight,
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Ionicons name="paw" size={13} color={colors.primary as string} />
                <Ionicons name="calendar" size={11} color={colors.primary as string} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary as string }}>
                  {t("filterPlayWithPal")}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedPlaydate(null)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }} numberOfLines={1}>
              {selectedPlaydate.title}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
              {selectedPlaydate.locationName}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              {new Date(selectedPlaydate.scheduledForUtc).toLocaleString()} · {selectedPlaydate.hostName}
            </Text>
            {selectedPlaydate.goingCount > 0 && (
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {t("goingCount").replace("{{n}}", String(selectedPlaydate.goingCount))}
              </Text>
            )}
            <Pressable
              onPress={() => {
                setSelectedPlaydate(null);
                navigation.navigate("PlaydateEventDetail", { eventId: selectedPlaydate.eventId });
              }}
              style={{
                marginTop: 12,
                backgroundColor: colors.text,
                paddingVertical: 10,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textInverse }}>
                {t("viewProfile")}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Selected dog park — bottom card (no navigation to profile) */}
      {selectedDogPark && showDogParksOnly && (
        <View
          className="absolute left-0 right-0"
          style={{ bottom: selectedPinCardOffset, zIndex: 20, paddingHorizontal: BRAND_HEADER_HORIZONTAL_PAD }}
        >
          <View
            className="p-4 rounded-xl"
            style={[styles.sitterCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
          >
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#16a34a",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="leaf" size={22} color="#fff" />
                </View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#16a34a" }}>
                  {t("dogParksLayerTitle")}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedDogPark(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
              }}
              numberOfLines={2}
            >
              {selectedDogPark.name}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 4,
                textAlign: isRTL ? "right" : "left",
              }}
              numberOfLines={3}
            >
              {selectedDogPark.address}
            </Text>
            <View
              style={{
                marginTop: 14,
                flexDirection: rowDirectionForAppLayout(isRTL),
                gap: 10,
              }}
            >
              <Pressable
                onPress={() => openDogParkNavigation(selectedDogPark)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                  {t("navigateAction")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleDogParkCheckIn(selectedDogPark)}
                disabled={dogParkCheckInLoading}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#16a34a",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 46,
                  opacity: dogParkCheckInLoading ? 0.65 : 1,
                }}
              >
                {dogParkCheckInLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                    {t("dogParkCheckInButton")}
                  </Text>
                )}
              </Pressable>
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
                flexDirection: rowDirectionForAppLayout(isRTL),
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
                const servicesDisplay = servicesLine
                  ? translateServiceNamesCsv(pin.services, t)
                  : t("mapCollocatedServicesPlaceholder");
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
                          flexDirection: rowDirectionForAppLayout(isRTL),
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
                            flexDirection: rowDirectionForAppLayout(isRTL),
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
        animationType="none"
        transparent
        onRequestClose={closeFilterPanel}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "flex-end", overflow: "hidden" }}>
            <Pressable
              style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay }]}
              onPress={closeFilterPanel}
            />
            <Reanimated.View
              style={[
                styles.filterSheet,
                filterSheetDragStyle,
                {
                  width: "100%",
                  paddingTop: 0,
                  backgroundColor: colors.surface,
                  paddingBottom: Math.max(insets.bottom, 16),
                },
              ]}
            >
              {/*
                RNGH Pan + Reanimated: follows finger reliably inside Modal (RN PanResponder often does not).
                Top chrome is the drag target; padding lives here so the sheet edge is draggable.
              */}
              <GestureDetector gesture={filterPanGesture}>
                <View collapsable={false} style={{ paddingTop: 12, paddingBottom: 4 }}>
                  <View
                    style={{
                      width: 56,
                      height: 5,
                      backgroundColor: colors.border,
                      borderRadius: 3,
                      alignSelf: "center",
                      marginBottom: 14,
                    }}
                  />
                  <View
                    style={{
                      flexDirection: rowDirectionForAppLayout(isRTL),
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                      minHeight: 44,
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
                    <Pressable onPress={clearFilter} hitSlop={10}>
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
                </View>
              </GestureDetector>

            <ScrollView
              style={{ maxHeight: filterSheetScrollMaxHeight }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 20, paddingBottom: 28 }}
            >
              {/* ── Play with a Pal toggle ── */}
              <View>
                <Pressable
                  onPress={() => {
                    setShowDogParksOnly(false);
                    setPlaydateMode((prev) => !prev);
                  }}
                  style={{
                    flexDirection: rowDirectionForAppLayout(isRTL),
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: playdateMode ? colors.text : colors.surfaceSecondary,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: playdateMode ? colors.text : colors.border,
                  }}
                >
                  <Ionicons name="paw" size={16} color={playdateMode ? colors.textInverse : colors.textSecondary} />
                  <Ionicons name="calendar" size={14} color={playdateMode ? colors.textInverse : colors.textSecondary} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: playdateMode ? colors.textInverse : colors.textSecondary, flex: 1 }}>
                    {t("filterPlayWithPal")}
                  </Text>
                  {playdateMode && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.textInverse} />
                  )}
                </Pressable>
              </View>

              {/* ── Dog parks map layer ── */}
              <View>
                <Pressable
                  onPress={() => {
                    setPlaydateMode(false);
                    setShowDogParksOnly((prev) => !prev);
                  }}
                  style={{
                    flexDirection: rowDirectionForAppLayout(isRTL),
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: showDogParksOnly ? "#16a34a" : colors.surfaceSecondary,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: showDogParksOnly ? "#16a34a" : colors.border,
                  }}
                >
                  <Ionicons name="leaf" size={18} color={showDogParksOnly ? "#fff" : "#16a34a"} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: showDogParksOnly ? "#fff" : colors.textSecondary,
                      flex: 1,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {t("dogParksLayerTitle")}
                  </Text>
                  {showDogParksOnly && <Ionicons name="checkmark-circle" size={16} color="#fff" />}
                </Pressable>
              </View>

              {/* ── Service type (multi-select) ── */}
              <View>
                {serviceTypesError && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginBottom: 10,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {t("serviceTypesUnavailable")}
                  </Text>
                )}
                <Text style={filterLabel(isRTL, colors)}>
                  {t("filterByService")}
                </Text>
                <View
                  style={{
                    flexDirection: rowDirectionForAppLayout(isRTL),
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
                    flexDirection: rowDirectionForAppLayout(isRTL),
                    flexWrap: "wrap",
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
                    flexDirection: rowDirectionForAppLayout(isRTL),
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {DISTANCE_OPTIONS.map((opt) => {
                    const isActive =
                      opt.value === filterRadiusKm ||
                      (opt.value === null && filterRadiusKm === null);
                    const label = t(opt.labelKey);
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
                    flexDirection: rowDirectionForAppLayout(isRTL),
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
            </Reanimated.View>
          </View>
        </GestureHandlerRootView>
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
  /** Android: subtree layout direction for Google Maps only (see AndroidMapRtlIsolation). */
  androidMapLtrShell: {
    direction: "ltr",
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
    pointerEvents: "none",
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
  playdateMarker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  /** Dog park pin — no shadow* (same MapKit snapshot caveat as `playdateMarker` / user dot). */
  dogParkMarkerOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  /**
   * IMPORTANT: No shadow* props here. On iOS with tracksViewChanges={false}
   * (which this <Marker> uses), the native bitmap snapshot is captured from
   * the CALayer ONCE and then reused for every render. CoreAnimation shadows
   * live outside the snapshotted bounds, so when the snapshot is captured
   * during an unlucky frame the result is effectively empty — and MapKit
   * falls back to rendering its default red balloon pin at that coordinate.
   * This is the "weird red pin" that appeared in the bug screenshot.
   * A border ring gives the same visual prominence without leaving the
   * snapshot rect, so the dot always rasterizes correctly.
   */
  userDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  userDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4285F4",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
});
