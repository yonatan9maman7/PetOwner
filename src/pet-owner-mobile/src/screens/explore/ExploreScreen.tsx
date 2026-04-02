import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../i18n";

export function ExploreScreen() {
  const { t, rtlStyle } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-[#f4fafd]" edges={["top"]}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-24 h-24 rounded-3xl bg-white items-center justify-center mb-6">
          <Ionicons name="map-outline" size={48} color="#001a5a" />
        </View>
        <Text
          style={rtlStyle}
          className="text-xl font-bold text-[#161d1f] text-center mb-2"
        >
          {t("exploreTitle")}
        </Text>
        <Text
          style={rtlStyle}
          className="text-sm text-[#74777f] text-center"
        >
          {t("exploreSubtitle")}
        </Text>
      </View>
    </SafeAreaView>
  );
}
