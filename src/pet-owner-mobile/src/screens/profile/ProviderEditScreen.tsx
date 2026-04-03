import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { MapViewWrapper, MarkerWrapper } from "../../components/MapViewWrapper";
import { useTranslation, type TranslationKey } from "../../i18n";

const NAVY = "#001a5a";

const PROVIDER_LOCATION = {
  latitude: 32.0809,
  longitude: 34.7749,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

const SERVICES: {
  key: TranslationKey;
  icon: string;
  bgColor: string;
  iconColor: string;
  priceKey: keyof ServicePrices;
}[] = [
  {
    key: "serviceWalks",
    icon: "footsteps",
    bgColor: "rgba(15,47,127,0.08)",
    iconColor: NAVY,
    priceKey: "walks",
  },
  {
    key: "serviceBoarding",
    icon: "home",
    bgColor: "rgba(211,232,215,0.3)",
    iconColor: "#506356",
    priceKey: "boarding",
  },
  {
    key: "serviceHomeVisits",
    icon: "paw",
    bgColor: "rgba(233,226,209,0.3)",
    iconColor: "#242116",
    priceKey: "homeVisits",
  },
  {
    key: "serviceGrooming",
    icon: "cut",
    bgColor: "rgba(15,47,127,0.04)",
    iconColor: NAVY,
    priceKey: "grooming",
  },
];

interface ServicePrices {
  walks: string;
  boarding: string;
  homeVisits: string;
  grooming: string;
}

const DAYS: TranslationKey[] = [
  "daySun",
  "dayMon",
  "dayTue",
  "dayWed",
  "dayThu",
  "dayFri",
  "daySat",
];

export function ProviderEditScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL, rtlText, rtlInput } = useTranslation();

  const [prices, setPrices] = useState<ServicePrices>({
    walks: "60",
    boarding: "120",
    homeVisits: "45",
    grooming: "150",
  });
  const [bio, setBio] = useState("");
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [urgentAvailable, setUrgentAvailable] = useState(true);

  const updatePrice = (key: keyof ServicePrices, value: string) => {
    setPrices((prev) => ({ ...prev, [key]: value.replace(/[^0-9]/g, "") }));
  };

  const handleSave = () => {
    const payload = {
      prices,
      bio,
      availability: {
        selectedDay: DAYS[selectedDay],
        startTime: "08:00",
        endTime: "18:00",
        urgentAvailable,
      },
    };
    console.log("Provider profile saved:", JSON.stringify(payload, null, 2));
    Alert.alert(
      t("saveChanges"),
      `${t("servicesAndPricing")}: ₪${prices.walks}, ₪${prices.boarding}, ₪${prices.homeVisits}, ₪${prices.grooming}\n\n${t("bioTitle")}: ${bio || "—"}\n\n${t("urgentRequests")}: ${urgentAvailable ? "✓" : "✗"}`,
    );
  };

  return (
    <View className="flex-1 bg-[#f4fafd]">
      {/* Header */}
      <SafeAreaView edges={["top"]}>
        <View
          className="flex-row items-center justify-between px-6 py-4"
          style={{
            backgroundColor:
              Platform.OS === "ios" ? "rgba(255,255,255,0.7)" : "#FFFFFFE8",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            className="active:opacity-70"
            hitSlop={12}
          >
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24}
              color={NAVY}
            />
          </Pressable>
          <Text className="text-lg font-bold text-[#001a5a] tracking-tight">
            {t("providerEditTitle")}
          </Text>
          <View className="w-6" />
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View className="items-center mb-8">
          <View className="relative">
            <View
              className="w-32 h-32 rounded-full bg-[#dce1ff] items-center justify-center border-4 border-white overflow-hidden"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <Ionicons name="person" size={56} color="#264191" />
            </View>
            <Pressable
              className="absolute bottom-0 right-0 bg-[#001a5a] p-2 rounded-full active:opacity-80"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Ionicons name="pencil" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Location Mini-Map Card — Real MapView (non-interactive) */}
        <View
          className="rounded-xl overflow-hidden mb-10"
          style={{
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="h-40 overflow-hidden">
            <MapViewWrapper
              style={{ width: "100%", height: "100%" }}
              initialRegion={PROVIDER_LOCATION}
              fallbackLabel={t("locationLabel")}
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
              <MarkerWrapper
                coordinate={{
                  latitude: PROVIDER_LOCATION.latitude,
                  longitude: PROVIDER_LOCATION.longitude,
                }}
              >
                <View className="items-center">
                  <View
                    className="bg-[#001a5a] p-2 rounded-full"
                    style={{
                      shadowColor: NAVY,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <Ionicons name="location" size={20} color="#fff" />
                  </View>
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      marginTop: -2,
                      borderLeftWidth: 5,
                      borderRightWidth: 5,
                      borderTopWidth: 6,
                      borderLeftColor: "transparent",
                      borderRightColor: "transparent",
                      borderTopColor: NAVY,
                    }}
                  />
                </View>
              </MarkerWrapper>
            </MapViewWrapper>
          </View>
          <View
            className="absolute bottom-14 right-4 flex-row items-center gap-2 px-4 py-2 rounded-full"
            style={{
              backgroundColor:
                Platform.OS === "ios"
                  ? "rgba(255,255,255,0.92)"
                  : "#FFFFFFF0",
            }}
          >
            <Ionicons name="location" size={18} color={NAVY} />
            <Text className="text-sm font-semibold text-[#161d1f]">
              {t("locationLabel")}
            </Text>
          </View>
          <View className="p-4 items-center">
            <Pressable className="px-6 py-2 rounded-full border border-[#001a5a]/10 active:bg-[#001a5a]/5">
              <Text className="text-[#001a5a] font-bold text-sm">
                {t("editAddress")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Services & Pricing */}
        <View className="mb-10">
          <Text
            style={rtlText}
            className="text-xl font-extrabold text-[#001a5a] mb-6 px-1"
          >
            {t("servicesAndPricing")}
          </Text>

          <View className="flex-row gap-4 mb-4">
            {SERVICES.slice(0, 2).map((svc) => (
              <ServiceCard
                key={svc.priceKey}
                service={svc}
                price={prices[svc.priceKey]}
                onPriceChange={(val) => updatePrice(svc.priceKey, val)}
                t={t}
              />
            ))}
          </View>
          <View className="flex-row gap-4">
            {SERVICES.slice(2, 4).map((svc) => (
              <ServiceCard
                key={svc.priceKey}
                service={svc}
                price={prices[svc.priceKey]}
                onPriceChange={(val) => updatePrice(svc.priceKey, val)}
                t={t}
              />
            ))}
          </View>
        </View>

        {/* AI Bio Section */}
        <View className="mb-10">
          <Text
            style={rtlText}
            className="text-xl font-extrabold text-[#001a5a] mb-6"
          >
            {t("bioTitle")}
          </Text>

          <View className="relative mb-4">
            <TextInput
              className="bg-white rounded-xl p-4 pb-16 text-sm text-[#161d1f] leading-6"
              style={[
                rtlInput,
                {
                  minHeight: 140,
                  textAlignVertical: "top",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                },
              ]}
              placeholder={t("bioPlaceholder")}
              placeholderTextColor="#94a3b8"
              value={bio}
              onChangeText={setBio}
              multiline
            />
            <Pressable
              className="absolute bottom-4 left-4 bg-[#001a5a] px-4 py-2.5 rounded-full flex-row items-center gap-2 active:opacity-90"
              style={{
                shadowColor: NAVY,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 6,
              }}
              onPress={() => setShowAiPreview(true)}
            >
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text className="text-xs font-bold text-white">
                {t("generateWithAI")}
              </Text>
            </Pressable>
          </View>

          {showAiPreview && (
            <View
              className="rounded-xl p-6"
              style={{
                backgroundColor: "rgba(0,26,90,0.04)",
                borderWidth: 2,
                borderColor: "rgba(0,26,90,0.12)",
                ...(Platform.OS === "ios"
                  ? { borderStyle: "dashed" as const }
                  : {}),
              }}
            >
              <View className="flex-row items-center gap-2 mb-3">
                <Ionicons name="sparkles" size={14} color={NAVY} />
                <Text className="text-[10px] font-bold text-[#001a5a] tracking-widest uppercase">
                  {t("aiPreviewLabel")}
                </Text>
              </View>
              <Text
                style={[rtlText, { fontStyle: "italic", lineHeight: 24 }]}
                className="text-sm text-[#001a5a]/80"
              >
                "{t("aiPreviewText")}"
              </Text>
              <View className="mt-4 flex-row justify-end gap-4">
                <Pressable
                  className="active:opacity-70"
                  onPress={() => setShowAiPreview(false)}
                >
                  <Text className="text-[#94a3b8] font-bold text-xs">
                    ✕
                  </Text>
                </Pressable>
                <Pressable
                  className="bg-[#001a5a] px-4 py-1.5 rounded-full active:opacity-90"
                  onPress={() => {
                    setBio(t("aiPreviewText"));
                    setShowAiPreview(false);
                  }}
                >
                  <Text className="text-white font-bold text-xs">
                    {t("useThisText")}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Weekly Availability */}
        <View className="mb-10">
          <Text
            style={rtlText}
            className="text-xl font-extrabold text-[#001a5a] mb-6"
          >
            {t("weeklyAvailability")}
          </Text>

          {/* Day Selector */}
          <View className="flex-row justify-between gap-2 py-2 mb-6">
            {DAYS.map((dayKey, i) => {
              const active = i === selectedDay;
              return (
                <Pressable
                  key={dayKey}
                  onPress={() => setSelectedDay(i)}
                  className="items-center justify-center rounded-full"
                  style={[
                    { width: 45, height: 45 },
                    active
                      ? {
                          backgroundColor: NAVY,
                          shadowColor: NAVY,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.2,
                          shadowRadius: 8,
                          elevation: 4,
                        }
                      : { backgroundColor: "#fff" },
                  ]}
                >
                  <Text
                    className={`font-bold ${active ? "text-white" : "text-[#64748b]"}`}
                  >
                    {t(dayKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Time & Urgent Toggle */}
          <View
            className="rounded-xl p-6"
            style={{
              backgroundColor: "#fff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text
                style={rtlText}
                className="text-sm font-semibold text-[#001a5a]"
              >
                {t("activeHours")}
              </Text>
              <View className="flex-row items-center gap-3">
                <View className="bg-[#e8eff1] px-3 py-2 rounded-lg">
                  <Text className="text-xs font-bold text-[#161d1f]">
                    08:00
                  </Text>
                </View>
                <Text className="text-[#94a3b8]">—</Text>
                <View className="bg-[#e8eff1] px-3 py-2 rounded-lg">
                  <Text className="text-xs font-bold text-[#161d1f]">
                    18:00
                  </Text>
                </View>
              </View>
            </View>

            <View
              className="h-px w-full mb-6"
              style={{ backgroundColor: "rgba(0,26,90,0.05)" }}
            />

            <View className="flex-row items-center justify-between">
              <Text
                style={[rtlText, { flex: 1, marginRight: 16 }]}
                className="text-sm font-semibold text-[#001a5a]"
              >
                {t("urgentRequests")}
              </Text>
              <Switch
                value={urgentAvailable}
                onValueChange={setUrgentAvailable}
                trackColor={{ false: "#e2e8f0", true: NAVY }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Save Button */}
      <SafeAreaView
        edges={["bottom"]}
        style={{
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#f1f5f9",
        }}
      >
        <View className="px-6 py-4">
          <Pressable
            className="py-4 rounded-full items-center active:opacity-90"
            style={{
              backgroundColor: NAVY,
              shadowColor: NAVY,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 24,
              elevation: 12,
            }}
            onPress={handleSave}
          >
            <Text className="text-white font-extrabold text-lg">
              {t("saveChanges")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ServiceCard({
  service,
  price,
  onPriceChange,
  t,
}: {
  service: (typeof SERVICES)[number];
  price: string;
  onPriceChange: (val: string) => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        borderRadius: 12,
        alignItems: "center",
        gap: 16,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: service.bgColor,
        }}
      >
        <Ionicons
          name={service.icon as any}
          size={24}
          color={service.iconColor}
        />
      </View>
      <Text
        style={{ fontWeight: "700", color: NAVY, fontSize: 16 }}
      >
        {t(service.key)}
      </Text>
      <View style={{ width: "100%" }}>
        <Text
          style={{
            fontSize: 10,
            color: "#94a3b8",
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          {t("priceLabel")}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#f0f4f8",
            borderWidth: 2,
            borderColor: "rgba(0,26,90,0.12)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(0,26,90,0.12)",
              paddingHorizontal: 14,
              height: "100%",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: NAVY,
                fontWeight: "800",
                fontSize: 18,
              }}
            >
              ₪
            </Text>
          </View>
          <TextInput
            style={{
              flex: 1,
              textAlign: "center",
              fontWeight: "800",
              color: NAVY,
              fontSize: 20,
              paddingVertical: 12,
            }}
            value={price}
            onChangeText={onPriceChange}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
      </View>
    </View>
  );
}
