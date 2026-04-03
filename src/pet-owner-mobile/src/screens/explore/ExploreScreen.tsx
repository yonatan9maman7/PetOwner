import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MapViewWrapper, MarkerWrapper } from "../../components/MapViewWrapper";
import { LanguageToggle } from "../../components/LanguageToggle";
import { useTranslation, type TranslationKey } from "../../i18n";

const NAVY = "#001a5a";

const TEL_AVIV = {
  latitude: 32.0853,
  longitude: 34.7818,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

interface Sitter {
  id: number;
  name: string;
  nameEn: string;
  specialty: string;
  specialtyEn: string;
  price: number;
  rating: number;
  lat: number;
  lng: number;
}

const SITTERS: Sitter[] = [
  {
    id: 1,
    name: "נעם לוי",
    nameEn: "Noam Levi",
    specialty: "מומחית לכלבים גדולים",
    specialtyEn: "Large dog specialist",
    price: 85,
    rating: 4.9,
    lat: 32.0853,
    lng: 34.775,
  },
  {
    id: 2,
    name: "דנה כהן",
    nameEn: "Dana Cohen",
    specialty: "מטפלת חתולים מקצועית",
    specialtyEn: "Professional cat caretaker",
    price: 60,
    rating: 4.7,
    lat: 32.09,
    lng: 34.79,
  },
  {
    id: 3,
    name: "אורי ברק",
    nameEn: "Ori Barak",
    specialty: "אילוף כלבים מוסמך",
    specialtyEn: "Certified dog trainer",
    price: 95,
    rating: 4.8,
    lat: 32.075,
    lng: 34.783,
  },
  {
    id: 4,
    name: "מיכל שרון",
    nameEn: "Michal Sharon",
    specialty: "פנסיון ביתי פרימיום",
    specialtyEn: "Premium home boarding",
    price: 120,
    rating: 5.0,
    lat: 32.082,
    lng: 34.77,
  },
];

const CATEGORIES: { key: TranslationKey; icon: string; activeIcon: string }[] =
  [
    { key: "catWalks", icon: "footsteps-outline", activeIcon: "footsteps" },
    { key: "catBoarding", icon: "home-outline", activeIcon: "home" },
    { key: "catDaycare", icon: "happy-outline", activeIcon: "happy" },
    { key: "catGrooming", icon: "cut-outline", activeIcon: "cut" },
  ];

function PriceMarker({
  price,
  active,
}: {
  price: number;
  active?: boolean;
}) {
  return (
    <View className="items-center">
      <View
        className={`px-3 py-1.5 rounded-full flex-row items-center border-2 ${
          active
            ? "bg-[#001a5a] border-white"
            : "bg-white border-[#001a5a]/20"
        }`}
        style={{
          shadowColor: active ? NAVY : "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: active ? 0.25 : 0.1,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text
          className={`text-xs ${active ? "text-white" : "text-[#001a5a]"}`}
        >
          ₪
        </Text>
        <Text
          className={`font-bold ${active ? "text-white" : "text-[#001a5a]"}`}
        >
          {price}
        </Text>
      </View>
      <View
        style={{
          width: 0,
          height: 0,
          marginTop: -2,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 8,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: active ? NAVY : "#fff",
        }}
      />
    </View>
  );
}

export function ExploreScreen() {
  const { t, isRTL, rtlInput } = useTranslation();
  const [activeCategory, setActiveCategory] = useState(0);
  const [selectedSitter, setSelectedSitter] = useState<Sitter>(SITTERS[0]);
  const mapRef = useRef<any>(null);

  const handleMarkerPress = (sitter: Sitter) => {
    setSelectedSitter(sitter);
    mapRef.current?.animateToRegion?.(
      {
        latitude: sitter.lat,
        longitude: sitter.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      350,
    );
  };

  return (
    <View style={styles.root}>
      {/* Map — fills entire screen */}
      <MapViewWrapper
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={TEL_AVIV}
        fallbackLabel="Explore Map"
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: 110, left: 0 }}
        {...(Platform.OS === "android" && { mapType: "standard" })}
      >
        {SITTERS.map((sitter) => (
          <MarkerWrapper
            key={sitter.id}
            coordinate={{ latitude: sitter.lat, longitude: sitter.lng }}
            onPress={() => handleMarkerPress(sitter)}
            tracksViewChanges={false}
          >
            <PriceMarker
              price={sitter.price}
              active={selectedSitter.id === sitter.id}
            />
          </MarkerWrapper>
        ))}
      </MapViewWrapper>

      {/* Header: Paw + PetOwner brand + Language Toggle */}
      <SafeAreaView edges={["top"]} style={{ zIndex: 10 }}>
        <View
          style={styles.header}
          className="h-16 flex-row items-center justify-between px-6"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl items-center justify-center bg-[#001a5a]">
              <Ionicons name="paw" size={22} color="#fff" />
            </View>
            <Text className="text-2xl font-extrabold text-[#001a5a]">
              PetOwner
            </Text>
          </View>
          <LanguageToggle />
        </View>

        {/* Floating Search & Category Pills */}
        <View className="px-6 mt-4">
          <View
            className="rounded-full px-5 py-3 flex-row items-center gap-3"
            style={styles.searchBar}
          >
            <Ionicons name="search" size={22} color={NAVY} />
            <TextInput
              className="flex-1 text-base font-medium text-[#43474e]"
              style={rtlInput}
              placeholder={t("searchPlaceholder")}
              placeholderTextColor="#94a3b8"
            />
            <Ionicons name="options" size={22} color="#94a3b8" />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingVertical: 16,
              gap: 12,
              flexDirection: isRTL ? "row-reverse" : "row",
            }}
          >
            {CATEGORIES.map((cat, i) => {
              const active = i === activeCategory;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setActiveCategory(i)}
                  className="flex-row items-center gap-2 px-5 py-2.5 rounded-full"
                  style={active ? styles.catActive : styles.catInactive}
                >
                  <Ionicons
                    name={(active ? cat.activeIcon : cat.icon) as any}
                    size={20}
                    color={active ? "#fff" : "#43474e"}
                  />
                  <Text
                    className={`text-sm font-semibold ${active ? "text-white" : "text-[#43474e]"}`}
                  >
                    {t(cat.key)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Featured Sitter Bottom Card */}
      <View
        className="absolute left-0 right-0 px-6"
        style={{ bottom: 110, zIndex: 20 }}
      >
        <Pressable
          className="p-4 rounded-xl flex-row items-center gap-4 active:opacity-95"
          style={styles.sitterCard}
        >
          <View className="relative">
            <View className="w-20 h-20 rounded-lg bg-[#dce1ff] items-center justify-center overflow-hidden">
              <Ionicons name="person" size={36} color="#264191" />
            </View>
            <View className="absolute -bottom-1 -right-1 bg-[#506356] rounded-full border-2 border-white p-0.5">
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
            </View>
          </View>

          <View className="flex-1">
            <View className="flex-row justify-between items-start">
              <Text className="text-lg font-bold text-[#001a5a]">
                {isRTL ? selectedSitter.name : selectedSitter.nameEn}
              </Text>
              <View className="flex-row items-center gap-1 bg-[#e9e2d1] px-2 py-0.5 rounded-full">
                <Ionicons name="star" size={14} color="#1e1c11" />
                <Text className="text-xs font-bold text-[#1e1c11]">
                  {selectedSitter.rating}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-[#43474e] font-medium">
              {isRTL ? selectedSitter.specialty : selectedSitter.specialtyEn}
            </Text>
            <View className="mt-1.5 flex-row items-center justify-between">
              <View className="flex-row items-baseline">
                <Text className="text-xl font-bold text-[#001a5a]">
                  ₪{selectedSitter.price}
                </Text>
                <Text className="text-xs font-medium text-[#43474e] ml-1">
                  {t("perHour")}
                </Text>
              </View>
              <Pressable
                className="bg-[#001a5a] px-4 py-1.5 rounded-full active:opacity-90"
                style={{
                  shadowColor: NAVY,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text className="text-sm font-bold text-white">
                  {t("bookNow")}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#e8eff1",
  },
  header: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBar: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  catActive: {
    backgroundColor: NAVY,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  catInactive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sitterCard: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderRadius: 16,
  },
});
