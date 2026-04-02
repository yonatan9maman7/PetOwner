import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { AuthPlaceholder } from "../../components/AuthPlaceholder";

export function MyPetsScreen() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { t, rtlStyle } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {isLoggedIn ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="paw" size={48} color="#001a5a" />
          <Text
            style={rtlStyle}
            className="text-xl font-bold text-[#161d1f] text-center mt-4"
          >
            {t("comingSoon")}
          </Text>
          <Text
            style={rtlStyle}
            className="text-sm text-[#74777f] text-center mt-2"
          >
            {t("myPetsComingSoon")}
          </Text>
        </View>
      ) : (
        <AuthPlaceholder
          title={t("myPetsTitle")}
          subtitle={t("myPetsSubtitle")}
          icon="paw-outline"
        />
      )}
    </SafeAreaView>
  );
}
