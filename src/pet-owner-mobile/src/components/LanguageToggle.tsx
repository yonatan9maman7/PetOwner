import { View, Text, Pressable } from "react-native";
import { useTranslation, type Language } from "../i18n";
import { useAuthStore } from "../store/authStore";

export function LanguageToggle() {
  const { language } = useTranslation();
  const setLanguage = useAuthStore((s) => s.setLanguage);

  const seg = (lang: Language, label: string) => {
    const active = language === lang;
    return (
      <Pressable
        onPress={() => setLanguage(lang)}
        className={`px-3.5 py-1.5 rounded-full ${active ? "bg-[#001a5a]" : ""}`}
      >
        <Text
          className={`text-xs font-bold ${active ? "text-white" : "text-[#74777f]"}`}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="flex-row bg-[#f4fafd] rounded-full p-0.5">
      {seg("en", "EN")}
      {seg("he", "עב")}
    </View>
  );
}
