import { View, Text, Pressable } from "react-native";
import { useTranslation, type Language } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../theme/ThemeContext";

export function LanguageToggle() {
  const { language } = useTranslation();
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const { colors } = useTheme();

  const seg = (lang: Language, label: string) => {
    const active = language === lang;
    return (
      <Pressable
        onPress={() => setLanguage(lang)}
        className="px-3.5 py-1.5 rounded-full"
        style={active ? { backgroundColor: colors.brand } : undefined}
      >
        <Text
          className="text-xs font-bold"
          style={{ color: active ? colors.primaryText : colors.textSecondary }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      className="flex-row rounded-full p-0.5"
      style={{ backgroundColor: colors.surfaceSecondary }}
    >
      {seg("en", "EN")}
      {seg("he", "עב")}
    </View>
  );
}
