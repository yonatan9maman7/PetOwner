import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  CommonActions,
} from "@react-navigation/native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import {
  MapViewWrapper,
  MarkerWrapper,
} from "../../components/MapViewWrapper";
import { AddressAutocomplete } from "../../components/shared/AddressAutocomplete";
import { fetchReverseGeocode } from "../../api/googlePlaces";
import { useAuthStore } from "../../store/authStore";
import { usePetsStore } from "../../store/petsStore";
import { filesApi } from "../../api/client";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { PetSpecies } from "../../types/api";
import type { PetDto } from "../../types/api";
import { getSpeciesEmoji } from "./MyPets/constants";

const TEL_AVIV = {
  latitude: 32.0853,
  longitude: 34.7818,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

function RequiredMark({ color }: { color: string }) {
  return <Text style={{ color, fontWeight: "700" }}> *</Text>;
}

function FieldLabel({
  text,
  required,
  isRTL,
}: {
  text: string;
  required?: boolean;
  isRTL: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: 14,
        fontWeight: "700",
        color: colors.textSecondary,
        textAlign: isRTL ? "right" : "left",
        writingDirection: isRTL ? "rtl" : "ltr",
        marginBottom: 6,
      }}
    >
      {text}
      {required && <RequiredMark color={colors.danger} />}
    </Text>
  );
}

