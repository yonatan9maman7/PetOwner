import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MapViewWrapper, MarkerWrapper } from "../../components/MapViewWrapper";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { DEFAULT_LAT, DEFAULT_LNG } from "./constants";
import { CityAutocompleteInput } from "../../components/shared/CityAutocompleteInput";

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

export function AddressMapModal({ visible, onClose, onConfirm, initial }: Props) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);

  const [lat, setLat] = useState(initial.lat || DEFAULT_LAT);
  const [lng, setLng] = useState(initial.lng || DEFAULT_LNG);
  const [city, setCity] = useState(initial.city);
  const [street, setStreet] = useState(initial.street);
  const [building, setBuilding] = useState(initial.building);
  const [apartment, setApartment] = useState(initial.apartment);

  useEffect(() => {
    if (visible) {
      setLat(initial.lat || DEFAULT_LAT);
      setLng(initial.lng || DEFAULT_LNG);
      setCity(initial.city);
      setStreet(initial.street);
      setBuilding(initial.building);
      setApartment(initial.apartment);
    }
  }, [visible, initial.lat, initial.lng, initial.city, initial.street, initial.building, initial.apartment]);

  const handleMapPress = async (e: any) => {
    const { latitude: newLat, longitude: newLng } = e.nativeEvent.coordinate;
    setLat(newLat);
    setLng(newLng);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": isRTL ? "he" : "en" } },
      );
      const data = await resp.json();
      if (data?.address) {
        setCity(data.address.city || data.address.town || data.address.village || city);
        setStreet(data.address.road || street);
        setBuilding(data.address.house_number || building);
      }
    } catch {
      /* best-effort */
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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
              flexDirection: isRTL ? "row-reverse" : "row",
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
              ref={mapRef}
              style={{ flex: 1 }}
              region={{ latitude: lat, longitude: lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
              onPress={handleMapPress}
            >
              <MarkerWrapper coordinate={{ latitude: lat, longitude: lng }} pinColor={colors.primary} />
            </MapViewWrapper>
          </View>

          <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", paddingVertical: 8 }}>
            {t("tapToPickLocation")}
          </Text>

          <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 4 }}>
            <CityAutocompleteInput
              label={t("addressCity")}
              value={city}
              onChangeText={setCity}
              onCitySelect={(cityName, newLat, newLng) => {
                setCity(cityName);
                setLat(newLat);
                setLng(newLng);
              }}
              isRTL={isRTL}
            />
            <Field label={t("addressStreet")} value={street} onChangeText={setStreet} isRTL={isRTL} />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label={t("addressBuilding")} value={building} onChangeText={setBuilding} isRTL={isRTL} />
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
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  isRTL,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  isRTL: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4, textAlign: isRTL ? "right" : "left" }}>
        {label}
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
