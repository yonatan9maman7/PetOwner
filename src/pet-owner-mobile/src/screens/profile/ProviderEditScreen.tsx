import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Image,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { MapViewWrapper, MarkerWrapper } from "../../components/MapViewWrapper";
import { useTranslation, type TranslationKey } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { providerApi } from "../../api/client";
import { CityAutocompleteInput } from "../../components/shared/CityAutocompleteInput";
import { DogSizeCapacityEditor, toggleDogSize } from "../../features/provider-onboarding/DogSizeCapacityFields";
import type { AvailabilitySlotDto, DogSize } from "../../types/api";

const NAVY = "#001a5a";
const DEFAULT_LAT = 32.0809;
const DEFAULT_LNG = 34.7749;

const AVATAR_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.5,
};

interface ServiceDef {
  serviceType: number;
  pricingUnit: number;
  nameKey: TranslationKey;
  unitKey: TranslationKey;
  icon: string;
  bgColor: string;
  iconColor: string;
}

const SERVICES: ServiceDef[] = [
  { serviceType: 0, pricingUnit: 0, nameKey: "serviceDogWalking", unitKey: "perHour", icon: "footsteps", bgColor: "rgba(15,47,127,0.08)", iconColor: NAVY },
  { serviceType: 1, pricingUnit: 0, nameKey: "servicePetSitting", unitKey: "perHour", icon: "home", bgColor: "rgba(211,232,215,0.3)", iconColor: "#506356" },
  { serviceType: 2, pricingUnit: 1, nameKey: "serviceBoarding", unitKey: "perNight", icon: "bed", bgColor: "rgba(233,226,209,0.3)", iconColor: "#242116" },
  { serviceType: 3, pricingUnit: 2, nameKey: "serviceDropInVisit", unitKey: "perVisit", icon: "paw", bgColor: "rgba(15,47,127,0.04)", iconColor: NAVY },
  { serviceType: 4, pricingUnit: 3, nameKey: "serviceTraining", unitKey: "perSession", icon: "school", bgColor: "rgba(211,232,215,0.15)", iconColor: "#506356" },
  { serviceType: 5, pricingUnit: 4, nameKey: "serviceInsurance", unitKey: "perPackage", icon: "shield-checkmark", bgColor: "rgba(233,226,209,0.15)", iconColor: "#242116" },
  { serviceType: 6, pricingUnit: 4, nameKey: "servicePetStore", unitKey: "perPackage", icon: "storefront", bgColor: "rgba(15,47,127,0.06)", iconColor: NAVY },
];

const SERVICE_NAME_TO_TYPE: Record<string, number> = {
  DogWalking: 0, PetSitting: 1, Boarding: 2, DropInVisit: 3, Training: 4, Insurance: 5, PetStore: 6,
};

const DAYS: TranslationKey[] = [
  "daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat",
];

interface ServicePackage {
  id: string;
  title: string;
  price: string;
  description?: string;
}

interface ServiceState {
  enabled: boolean;
  rate: string;
  packages: ServicePackage[];
}

function buildInitialServiceStates(): Record<number, ServiceState> {
  const init: Record<number, ServiceState> = {};
  for (const svc of SERVICES) init[svc.serviceType] = { enabled: false, rate: "", packages: [] };
  return init;
}

let _pkgIdCounter = 0;
function nextPkgId() { return `pkg_${Date.now()}_${++_pkgIdCounter}`; }

/* ───────────────────── Compact Service Row ───────────────────── */

function ServiceRow({
  service,
  state,
  onToggle,
  onRateChange,
  onDeletePackage,
  onAddPackagePress,
  t,
}: {
  service: ServiceDef;
  state: ServiceState;
  onToggle: () => void;
  onRateChange: (val: string) => void;
  onDeletePackage: (pkgId: string) => void;
  onAddPackagePress: () => void;
  t: (key: TranslationKey) => string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 10,
        opacity: state.enabled ? 1 : 0.6,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      {/* Top row: icon + name + price + switch */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: service.bgColor,
          }}
        >
          <Ionicons name={service.icon as any} size={20} color={service.iconColor} />
        </View>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={{ fontWeight: "700", color: colors.text, fontSize: 14 }}>
            {t(service.nameKey)}
          </Text>
          {state.enabled && (
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
              {t(service.unitKey)}
            </Text>
          )}
        </View>

        {state.enabled && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: colors.border,
              width: 90,
              height: 38,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                backgroundColor: colors.surfaceTertiary,
                paddingHorizontal: 8,
                height: "100%",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 14 }}>₪</Text>
            </View>
            <TextInput
              style={{
                flex: 1,
                textAlign: "center",
                fontWeight: "800",
                color: colors.text,
                fontSize: 16,
                paddingVertical: 0,
                height: 38,
              }}
              value={state.rate}
              onChangeText={(v) => onRateChange(v.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
        )}

        <Switch
          value={state.enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.borderLight, true: colors.primary }}
          thumbColor="#fff"
          style={{ transform: [{ scale: 0.8 }], marginLeft: 8 }}
        />
      </View>

      {/* Packages section (visible only when service is enabled) */}
      {state.enabled && (
        <View style={{ marginTop: 10, paddingLeft: 52 }}>
          {state.packages.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              style={{ marginBottom: 8 }}
            >
              {state.packages.map((pkg) => (
                <View
                  key={pkg.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.surfaceTertiary,
                    borderRadius: 10,
                    paddingVertical: 7,
                    paddingLeft: 12,
                    paddingRight: 6,
                    gap: 6,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                    maxWidth: 200,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 12, fontWeight: "700", color: colors.text }}
                      numberOfLines={1}
                    >
                      {pkg.title}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: colors.primary, marginTop: 1 }}>
                      ₪{pkg.price}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => onDeletePackage(pkg.id)}
                    hitSlop={6}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: colors.surfaceSecondary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close" size={13} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable
            onPress={onAddPackagePress}
            hitSlop={4}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2 }}
          >
            <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
              {t("addPackage")}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* ───────────────────── Add Package Modal ───────────────────── */

