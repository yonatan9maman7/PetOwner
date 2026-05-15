import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import type { Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MapViewWrapper, MarkerWrapper } from "../../components/MapViewWrapper";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { DEFAULT_LAT, DEFAULT_LNG } from "./constants";
import {
  AddressAutocomplete,
  type AddressAutocompleteSelection,
} from "../../components/shared/AddressAutocomplete";
import { fetchReverseGeocode, type PlaceDetails } from "../../api/googlePlaces";

interface AddressData {
  lat: number;
  lng: number;
  city: string;
  street: string;
  building: string;
  apartment: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: AddressData) => void;
  initial: AddressData;
}

const REGION_DELTA = { latitudeDelta: 0.012, longitudeDelta: 0.012 };
const PROGRAMMATIC_MAP_SUPPRESS_MS = 720;
const OPEN_MAP_SUPPRESS_MS = 750;
const REVERSE_GEO_DEBOUNCE_MS = 380;

function applyDetailsToForm(
  result: PlaceDetails,
  setters: {
    setCity: (v: string) => void;
    setStreet: (v: string) => void;
    setBuilding: (v: string) => void;
    setSearchText: (v: string) => void;
  },
) {
  const { setCity, setStreet, setBuilding, setSearchText } = setters;
  setCity(result.components.city ?? "");
  setStreet(result.components.street ?? "");
  setBuilding(result.components.streetNumber ?? "");
  if (result.formattedAddress) setSearchText(result.formattedAddress);
}

