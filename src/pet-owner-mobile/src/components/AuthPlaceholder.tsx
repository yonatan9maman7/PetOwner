import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "../i18n";

interface AuthPlaceholderProps {
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function AuthPlaceholder({
  title,
  subtitle,
  icon = "lock-closed-outline",
}: AuthPlaceholderProps) {
  const navigation = useNavigation<any>();
  const { t, rtlStyle } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center px-10">
      <View className="w-20 h-20 rounded-full bg-[#f4fafd] items-center justify-center mb-8">
        <Ionicons name={icon} size={36} color="#001a5a" />
      </View>

      <Text
        style={rtlStyle}
        className="text-2xl font-bold text-[#161d1f] text-center mb-3"
      >
        {title}
      </Text>

      <Text
        style={rtlStyle}
        className="text-base text-[#74777f] text-center leading-6 mb-10 px-2"
      >
        {subtitle}
      </Text>

      <Pressable
        className="w-full h-14 rounded-2xl items-center justify-center bg-[#001a5a] active:opacity-90"
        onPress={() => navigation.navigate("Login")}
      >
        <Text className="text-white text-base font-bold">
          {t("loginButton")}
        </Text>
      </Pressable>
    </View>
  );
}