function AddPackageModal({
  visible,
  onClose,
  onSave,
  t,
  isRTL,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (pkg: { title: string; price: string; description: string }) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}) {
  const { colors } = useTheme();
  const modalInsets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (visible) { setTitle(""); setPrice(""); setDescription(""); }
  }, [visible]);

  const canSave = title.trim().length > 0 && price.trim().length > 0 && Number(price) > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: "flex-end",
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: Math.max(modalInsets.bottom, 28),
            }}
          >
            {/* Handle bar */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: "center",
                marginBottom: 18,
              }}
            />

            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: colors.text,
                marginBottom: 20,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("packages")}
            </Text>

            {/* Title */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 6,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("packageTitle")}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("packageTitlePlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.surfaceTertiary,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: colors.text,
                borderWidth: 1.5,
                borderColor: colors.border,
                marginBottom: 14,
                textAlign: isRTL ? "right" : "left",
              }}
            />

            {/* Price */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 6,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("packagePrice")}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surfaceTertiary,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: colors.border,
                marginBottom: 14,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  paddingHorizontal: 14,
                  height: 46,
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontWeight: "800", fontSize: 16, color: colors.text }}>₪</Text>
              </View>
              <TextInput
                value={price}
                onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                maxLength={6}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.text,
                }}
              />
            </View>

            {/* Description */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 6,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("packageDescription")}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("packageDescPlaceholder")}
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                backgroundColor: colors.surfaceTertiary,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: colors.text,
                borderWidth: 1.5,
                borderColor: colors.border,
                marginBottom: 22,
                minHeight: 60,
                textAlignVertical: "top",
                textAlign: isRTL ? "right" : "left",
              }}
            />

            {/* Save button */}
            <Pressable
              onPress={() => onSave({ title: title.trim(), price: price.trim(), description: description.trim() })}
              disabled={!canSave}
              style={({ pressed }) => ({
                backgroundColor: canSave ? colors.primary : colors.borderLight,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                opacity: pressed && canSave ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                {t("savePackage")}
              </Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

/* ───────────────────── Address Map Modal ───────────────────── */

function AddressMapModal({
  visible,
  onClose,
  lat,
  lng,
  city,
  street,
  building,
  apartment,
  onConfirm,
  t,
  isRTL,
}: {
  visible: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  city: string;
  street: string;
  building: string;
  apartment: string;
  onConfirm: (data: {
    lat: number;
    lng: number;
    city: string;
    street: string;
    building: string;
    apartment: string;
  }) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}) {
  const { colors } = useTheme();
  const [localLat, setLocalLat] = useState(lat);
  const [localLng, setLocalLng] = useState(lng);
  const [localCity, setLocalCity] = useState(city);
  const [localStreet, setLocalStreet] = useState(street);
  const [localBuilding, setLocalBuilding] = useState(building);
  const [localApartment, setLocalApartment] = useState(apartment);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setLocalLat(lat);
      setLocalLng(lng);
      setLocalCity(city);
      setLocalStreet(street);
      setLocalBuilding(building);
      setLocalApartment(apartment);
    }
  }, [visible, lat, lng, city, street, building, apartment]);

  const handleMapPress = async (e: any) => {
    const { latitude: newLat, longitude: newLng } = e.nativeEvent.coordinate;
    setLocalLat(newLat);
    setLocalLng(newLng);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": isRTL ? "he" : "en" } },
      );
      const data = await resp.json();
      if (data?.address) {
        setLocalCity(data.address.city || data.address.town || data.address.village || localCity);
        setLocalStreet(data.address.road || localStreet);
        setLocalBuilding(data.address.house_number || localBuilding);
      }
    } catch {
      /* geocoding is best-effort */
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
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
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{ padding: 4 }}
            >
              <Ionicons
                name={isRTL ? "arrow-forward" : "arrow-back"}
                size={20}
                color={colors.text}
              />
            </Pressable>
            <Text
              style={{
                flex: 1,
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
                textAlign: "center",
              }}
            >
              {t("editAddress")}
            </Text>
            <View style={{ width: 36 }} />
          </View>
        </View>

        {/* Scrollable content */}
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
              region={{
                latitude: localLat,
                longitude: localLng,
                latitudeDelta: 0.012,
                longitudeDelta: 0.012,
              }}
              onPress={handleMapPress}
            >
              <MarkerWrapper
                coordinate={{ latitude: localLat, longitude: localLng }}
                pinColor={colors.primary}
              />
            </MapViewWrapper>
          </View>

          <Text
            style={{
              fontSize: 12,
              color: colors.textMuted,
              textAlign: "center",
              paddingVertical: 8,
            }}
          >
            {t("tapToPickLocation")}
          </Text>

          <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 4 }}>
            <CityAutocompleteInput
              label={t("addressCity")}
              value={localCity}
              onChangeText={setLocalCity}
              onCitySelect={(cityName, newLat, newLng) => {
                setLocalCity(cityName);
                setLocalLat(newLat);
                setLocalLng(newLng);
              }}
              isRTL={isRTL}
            />
            <AddressField
              label={t("addressStreet")}
              value={localStreet}
              onChangeText={setLocalStreet}
              isRTL={isRTL}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AddressField
                  label={t("addressBuilding")}
                  value={localBuilding}
                  onChangeText={setLocalBuilding}
                  isRTL={isRTL}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AddressField
                  label={t("addressApartment")}
                  value={localApartment}
                  onChangeText={setLocalApartment}
                  isRTL={isRTL}
                />
              </View>
            </View>
          </View>

          {/* Confirm button */}
          <View style={{ paddingHorizontal: 20, marginTop: 24, paddingBottom: Math.max(insets.bottom, 20) }}>
            <Pressable
              onPress={() =>
                onConfirm({
                  lat: localLat,
                  lng: localLng,
                  city: localCity,
                  street: localStreet,
                  building: localBuilding,
                  apartment: localApartment,
                })
              }
              style={{
                backgroundColor: colors.primary,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
              }}
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

