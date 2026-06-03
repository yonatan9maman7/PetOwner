import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
  Platform,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  CommonActions,
} from "@react-navigation/native";
import * as Location from "expo-location";
import {
  MapViewWrapper,
  MarkerWrapper,
} from "../../components/MapViewWrapper";
import { AddressAutocomplete } from "../../components/shared/AddressAutocomplete";
import { fetchReverseGeocode } from "../../api/googlePlaces";
import { useAuthStore } from "../../store/authStore";
import { buildFoundPetPostContent } from "../../utils/sosPostContent";
import { filesApi, postsApi } from "../../api/client";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { navigateToLoginClearingStack } from "../../navigation/navigateToLoginClearingStack";
import { rootNavigate } from "../../navigation/rootNavigation";
import { pickImageWithSource } from "../../utils/imagePicker";
import { useKeyboardAvoidingState } from "../../hooks/useKeyboardAvoidingState";

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

export function ReportFoundScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL, rtlText, rtlInput } = useTranslation();
  const { colors } = useTheme();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const language = useAuthStore((s) => s.language);
  const mapRef = useRef<any>(null);
  const initialCoordsRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );

  const goBackToMyPets = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "MyPetsMain" }],
      }),
    );
  }, [navigation]);

  const goToCommunity = useCallback(() => {
    rootNavigate("Community");
  }, []);

  const [foundLocation, setFoundLocation] = useState("");
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
  const { behavior: keyboardAvoidBehavior } = useKeyboardAvoidingState();

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
          initialCoordsRef.current = coord;
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
      setFoundLocation(selection.formattedAddress);
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
          setFoundLocation(result.formattedAddress);
        }
      });
    }
  }, []);

  const handleAddressSearchClear = useCallback(() => {
    const base = initialCoordsRef.current ?? {
      latitude: TEL_AVIV.latitude,
      longitude: TEL_AVIV.longitude,
    };
    setMarkerCoord(base);
    const nextRegion = {
      ...base,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    setMapRegion(nextRegion);
    mapRef.current?.animateToRegion?.(nextRegion, 400);
  }, []);

  const pickImage = useCallback(async () => {
    const uri = await pickImageWithSource({
      labels: {
        camera: t("takePhoto"),
        gallery: t("chooseFromLibrary"),
        cancel: t("cancel"),
      },
      pickerOptions: {
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
      },
      permissionDeniedAlert: {
        title: t("errorTitle"),
        message: t("triagePhotoPermissionDenied"),
      },
    });
    if (!uri) return;
    setImageUri(uri);
  }, [t]);

  const handleSubmit = async () => {
    if (!imageUri) {
      showGlobalAlertCompat(t("errorTitle"), t("reportFoundPhotoRequired"));
      return;
    }
    const locText = foundLocation.trim();
    const phone = contactPhone.trim();
    if (!locText || !phone) {
      showGlobalAlertCompat(t("errorTitle"), t("fillAllFields"));
      return;
    }
    setSubmitting(true);
    try {
      let uploadedImageUrl: string;
      try {
        const res = await filesApi.uploadImage(imageUri, "found_pet");
        uploadedImageUrl = res.url;
      } catch {
        showGlobalAlertCompat(t("errorTitle"), "Failed to upload image");
        setSubmitting(false);
        return;
      }
      await postsApi.reportFoundPet({
        imageUrl: uploadedImageUrl,
        latitude: markerCoord.latitude,
        longitude: markerCoord.longitude,
        contactPhone: phone,
        description: description.trim() || undefined,
        content: buildFoundPetPostContent(language, phone, description),
      });
      showGlobalAlertCompat("", t("reportFoundSuccess"), [
        { text: "OK", onPress: goToCommunity },
      ]);
    } catch {
      showGlobalAlertCompat(t("errorTitle"), t("profileSaveError"));
    } finally {
      setSubmitting(false);
    }
  };

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
            {t("reportFoundNeedLogin")}
          </Text>
          <Pressable
            onPress={() => navigateToLoginClearingStack(navigation)}
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

  const canSubmit =
    !!imageUri && !!foundLocation.trim() && !!contactPhone.trim() && !submitting;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={keyboardAvoidBehavior}
      >
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
            {t("reportFoundScreenTitle")}
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginTop: 4 }}>
            <FieldLabel text={t("reportFoundPhoto")} required isRTL={isRTL} />
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
                borderColor: "#10b981",
                borderStyle: "dashed",
                paddingVertical: 20,
                justifyContent: "center",
              }}
            >
              <Ionicons name="camera-outline" size={24} color="#059669" />
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#059669" }}>
                {t("reportFoundPhoto")}
              </Text>
            </Pressable>
          )}

          <View
            style={{
              marginTop: 20,
              zIndex: 120,
              elevation: Platform.OS === "android" ? 18 : undefined,
            }}
          >
            <AddressAutocomplete
              label={t("lastSeenLocation")}
              required
              value={foundLocation}
              onChangeText={setFoundLocation}
              onSelect={handleAddressSelect}
              onClear={handleAddressSearchClear}
              placeholder={t("lastSeenLocationPlaceholder")}
              isRTL={isRTL}
              type="geocode"
            />
          </View>

          <Text
            style={{
              ...rtlText,
              marginTop: 12,
              marginBottom: 6,
              fontSize: 12,
              color: colors.textSecondary,
              zIndex: 1,
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
              zIndex: 1,
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
                <MarkerWrapper coordinate={markerCoord} pinColor="#10b981" />
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
            {markerCoord.latitude.toFixed(4)}, {markerCoord.longitude.toFixed(4)}
          </Text>

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

          <View style={{ marginTop: 20 }}>
            <FieldLabel text={t("reportLostDescription")} isRTL={isRTL} />
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

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={{
              marginTop: 28,
              backgroundColor: canSubmit ? "#10b981" : colors.textMuted,
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
                {t("reportFoundSubmit")}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