export function AddressMapModal({ visible, onClose, onConfirm, initial }: Props) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const addressSnapshotRef = useRef({
    lat: initial.lat || DEFAULT_LAT,
    lng: initial.lng || DEFAULT_LNG,
    city: initial.city,
    street: initial.street,
    building: initial.building,
    apartment: initial.apartment,
  });

  const [mapRemountKey, setMapRemountKey] = useState(0);
  const [mapBootRegion, setMapBootRegion] = useState({
    latitude: initial.lat || DEFAULT_LAT,
    longitude: initial.lng || DEFAULT_LNG,
    ...REGION_DELTA,
  });
  const [lat, setLat] = useState(initial.lat || DEFAULT_LAT);
  const [lng, setLng] = useState(initial.lng || DEFAULT_LNG);
  const [city, setCity] = useState(initial.city);
  const [street, setStreet] = useState(initial.street);
  const [building, setBuilding] = useState(initial.building);
  const [apartment, setApartment] = useState(initial.apartment);
  const [searchText, setSearchText] = useState(
    [initial.street, initial.building].filter(Boolean).join(" ").trim(),
  );
  const [resolvingLocation, setResolvingLocation] = useState(false);

  const skipRegionSyncUntilRef = useRef(0);
  const ignoreRegionEventsUntilRef = useRef(0);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);

  const placesLanguage = isRTL ? "he" : "en";

  useEffect(() => {
    if (visible) {
      const lat0 = initial.lat || DEFAULT_LAT;
      const lng0 = initial.lng || DEFAULT_LNG;
      addressSnapshotRef.current = {
        lat: lat0,
        lng: lng0,
        city: initial.city,
        street: initial.street,
        building: initial.building,
        apartment: initial.apartment,
      };
      setLat(lat0);
      setLng(lng0);
      setCity(initial.city);
      setStreet(initial.street);
      setBuilding(initial.building);
      setApartment(initial.apartment);
      setSearchText(
        [initial.street, initial.building, initial.city]
          .filter(Boolean)
          .join(" ")
          .trim(),
      );
      setMapBootRegion({
        latitude: lat0,
        longitude: lng0,
        ...REGION_DELTA,
      });
      ignoreRegionEventsUntilRef.current = Date.now() + OPEN_MAP_SUPPRESS_MS;
      setMapRemountKey((k) => k + 1);
    }
  }, [visible, initial.lat, initial.lng, initial.city, initial.street, initial.building, initial.apartment]);

  useEffect(() => {
    return () => {
      if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
      geocodeAbortRef.current?.abort();
    };
  }, []);

  const beginProgrammaticMapMove = useCallback(() => {
    skipRegionSyncUntilRef.current = Date.now() + PROGRAMMATIC_MAP_SUPPRESS_MS;
  }, []);

  const scheduleReverseGeocode = useCallback(
    (targetLat: number, targetLng: number) => {
      geocodeAbortRef.current?.abort();
      geocodeDebounceRef.current && clearTimeout(geocodeDebounceRef.current);
      const controller = new AbortController();
      geocodeAbortRef.current = controller;
      setResolvingLocation(true);
      geocodeDebounceRef.current = setTimeout(async () => {
        try {
          const result = await fetchReverseGeocode({
            latitude: targetLat,
            longitude: targetLng,
            language: placesLanguage,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          if (result) {
            applyDetailsToForm(result, { setCity, setStreet, setBuilding, setSearchText });
          }
        } finally {
          if (!controller.signal.aborted) {
            setResolvingLocation(false);
          }
        }
      }, REVERSE_GEO_DEBOUNCE_MS);
    },
    [placesLanguage],
  );

  const handleAddressSearchClear = useCallback(() => {
    const s = addressSnapshotRef.current;
    setLat(s.lat);
    setLng(s.lng);
    setCity(s.city);
    setStreet(s.street);
    setBuilding(s.building);
    setApartment(s.apartment);
    beginProgrammaticMapMove();
    mapRef.current?.animateToRegion?.({ latitude: s.lat, longitude: s.lng, ...REGION_DELTA }, 400);
  }, [beginProgrammaticMapMove]);

  const applyPlace = useCallback(
    (selection: AddressAutocompleteSelection) => {
      setLat(selection.latitude);
      setLng(selection.longitude);
      setCity(selection.components.city ?? "");
      setStreet(selection.components.street ?? "");
      setBuilding(selection.components.streetNumber ?? "");
      if (selection.formattedAddress) {
        setSearchText(selection.formattedAddress);
      }
      beginProgrammaticMapMove();
      mapRef.current?.animateToRegion?.(
        {
          latitude: selection.latitude,
          longitude: selection.longitude,
          ...REGION_DELTA,
        },
        450,
      );
    },
    [beginProgrammaticMapMove],
  );

  const handleMapPress = useCallback(
    (e: any) => {
      const coord = e.nativeEvent?.coordinate;
      if (!coord) return;
      if (Date.now() < ignoreRegionEventsUntilRef.current) return;
      setLat(coord.latitude);
      setLng(coord.longitude);
      scheduleReverseGeocode(coord.latitude, coord.longitude);
    },
    [scheduleReverseGeocode],
  );

  const handleMarkerDragEnd = useCallback(
    (e: any) => {
      const coord = e.nativeEvent?.coordinate;
      if (!coord) return;
      setLat(coord.latitude);
      setLng(coord.longitude);
      scheduleReverseGeocode(coord.latitude, coord.longitude);
    },
    [scheduleReverseGeocode],
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      if (Date.now() < ignoreRegionEventsUntilRef.current) return;
      if (Date.now() < skipRegionSyncUntilRef.current) return;
      const nextLat = region.latitude;
      const nextLng = region.longitude;
      setLat(nextLat);
      setLng(nextLng);
      scheduleReverseGeocode(nextLat, nextLng);
    },
    [scheduleReverseGeocode],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View
            style={{
              paddingTop: Math.max((insets.top || 12) - 8, 0),
              backgroundColor: colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Pressable onPress={onClose} hitSlop={12} style={{ padding: 4 }}>
                <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={20} color={colors.text} />
              </Pressable>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" }}>
                {t("editAddress")}
              </Text>
              <View style={{ width: 36 }} />
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ height: 200 }}>
              <MapViewWrapper
                key={mapRemountKey}
                ref={mapRef}
                style={{ flex: 1 }}
                initialRegion={mapBootRegion}
                showsCompass={false}
                rotateEnabled={false}
                pitchEnabled={false}
                onPress={handleMapPress}
                onRegionChangeComplete={handleRegionChangeComplete}
                {...(Platform.OS === "android" && { mapType: "standard" })}
              >
                <MarkerWrapper
                  coordinate={{ latitude: lat, longitude: lng }}
                  pinColor={colors.primary}
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                  tracksViewChanges={false}
                />
              </MapViewWrapper>
              {resolvingLocation ? (
                <View style={styles.mapLoadingOverlay} pointerEvents="none">
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null}
            </View>

            <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", paddingVertical: 8 }}>
              {t("tapToPickLocation")}
            </Text>

            <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 4 }}>
              <AddressAutocomplete
                label={t("searchAddress")}
                required
                value={searchText}
                onChangeText={setSearchText}
                onSelect={applyPlace}
                onClear={handleAddressSearchClear}
                placeholder={t("searchAddressPlaceholder")}
                isRTL={isRTL}
                language={placesLanguage}
                type="address"
                closeOnBlur={false}
              />
              <Field label={t("addressCity")} required value={city} onChangeText={setCity} isRTL={isRTL} />
              <Field label={t("addressStreet")} required value={street} onChangeText={setStreet} isRTL={isRTL} />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={t("addressBuilding")}
                    required
                    value={building}
                    onChangeText={setBuilding}
                    isRTL={isRTL}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label={t("addressApartment")} value={apartment} onChangeText={setApartment} isRTL={isRTL} />
                </View>
              </View>
            </View>

            <View style={{ paddingHorizontal: 20, marginTop: 24, paddingBottom: Math.max(insets.bottom, 20) }}>
              <Pressable
                onPress={() => onConfirm({ lat, lng, city, street, building, apartment })}
                style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                  {t("confirmLocation")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
});

function Field({
  label,
  value,
  onChangeText,
  isRTL,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  isRTL: boolean;
  required?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4, textAlign: isRTL ? "right" : "left" }}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
          textAlign: isRTL ? "right" : "left",
        }}
      />
    </View>
  );
}