function AddressField({
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
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 4,
          textAlign: isRTL ? "right" : "left",
        }}
      >
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

/* ───────────────────── Main Screen ───────────────────── */

export function ProviderEditScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL, rtlText, rtlInput } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [pkgModalServiceType, setPkgModalServiceType] = useState<number | null>(null);
  const [providerStatus, setProviderStatus] = useState<"new" | "Pending" | "Approved" | "Suspended" | "Banned" | "Revoked">("new");

  const [serviceStates, setServiceStates] = useState<Record<number, ServiceState>>(buildInitialServiceStates);
  const [bio, setBio] = useState("");
  const [aiGeneratedBio, setAiGeneratedBio] = useState("");
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [urgentAvailable, setUrgentAvailable] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [buildingNumber, setBuildingNumber] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [slots, setSlots] = useState<AvailabilitySlotDto[]>([]);
  const [deletedSlotIds, setDeletedSlotIds] = useState<string[]>([]);
  const [editingSlot, setEditingSlot] = useState<{ slotId: string; field: "start" | "end" } | null>(null);
  const [visibleOnMap, setVisibleOnMap] = useState(false);
  const [togglingMapVisibility, setTogglingMapVisibility] = useState(false);
  const [acceptedDogSizes, setAcceptedDogSizes] = useState<DogSize[]>([]);
  const [maxDogsCapacity, setMaxDogsCapacity] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [profile, schedule] = await Promise.all([
          providerApi.getMe(),
          providerApi.getSchedule(),
        ]);
        if (!active) return;

        setProviderStatus(profile.status || "Approved");
        setProfileImageUrl(profile.profileImageUrl ?? null);
        setVisibleOnMap(!!profile.isAvailableNow);
        setBio(profile.bio || "");
        setUrgentAvailable(profile.acceptsOffHoursRequests);
        setPhoneNumber(profile.phoneNumber || "");
        setCity(profile.city || "");
        setStreet(profile.street || "");
        setBuildingNumber(profile.buildingNumber || "");
        setApartmentNumber(profile.apartmentNumber || "");
        setLatitude(profile.latitude || DEFAULT_LAT);
        setLongitude(profile.longitude || DEFAULT_LNG);
        setAcceptedDogSizes(profile.acceptedDogSizes ?? []);
        setMaxDogsCapacity(
          profile.maxDogsCapacity != null ? String(profile.maxDogsCapacity) : "",
        );

        const loaded = buildInitialServiceStates();
        for (const rate of profile.serviceRates) {
          const typeNum = SERVICE_NAME_TO_TYPE[rate.service];
          if (typeNum != null) {
            const existingPkgs: ServicePackage[] = (rate.packages || []).map(
              (p: any) => ({
                id: nextPkgId(),
                title: p.title ?? "",
                price: String(p.price ?? 0),
                description: p.description,
              }),
            );
            loaded[typeNum] = { enabled: true, rate: String(rate.rate), packages: existingPkgs };
          }
        }
        setServiceStates(loaded);
        setSlots(schedule);
      } catch {
        /* 404 for new providers is expected */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const toggleService = (serviceType: number) => {
    setServiceStates((prev) => ({
      ...prev,
      [serviceType]: { ...prev[serviceType], enabled: !prev[serviceType].enabled },
    }));
  };

  const updateRate = (serviceType: number, value: string) => {
    setServiceStates((prev) => ({
      ...prev,
      [serviceType]: { ...prev[serviceType], rate: value },
    }));
  };

  const addPackage = (serviceType: number, pkg: { title: string; price: string; description: string }) => {
    setServiceStates((prev) => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        packages: [
          ...prev[serviceType].packages,
          { id: nextPkgId(), title: pkg.title, price: pkg.price, description: pkg.description || undefined },
        ],
      },
    }));
  };

  const deletePackage = (serviceType: number, pkgId: string) => {
    setServiceStates((prev) => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        packages: prev[serviceType].packages.filter((p) => p.id !== pkgId),
      },
    }));
  };

  const uploadProviderAvatar = async (localUri: string) => {
    setUploadingAvatar(true);
    try {
      const name = localUri.split("/").pop() ?? "photo.jpg";
      const match = /\.(\w+)$/.exec(name);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      const form = new FormData();
      form.append("file", { uri: localUri, name, type } as any);
      const res = await providerApi.uploadImage(form);
      const url = res.url;
      setProfileImageUrl(url);
    } catch {
      Alert.alert(t("errorTitle"), t("genericErrorDesc"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickProviderAvatarFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("errorTitle"), t("triagePhotoPermissionDenied"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(AVATAR_PICKER_OPTIONS);
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadProviderAvatar(result.assets[0].uri);
  };

  const pickProviderAvatarFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("errorTitle"), t("triagePhotoPermissionDenied"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync(AVATAR_PICKER_OPTIONS);
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadProviderAvatar(result.assets[0].uri);
  };

  const showProviderAvatarPicker = () => {
    if (uploadingAvatar || saving) return;
    Alert.alert(t("triagePhotoSourceTitle"), t("triagePhotoSourceMessage"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("triageTakePhoto"), onPress: () => void pickProviderAvatarFromCamera() },
      { text: t("triageChooseGallery"), onPress: () => void pickProviderAvatarFromLibrary() },
    ]);
  };

  const handleGenerateBio = async () => {
    setGeneratingBio(true);
    try {
      const result = await providerApi.generateBio(bio);
      setAiGeneratedBio(result.bio);
      setShowAiPreview(true);
    } catch {
      Alert.alert(t("errorTitle"), t("profileSaveError"));
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleUrgentToggle = (value: boolean) => {
    setUrgentAvailable(value);
  };

  const handleAddSlot = () => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setSlots((prev) => [
      ...prev,
      {
        id: tempId,
        providerId: "",
        dayOfWeek: selectedDay,
        startTime: "09:00:00",
        endTime: "17:00:00",
      },
    ]);
  };

  const handleDeleteSlot = (id: string) => {
    setSlots((prev) => prev.filter((sl) => sl.id !== id));
    if (!id.startsWith("temp_")) {
      setDeletedSlotIds((prev) => [...prev, id]);
    }
  };

  const updateSlotTime = (slotId: string, field: "start" | "end", timeStr: string) => {
    setSlots((prev) =>
      prev.map((sl) =>
        sl.id === slotId
          ? { ...sl, [field === "start" ? "startTime" : "endTime"]: timeStr }
          : sl
      )
    );
  };

  const handleAddressConfirm = (data: {
    lat: number;
    lng: number;
    city: string;
    street: string;
    building: string;
    apartment: string;
  }) => {
    setLatitude(data.lat);
    setLongitude(data.lng);
    setCity(data.city);
    setStreet(data.street);
    setBuildingNumber(data.building);
    setApartmentNumber(data.apartment);
    setShowMapModal(false);
  };

  const isNewProvider = providerStatus === "new";

  const handleMapVisibilityChange = useCallback(
    async (value: boolean) => {
      setTogglingMapVisibility(true);
      try {
        await providerApi.updateAvailability(value);
        setVisibleOnMap(value);
      } catch {
        Alert.alert(t("errorTitle"), t("mapVisibilityUpdateError"));
      } finally {
        setTogglingMapVisibility(false);
      }
    },
    [t],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const selectedServices = SERVICES.filter((svc) => {
        const st = serviceStates[svc.serviceType];
        return st.enabled && st.rate && Number(st.rate) > 0;
      }).map((svc) => {
        const st = serviceStates[svc.serviceType];
        return {
          serviceType: svc.serviceType,
          rate: Number(st.rate),
          pricingUnit: svc.pricingUnit,
          packages: st.packages.map((p) => ({
            title: p.title,
            price: Number(p.price),
            description: p.description || undefined,
          })),
        };
      });

      const needsDogPrefs = !!serviceStates[0]?.enabled || !!serviceStates[2]?.enabled;
      if (needsDogPrefs) {
        if (acceptedDogSizes.length === 0) {
          Alert.alert(t("errorTitle"), t("acceptedSizesRequired"));
          setSaving(false);
          return;
        }
        const cap = Number(maxDogsCapacity);
        if (!maxDogsCapacity.trim() || isNaN(cap) || cap < 1) {
          Alert.alert(t("errorTitle"), t("maxCapacityInvalid"));
          setSaving(false);
          return;
        }
      }

      if (isNewProvider) {
        const firstService = selectedServices[0];
        await providerApi.apply({
          type: 0,
          serviceType: firstService?.serviceType ?? 0,
          city,
          street,
          buildingNumber,
          apartmentNumber: apartmentNumber || undefined,
          latitude,
          longitude,
          phoneNumber,
          isEmergencyService: false,
          description: bio || t("bioPlaceholder"),
          bio: bio.trim() || undefined,
          selectedServices,
          acceptedDogSizes: needsDogPrefs ? acceptedDogSizes : [],
          maxDogsCapacity: needsDogPrefs ? Number(maxDogsCapacity) : null,
        });
        setProviderStatus("Pending");
        const msg = t("applicationSubmitted");
        if (Platform.OS === "web") { window.alert(msg); } else { Alert.alert(msg); }
      } else {
        await providerApi.updateProfile({
          bio,
          selectedServices,
          city,
          street,
          buildingNumber,
          apartmentNumber: apartmentNumber || undefined,
          latitude,
          longitude,
          acceptsOffHoursRequests: urgentAvailable,
          acceptedDogSizes: needsDogPrefs ? acceptedDogSizes : [],
          maxDogsCapacity: needsDogPrefs ? Number(maxDogsCapacity) : null,
        });

        for (const id of deletedSlotIds) {
          try { await providerApi.deleteSlot(id); } catch { /* already gone */ }
        }
        setDeletedSlotIds([]);

        const newSlots = slots.filter((s) => s.id.startsWith("temp_"));
        const createdSlots: typeof slots = [];
        for (const s of newSlots) {
          try {
            const created = await providerApi.createSlot({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
            });
            createdSlots.push(created);
          } catch { /* slot overlap or other issue — silently skip */ }
        }

        if (createdSlots.length > 0) {
          setSlots((prev) =>
            prev
              .filter((s) => !s.id.startsWith("temp_") || !newSlots.some((ns) => ns.id === s.id))
              .concat(createdSlots),
          );
        }

        const msg = t("profileSaved");
        if (Platform.OS === "web") { window.alert(msg); } else { Alert.alert(msg); }
      }
    } catch (e: any) {
      const detail = e?.response?.data?.message || t("profileSaveError");
      Alert.alert(t("errorTitle"), detail);
    } finally {
      setSaving(false);
    }
  };

  const daySlots = slots.filter((s) => s.dayOfWeek === selectedDay);

  const addressLabel = [city, street, buildingNumber]
    .filter(Boolean)
    .join(", ") || t("locationLabel");

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top - 8, 0),
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
          zIndex: 10,
        }}
      >
        <View
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingVertical: 14,
          }}
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24}
              color={colors.text}
            />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>
            {t("providerEditTitle")}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
            {/* Scrollable form */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: Math.max(insets.bottom, 16) + 24,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* ── Profile photo ── */}
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <Pressable
                  onPress={showProviderAvatarPicker}
                  disabled={uploadingAvatar || saving}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    borderWidth: 2,
                    borderStyle: "dashed",
                    borderColor: profileImageUrl ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    opacity: uploadingAvatar || saving ? 0.9 : 1,
                  }}
                >
                  {profileImageUrl ? (
                    <Image
                      source={{ uri: profileImageUrl }}
                      style={{ width: 120, height: 120 }}
                    />
                  ) : (
                    <Ionicons name="person-outline" size={40} color={colors.textMuted} />
                  )}
                  {uploadingAvatar && (
                    <View
                      style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: "rgba(0,0,0,0.35)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ActivityIndicator size="large" color="#fff" />
                    </View>
                  )}
                </Pressable>
                <Pressable
                  onPress={showProviderAvatarPicker}
                  disabled={uploadingAvatar || saving}
                  style={{ marginTop: 10 }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: colors.primary,
                    }}
                  >
                    {t("changePhoto")}
                  </Text>
                </Pressable>
                <Text
                  style={[
                    rtlText,
                    {
                      fontSize: 12,
                      color: colors.textMuted,
                      marginTop: 4,
                      textAlign: "center",
                    },
                  ]}
                >
                  {t("onbTapToUpload")}
                </Text>
              </View>

              {/* ── Status Banner ── */}
              {providerStatus === "Pending" && (
                <View
                  style={{
                    backgroundColor: "#fef3c7",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    gap: 10,
                    borderWidth: 1,
                    borderColor: "#fbbf24",
                  }}
                >
                  <Ionicons name="hourglass-outline" size={20} color="#92400e" />
                  <Text style={[rtlText, { flex: 1, color: "#92400e", fontSize: 13, fontWeight: "600" }]}>
                    {t("pendingApproval")}
                  </Text>
                </View>
              )}

              {providerStatus === "Approved" && (
                <View
                  style={{
                    backgroundColor: colors.cardHighlight,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 20,
                    borderWidth: 1.5,
                    borderColor: visibleOnMap ? "rgba(16, 185, 129, 0.45)" : colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: visibleOnMap ? "rgba(16, 185, 129, 0.15)" : colors.surfaceSecondary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={visibleOnMap ? "map" : "map-outline"}
                        size={22}
                        color={visibleOnMap ? "#059669" : colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          rtlText,
                          { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 4 },
                        ]}
                      >
                        {t("mapVisibilityCardTitle")}
                      </Text>
                      <Text style={[rtlText, { fontSize: 12, color: colors.textSecondary, lineHeight: 17 }]}>
                        {t("mapVisibilityCardSubtitle")}
                      </Text>
                    </View>
                    {togglingMapVisibility ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Switch
                        value={visibleOnMap}
                        onValueChange={handleMapVisibilityChange}
                        trackColor={{ false: colors.borderLight, true: "#34d399" }}
                        thumbColor="#fff"
                        style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      rtlText,
                      {
                        marginTop: 10,
                        fontSize: 12,
                        fontWeight: "600",
                        color: visibleOnMap ? "#059669" : colors.textMuted,
                      },
                    ]}
                  >
                    {visibleOnMap ? t("mapVisibilityOnLabel") : t("mapVisibilityOffLabel")}
                  </Text>
                </View>
              )}

              {/* ── Phone Number (for new applicants) ── */}
              {isNewProvider && (
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={[rtlText, { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 }]}
                  >
                    {t("phoneNumber")} *
                  </Text>
                  <TextInput
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder={t("phoneNumberPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    style={[
                      rtlInput,
                      {
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        fontSize: 15,
                        color: colors.text,
                        borderWidth: 1.5,
                        borderColor: colors.border,
                      },
                    ]}
                  />
                </View>
              )}

              {/* ── Location preview ── */}
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  overflow: "hidden",
                  marginBottom: 28,
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View style={{ height: 140 }}>
                  <MapViewWrapper
                    style={{ width: "100%", height: "100%" }}
                    initialRegion={{
                      latitude,
                      longitude,
                      latitudeDelta: 0.012,
                      longitudeDelta: 0.012,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    showsCompass={false}
                    {...(Platform.OS === "android" && { liteMode: true })}
                  >
                    <MarkerWrapper coordinate={{ latitude, longitude }} pinColor={colors.primary} />
                  </MapViewWrapper>
                </View>

                <View style={{ padding: 14, alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons name="location" size={16} color={colors.text} />
                    <Text
                      style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}
                      numberOfLines={1}
                    >
                      {addressLabel}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowMapModal(true)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: colors.borderLight,
                      backgroundColor: pressed ? colors.surfaceTertiary : "transparent",
                    })}
                  >
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
                      {t("editAddress")}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* ── Services & Pricing ── */}
              <View style={{ marginBottom: 28 }}>
                <Text
                  style={[rtlText, { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 14 }]}
                >
                  {t("servicesAndPricing")}
                </Text>
                {SERVICES.map((svc) => (
                  <ServiceRow
                    key={svc.serviceType}
                    service={svc}
                    state={serviceStates[svc.serviceType]}
                    onToggle={() => toggleService(svc.serviceType)}
                    onRateChange={(val) => updateRate(svc.serviceType, val)}
                    onDeletePackage={(pkgId) => deletePackage(svc.serviceType, pkgId)}
                    onAddPackagePress={() => setPkgModalServiceType(svc.serviceType)}
                    t={t}
                  />
                ))}
                {(serviceStates[0]?.enabled || serviceStates[2]?.enabled) && (
                  <DogSizeCapacityEditor
                    selected={acceptedDogSizes}
                    onToggleSize={(id) =>
                      setAcceptedDogSizes((prev) => toggleDogSize(prev, id))
                    }
                    maxCapacity={maxDogsCapacity}
                    onMaxCapacityChange={setMaxDogsCapacity}
                  />
                )}
              </View>

              {/* ── Bio ── */}
              <View style={{ marginBottom: 28 }}>
                <Text
                  style={[rtlText, { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 14 }]}
                >
                  {t("bioTitle")}
                </Text>
                <View style={{ position: "relative", marginBottom: 12 }}>
                  <TextInput
                    style={[
                      rtlInput,
                      {
                        backgroundColor: colors.surface,
                        borderRadius: 14,
                        padding: 16,
                        paddingBottom: 56,
                        fontSize: 14,
                        color: colors.text,
                        lineHeight: 22,
                        minHeight: 130,
                        textAlignVertical: "top",
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 4,
                        elevation: 1,
                      },
                    ]}
                    placeholder={t("bioPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    value={bio}
                    onChangeText={setBio}
                    multiline
                  />
                  <Pressable
                    onPress={handleGenerateBio}
                    disabled={generatingBio}
                    style={{
                      position: "absolute",
                      bottom: 12,
                      left: 12,
                      backgroundColor: colors.primary,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      opacity: generatingBio ? 0.7 : 1,
                    }}
                  >
                    {generatingBio ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="sparkles" size={14} color="#fff" />
                    )}
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                      {generatingBio ? t("generating") : t("generateWithAI")}
                    </Text>
                  </Pressable>
                </View>

                {showAiPreview && aiGeneratedBio ? (
                  <View
                    style={{
                      borderRadius: 14,
                      padding: 16,
                      backgroundColor: colors.surfaceTertiary,
                      borderWidth: 1.5,
                      borderColor: colors.borderLight,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <Ionicons name="sparkles" size={14} color={colors.text} />
                      <Text style={{ fontSize: 10, fontWeight: "700", color: colors.text, letterSpacing: 1, textTransform: "uppercase" }}>
                        {t("aiPreviewLabel")}
                      </Text>
                    </View>
                    <Text style={[rtlText, { fontStyle: "italic", lineHeight: 22, fontSize: 14, color: colors.textSecondary }]}>
                      "{aiGeneratedBio}"
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 12 }}>
                      <Pressable onPress={() => setShowAiPreview(false)}>
                        <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12 }}>✕</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { setBio(aiGeneratedBio); setShowAiPreview(false); }}
                        style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                          {t("useThisText")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* ── Weekly Availability ── */}
              <View style={{ marginBottom: 28 }}>
                <Text
                  style={[rtlText, { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 14 }]}
                >
                  {t("weeklyAvailability")}
                </Text>

                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
                  {DAYS.map((dayKey, i) => {
                    const active = i === selectedDay;
                    return (
                      <Pressable
                        key={dayKey}
                        onPress={() => setSelectedDay(i)}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: active ? colors.primary : colors.surface,
                          ...(active
                            ? {
                                shadowColor: colors.shadow,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.2,
                                shadowRadius: 8,
                                elevation: 4,
                              }
                            : {}),
                        }}
                      >
                        <Text style={{ fontWeight: "700", color: active ? "#fff" : colors.textSecondary, fontSize: 13 }}>
                          {t(dayKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    padding: 16,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <Text style={[rtlText, { fontSize: 14, fontWeight: "600", color: colors.text }]}>
                      {t("activeHours")}
                    </Text>
                    <Pressable
                      onPress={handleAddSlot}
                      style={{
                        backgroundColor: colors.surfaceSecondary,
                        padding: 8,
                        borderRadius: 20,
                      }}
                    >
                      <Ionicons name="add" size={18} color={colors.text} />
                    </Pressable>
                  </View>

                  {daySlots.length === 0 ? (
                    <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", paddingVertical: 12 }}>
                      —
                    </Text>
                  ) : (
                    daySlots.map((slot) => (
                      <View
                        key={slot.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          {Platform.OS === "web" ? (
                            <input
                              type="time"
                              value={slot.startTime?.slice(0, 5) ?? "09:00"}
                              onChange={(e: any) => updateSlotTime(slot.id, "start", e.target.value + ":00")}
                              style={{
                                backgroundColor: colors.surfaceSecondary,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 8,
                                padding: "8px 12px",
                                fontSize: 13,
                                fontWeight: 700,
                                color: colors.text,
                                fontFamily: "inherit",
                              }}
                            />
                          ) : (
                            <Pressable
                              onPress={() => setEditingSlot({ slotId: slot.id, field: "start" })}
                              style={{
                                backgroundColor: editingSlot?.slotId === slot.id && editingSlot?.field === "start" ? colors.primaryLight : colors.surfaceSecondary,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: editingSlot?.slotId === slot.id && editingSlot?.field === "start" ? colors.primary : "transparent",
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                                {slot.startTime?.slice(0, 5) ?? "—"}
                              </Text>
                            </Pressable>
                          )}
                          <Text style={{ color: colors.textMuted }}>—</Text>
                          {Platform.OS === "web" ? (
                            <input
                              type="time"
                              value={slot.endTime?.slice(0, 5) ?? "17:00"}
                              onChange={(e: any) => updateSlotTime(slot.id, "end", e.target.value + ":00")}
                              style={{
                                backgroundColor: colors.surfaceSecondary,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 8,
                                padding: "8px 12px",
                                fontSize: 13,
                                fontWeight: 700,
                                color: colors.text,
                                fontFamily: "inherit",
                              }}
                            />
                          ) : (
                            <Pressable
                              onPress={() => setEditingSlot({ slotId: slot.id, field: "end" })}
                              style={{
                                backgroundColor: editingSlot?.slotId === slot.id && editingSlot?.field === "end" ? colors.primaryLight : colors.surfaceSecondary,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: editingSlot?.slotId === slot.id && editingSlot?.field === "end" ? colors.primary : "transparent",
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                                {slot.endTime?.slice(0, 5) ?? "—"}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                        <Pressable onPress={() => handleDeleteSlot(slot.id)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </Pressable>
                      </View>
                    ))
                  )}

                  {editingSlot && Platform.OS !== "web" && (() => {
                    const DateTimePicker = require("@react-native-community/datetimepicker").default;
                    const targetSlot = daySlots.find((s) => s.id === editingSlot.slotId);
                    if (!targetSlot) return null;
                    const raw = (editingSlot.field === "start" ? targetSlot.startTime : targetSlot.endTime) || "09:00:00";
                    const [hh, mm] = raw.split(":").map(Number);
                    const dateVal = new Date();
                    dateVal.setHours(hh, mm, 0, 0);

                    const handleChange = (_: any, d?: Date) => {
                      if (Platform.OS === "android") setEditingSlot(null);
                      if (!d) return;
                      const t24 = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
                      updateSlotTime(editingSlot.slotId, editingSlot.field, t24);
                    };

                    if (Platform.OS === "ios") {
                      return (
                        <Modal transparent animationType="slide">
                          <Pressable
                            style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}
                            onPress={() => setEditingSlot(null)}
                          >
                            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32 }}>
                              <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: 12 }}>
                                <Pressable onPress={() => setEditingSlot(null)}>
                                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#007AFF" }}>Done</Text>
                                </Pressable>
                              </View>
                              <DateTimePicker
                                value={dateVal}
                                mode="time"
                                display="spinner"
                                is24Hour
                                onChange={handleChange}
                              />
                            </View>
                          </Pressable>
                        </Modal>
                      );
                    }

                    return (
                      <DateTimePicker
                        value={dateVal}
                        mode="time"
                        display="default"
                        is24Hour
                        onChange={handleChange}
                      />
                    );
                  })()}

                  <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: 12 }} />

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[rtlText, { flex: 1, fontSize: 13, fontWeight: "600", color: colors.text, marginRight: 16 }]}>
                      {t("urgentRequests")}
                    </Text>
                    <Switch
                      value={urgentAvailable}
                      onValueChange={handleUrgentToggle}
                      trackColor={{ false: colors.borderLight, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              </View>

              {/* ── Save / Submit Button ── */}
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  marginTop: 8,
                  opacity: saving ? 0.7 : 1,
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.25,
                  shadowRadius: 16,
                  elevation: 10,
                }}
              >
                {saving ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                      {isNewProvider ? t("submittingApplication") : t("savingProfile")}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                    {isNewProvider ? t("submitApplication") : t("saveChanges")}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
      </KeyboardAvoidingView>

      {/* Address Map Modal */}
      <AddressMapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        lat={latitude}
        lng={longitude}
        city={city}
        street={street}
        building={buildingNumber}
        apartment={apartmentNumber}
        onConfirm={handleAddressConfirm}
        t={t}
        isRTL={isRTL}
      />

      {/* Add Package Modal */}
      <AddPackageModal
        visible={pkgModalServiceType !== null}
        onClose={() => setPkgModalServiceType(null)}
        onSave={(pkg) => {
          if (pkgModalServiceType !== null) addPackage(pkgModalServiceType, pkg);
          setPkgModalServiceType(null);
        }}
        t={t}
        isRTL={isRTL}
      />
    </View>
  );
}
