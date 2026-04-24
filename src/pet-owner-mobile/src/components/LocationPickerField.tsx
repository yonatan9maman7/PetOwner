import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  AddressAutocomplete,
  type AddressAutocompleteSelection,
} from "./shared/AddressAutocomplete";
import { MapViewWrapper, MarkerWrapper } from "./MapViewWrapper";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation, rowDirectionForAppLayout } from "../i18n";

export interface LocationValue {
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
}

export interface LocationPickerFieldProps {
  value: LocationValue | null;
  onChange: (v: LocationValue) => void;
  isRTL?: boolean;
}

const DEFAULT_REGION = {
  latitude: 32.0853,
  longitude: 34.7818,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function LocationPickerField({
  value,
  onChange,
  isRTL,
}: LocationPickerFieldProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const display = value?.name ?? "";
  const subtitle =
    value
      ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}${value.city ? ` · ${value.city}` : ""}`
      : null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            backgroundColor: colors.surfaceTertiary,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="location-outline" size={18} color={colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              color: display ? colors.text : colors.textMuted,
              textAlign: isRTL ? "right" : "left",
            }}
            numberOfLines={1}
          >
            {display || t("pickLocation")}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: 11,
                color: colors.textMuted,
                marginTop: 2,
                textAlign: isRTL ? "right" : "left",
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>

      <LocationPickerModal
        initialValue={value}
        onConfirm={(v) => {
          onChange(v);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
        visible={open}
        isRTL={isRTL}
      />
    </>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  visible: boolean;
  initialValue: LocationValue | null;
  onConfirm: (v: LocationValue) => void;
  onCancel: () => void;
  isRTL?: boolean;
}

function LocationPickerModal({
  visible,
  initialValue,
  onConfirm,
  onCancel,
  isRTL,
}: ModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const mapRef = useRef<any>(null);

  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(
    initialValue ? { latitude: initialValue.latitude, longitude: initialValue.longitude } : null,
  );
  const [locationName, setLocationName] = useState(initialValue?.name ?? "");
  const [searchText, setSearchText] = useState(initialValue?.name ?? "");
  const [city, setCity] = useState(initialValue?.city ?? "");
  const [locating, setLocating] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPin(
      initialValue
        ? { latitude: initialValue.latitude, longitude: initialValue.longitude }
        : null,
    );
    setLocationName(initialValue?.name ?? "");
    setSearchText(initialValue?.name ?? "");
    setCity(initialValue?.city ?? "");
  }, [initialValue, visible]);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      if (Platform.OS === "web") return;
      try {
        setReverseGeocoding(true);
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (results.length > 0) {
          const r = results[0];
          const parts = [r.name, r.street, r.district, r.subregion].filter(Boolean);
          const autoName = parts.slice(0, 2).join(", ") || r.city || "";
          setCity(r.city ?? r.subregion ?? "");
          if (!locationName || locationName === autoName) {
            setLocationName(autoName);
            setSearchText(autoName);
          }
        }
      } catch {
        // Reverse geocoding is best-effort; don't block the user
      } finally {
        setReverseGeocoding(false);
      }
    },
    [locationName],
  );

  const handleMapPress = useCallback(
    (e: any) => {
      const coord = e.nativeEvent?.coordinate;
      if (!coord) return;
      setPin(coord);
      reverseGeocode(coord.latitude, coord.longitude);
    },
    [reverseGeocode],
  );

  const handleDragEnd = useCallback(
    (e: any) => {
      const coord = e.nativeEvent?.coordinate;
      if (!coord) return;
      setPin(coord);
      reverseGeocode(coord.latitude, coord.longitude);
    },
    [reverseGeocode],
  );

  const handleUseMyLocation = useCallback(async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coord = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setPin(coord);
      mapRef.current?.animateToRegion?.({ ...coord, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 600);
      await reverseGeocode(coord.latitude, coord.longitude);
    } catch {
      // Permission denied or GPS unavailable — user keeps the existing pin
    } finally {
      setLocating(false);
    }
  }, [reverseGeocode]);

  const handleAddressSelect = useCallback(
    (selection: AddressAutocompleteSelection) => {
      const coord = {
        latitude: selection.latitude,
        longitude: selection.longitude,
      };
      const name = selection.formattedAddress || selection.mainText;
      setPin(coord);
      setLocationName(name);
      setSearchText(name);
      setCity(selection.components.city ?? "");
      mapRef.current?.animateToRegion?.(
        { ...coord, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        500,
      );
    },
    [],
  );

  const canConfirm = pin != null && locationName.trim().length > 0;

  const initialRegion = pin
    ? { latitude: pin.latitude, longitude: pin.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : DEFAULT_REGION;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              flexDirection: rowDirectionForAppLayout(isRTL),
              borderBottomColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Pressable onPress={onCancel} hitSlop={10} style={styles.headerBtn}>
            <Text style={{ fontSize: 15, color: "#ef4444", fontWeight: "600" }}>{t("cancel")}</Text>
          </Pressable>

          <Text
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              textAlign: "center",
            }}
          >
            {t("pickLocation")}
          </Text>

          <Pressable
            onPress={() => {
              if (!canConfirm || !pin) return;
              onConfirm({ name: locationName.trim(), latitude: pin.latitude, longitude: pin.longitude, city: city || undefined });
            }}
            disabled={!canConfirm}
            hitSlop={10}
            style={styles.headerBtn}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: canConfirm ? "#007AFF" : colors.textMuted,
              }}
            >
              {t("confirmLocation")}
            </Text>
          </Pressable>
        </View>

        {/* Address search */}
        <View
          style={[
            styles.searchRow,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <AddressAutocomplete
            value={searchText}
            onChangeText={setSearchText}
            onSelect={handleAddressSelect}
            placeholder={t("searchAddressPlaceholder")}
            isRTL={isRTL}
            type="geocode"
            maxResultsHeight={220}
          />
        </View>

        {/* Location name input */}
        <View
          style={[
            styles.nameRow,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          {reverseGeocoding && (
            <ActivityIndicator size="small" color={colors.primary as string} style={{ marginRight: 8 }} />
          )}
          <TextInput
            style={[styles.nameInput, { color: colors.text }]}
            value={locationName}
            onChangeText={setLocationName}
            placeholder={t("pickLocationHint")}
            placeholderTextColor={colors.textMuted}
            textAlign={isRTL ? "right" : "left"}
          />
        </View>

        {/* Map */}
        <View style={{ flex: 1 }}>
          <MapViewWrapper
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialRegion}
            fallbackLabel="Location Picker"
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            pitchEnabled={false}
            onPress={handleMapPress}
            {...(Platform.OS === "android" && { mapType: "standard" })}
          >
            {pin && (
              <MarkerWrapper
                coordinate={pin}
                draggable
                onDragEnd={handleDragEnd}
                tracksViewChanges={false}
              />
            )}
          </MapViewWrapper>

          {!pin && (
            <View
              pointerEvents="none"
              style={[styles.hintOverlay, { backgroundColor: "rgba(0,0,0,0.35)" }]}
            >
              <Text style={styles.hintText}>{t("pickLocationHint")}</Text>
            </View>
          )}

          {/* Use my location FAB */}
          <Pressable
            onPress={handleUseMyLocation}
            style={[
              styles.fab,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.shadow,
                ...(isRTL ? { left: 20 } : { right: 20 }),
              },
            ]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary as string} />
            ) : (
              <Ionicons name="navigate" size={22} color={colors.primary as string} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerBtn: {
    minWidth: 60,
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  hintOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  hintText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
