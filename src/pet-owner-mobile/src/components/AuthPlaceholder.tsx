import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "../i18n";
import { useTheme } from "../theme/ThemeContext";

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
  const { colors } = useTheme();

  return (
    <View className="flex-1 items-center justify-center px-10">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-8"
        style={{ backgroundColor: colors.background }}
      >
        <Ionicons name={icon} size={36} color={colors.text} />
      </View>

      <Text
        style={[rtlStyle, { color: colors.text }]}
        className="text-2xl font-bold text-center mb-3"
      >
        {title}
      </Text>

      <Text
        style={[rtlStyle, { color: colors.textSecondary }]}
        className="text-base text-center leading-6 mb-10 px-2"
      >
        {subtitle}
      </Text>

      <Pressable
        className="w-full h-14 rounded-2xl items-center justify-center active:opacity-90"
        style={{ backgroundColor: colors.brand }}
        onPress={() => navigation.navigate("Login")}
      >
        <Text className="text-base font-bold" style={{ color: colors.primaryText }}>
          {t("loginButton")}
        </Text>
      </Pressable>
    </View>
  );
}