export function ReportLostScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL, rtlText, rtlInput } = useTranslation();
  const { colors } = useTheme();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const pets = usePetsStore((s) => s.pets);
  const loading = usePetsStore((s) => s.loading);
  const fetchPets = usePetsStore((s) => s.fetchPets);
  const reportLost = usePetsStore((s) => s.reportLost);
  const mapRef = useRef<any>(null);

  const goBackToMyPets = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "MyPetsMain" }],
      }),
    );
  }, [navigation]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSeenLocation, setLastSeenLocation] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [markerCoord, setMarkerCoord] = useState({
    latitude: TEL_AVIV.latitude,
    longitude: TEL_AVIV.longitude,
  });
  const [mapRegion, setMapRegion] = useState(TEL_AVIV);
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoggedIn) fetchPets();
  }, [isLoggedIn, fetchPets]);

  useEffect(() => {
    (async () => {
      setLocLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          const coord = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setMarkerCoord(coord);
          setMapRegion({ ...coord, latitudeDelta: 0.02, longitudeDelta: 0.02 });
        }
      } catch {
        /* keep default */
      } finally {
        setLocLoading(false);
      }
    })();
  }, []);

  const handleAddressSelect = useCallback(
    (selection: {
      formattedAddress: string;
      latitude: number;
      longitude: number;
    }) => {
      setLastSeenLocation(selection.formattedAddress);
      setMarkerCoord({
        latitude: selection.latitude,
        longitude: selection.longitude,
      });
      const newRegion = {
        latitude: selection.latitude,
        longitude: selection.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      setMapRegion(newRegion);
      mapRef.current?.animateToRegion?.(newRegion, 400);
    },
    [],
  );

  const handleMapPress = useCallback((e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate ?? {};
    if (latitude != null && longitude != null) {
      setMarkerCoord({ latitude, longitude });
      fetchReverseGeocode({ latitude, longitude }).then((result) => {
        if (result?.formattedAddress) {
          setLastSeenLocation(result.formattedAddress);
        }
      });
    }
  }, []);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const handleSubmit = async () => {
    if (!selectedId) {
      Alert.alert(t("errorTitle"), t("reportLostSelectPet"));
      return;
    }
    const locText = lastSeenLocation.trim();
    const phone = contactPhone.trim();
    if (!locText || !phone) {
      Alert.alert(t("errorTitle"), t("fillAllFields"));
      return;
    }
    setSubmitting(true);
    try {
      let uploadedImageUrl: string | undefined;
      if (imageUri) {
        try {
          const res = await filesApi.uploadImage(imageUri, "sos");
          uploadedImageUrl = res.url;
        } catch {
          Alert.alert(t("errorTitle"), "Failed to upload image");
          setSubmitting(false);
          return;
        }
      }
      await reportLost(selectedId, {
        lastSeenLocation: locText,
        lastSeenLat: markerCoord.latitude,
        lastSeenLng: markerCoord.longitude,
        contactPhone: phone,
        description: description.trim() || undefined,
        imageUrl: uploadedImageUrl,
      });
      const err = usePetsStore.getState().error;
      if (err) {
        Alert.alert(t("errorTitle"), err);
        return;
      }
      Alert.alert("", t("reportSubmitted"), [
        { text: "OK", onPress: goBackToMyPets },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Not logged in guard ── */
  if (!isLoggedIn) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }}
        edges={["top"]}
      >
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 14,
            backgroundColor: colors.surface,
          }}
        >
          <Pressable onPress={goBackToMyPets} hitSlop={12}>
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={colors.text}
            />
          </Pressable>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <Ionicons name="lock-closed-outline" size={48} color={colors.text} />
          <Text
            style={{
              ...rtlText,
              marginTop: 16,
              textAlign: "center",
              fontSize: 16,
              color: colors.textSecondary,
            }}
          >
            {t("reportLostNeedLogin")}
          </Text>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={{
              marginTop: 32,
              height: 56,
              borderRadius: 16,
              paddingHorizontal: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.primary,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              {t("loginButton")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const selectable = pets.filter((p) => !p.isLost);

  /* ── Main form ── */
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            paddingHorizontal: 20,
            height: 56,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 4,
            zIndex: 10,
          }}
        >
          <Pressable onPress={goBackToMyPets} hitSlop={12}>
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={colors.text}
            />
          </Pressable>
          <Text
            style={{
              flex: 1,
              marginHorizontal: 12,
              fontSize: 18,
              fontWeight: "800",
              color: colors.text,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("reportLostScreenTitle")}
          </Text>
        </View>

        {loading && pets.length === 0 ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Pet selector ── */}
            <FieldLabel
              text={t("reportLostSelectPet")}
              required
              isRTL={isRTL}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 10,
                flexDirection: rowDirectionForAppLayout(isRTL),
                paddingBottom: 8,
              }}
            >
              {pets.map((pet: PetDto) => {
                const disabled = pet.isLost;
                const sel = pet.id === selectedId;
                return (
                  <Pressable
                    key={pet.id}
                    disabled={disabled}
                    onPress={() => setSelectedId(pet.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 16,
                      backgroundColor: disabled
                        ? colors.border
                        : sel
                          ? colors.primary
                          : colors.surface,
                      borderWidth: 1,
                      borderColor: sel ? colors.primary : colors.border,
                      opacity: disabled ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>
                      {getSpeciesEmoji(pet.species)}
                    </Text>
                    <Text
                      style={{
                        marginTop: 4,
                        fontWeight: "700",
                        fontSize: 13,
                        color: disabled ? colors.textSecondary : sel ? "#fff" : colors.text,
                      }}
                      numberOfLines={1}
                    >
                      {pet.name}
                    </Text>
                    {disabled && (
                      <Text
                        style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}
                      >
                        {t("petAlreadyLost")}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {selectable.length === 0 && pets.length > 0 && (
              <Text style={[rtlText, { color: "#b45309", marginBottom: 16 }]}>
                {t("petAlreadyLost")}
              </Text>
            )}

            {/* ── Location search + map ── */}
            <View style={{ marginTop: 8 }}>
              <AddressAutocomplete
                label={t("lastSeenLocation")}
                required
                value={lastSeenLocation}
                onChangeText={setLastSeenLocation}
                onSelect={handleAddressSelect}
                placeholder={t("lastSeenLocationPlaceholder")}
                isRTL={isRTL}
                type="geocode"
              />
            </View>

            {/* Map */}
            <Text
              style={{
                ...rtlText,
                marginTop: 12,
                marginBottom: 6,
                fontSize: 12,
                color: colors.textSecondary,
              }}
            >
              {t("tapMapToMark")}
            </Text>
            <View
              style={{
                height: 220,
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {locLoading ? (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.surfaceSecondary,
                  }}
                >
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <MapViewWrapper
                  ref={mapRef}
                  style={{ flex: 1 }}
                  region={mapRegion}
                  onRegionChangeComplete={setMapRegion}
                  onPress={handleMapPress}
                  fallbackLabel={t("lastSeenLocation")}
                >
                  <MarkerWrapper coordinate={markerCoord} pinColor="#dc2626" />
                </MapViewWrapper>
              )}
            </View>
            <Text
              style={{
                ...rtlText,
                fontSize: 11,
                color: colors.textMuted,
                marginTop: 4,
              }}
            >
              {markerCoord.latitude.toFixed(4)},{" "}
              {markerCoord.longitude.toFixed(4)}
            </Text>

            {/* ── Contact phone ── */}
            <View style={{ marginTop: 20 }}>
              <FieldLabel
                text={t("contactPhoneLabel")}
                required
                isRTL={isRTL}
              />
            </View>
            <TextInput
              style={[
                rtlInput,
                {
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  fontSize: 16,
                  color: colors.text,
                },
              ]}
              placeholder={t("contactPhonePlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />

            {/* ── Description (optional) ── */}
            <View style={{ marginTop: 20 }}>
              <FieldLabel
                text={t("reportLostDescription")}
                isRTL={isRTL}
              />
            </View>
            <TextInput
              style={[
                rtlInput,
                {
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  fontSize: 15,
                  color: colors.text,
                  minHeight: 90,
                  textAlignVertical: "top",
                },
              ]}
              placeholder={t("reportLostDescriptionPlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* ── Photo (optional) ── */}
            <View style={{ marginTop: 20 }}>
              <FieldLabel text={t("reportLostPhoto")} isRTL={isRTL} />
            </View>
            {imageUri ? (
              <View
                style={{
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: 100, height: 100, borderRadius: 14 }}
                />
                <Pressable
                  onPress={() => setImageUri(null)}
                  style={{
                    flexDirection: rowDirectionForAppLayout(isRTL),
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons name="close-circle" size={22} color="#ef4444" />
                  <Text style={{ color: "#ef4444", fontWeight: "600" }}>
                    {t("cancel")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickImage}
                style={{
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderStyle: "dashed",
                  paddingVertical: 20,
                  justifyContent: "center",
                }}
              >
                <Ionicons name="camera-outline" size={24} color={colors.text} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                  {t("reportLostPhoto")}
                </Text>
              </Pressable>
            )}

            {/* ── Submit ── */}
            <Pressable
              onPress={handleSubmit}
              disabled={
                submitting ||
                !selectedId ||
                selectable.length === 0 ||
                !lastSeenLocation.trim() ||
                !contactPhone.trim()
              }
              style={{
                marginTop: 28,
                backgroundColor:
                  submitting ||
                  !selectedId ||
                  selectable.length === 0 ||
                  !lastSeenLocation.trim() ||
                  !contactPhone.trim()
                    ? colors.textMuted
                    : "#dc2626",
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "800",
                    fontSize: 16,
                  }}
                >
                  {t("reportLostSubmit")}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
