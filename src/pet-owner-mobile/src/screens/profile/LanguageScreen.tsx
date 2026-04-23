import { View, Text, Pressable, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import type { Language } from "../../i18n";

const LANGUAGES: { id: Language; label: string; nativeLabel: string }[] = [
  { id: "en", label: "English", nativeLabel: "English" },
  { id: "he", label: "Hebrew", nativeLabel: "עברית" },
];

export function LanguageScreen() {
  const navigation = useNavigation<any>();
  const { language, setLanguage } = useAuthStore();
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
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
          {t("selectLanguage")}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={{ padding: 20 }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          {LANGUAGES.map((lang, idx) => {
            const active = language === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                onPress={() => handleSelect(lang.id)}
                activeOpacity={0.6}
                style={{
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  alignItems: "center",
                  paddingVertical: 16,
                  paddingHorizontal: 18,
                  backgroundColor: active ? colors.cardHighlight : "transparent",
                  borderBottomWidth: idx < LANGUAGES.length - 1 ? 1 : 0,
                  borderBottomColor: colors.borderLight,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: active ? colors.text : colors.surfaceSecondary,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: isRTL ? 14 : 0,
                    marginRight: isRTL ? 0 : 14,
                  }}
                >
                  <Ionicons
                    name="globe-outline"
                    size={20}
                    color={active ? colors.textInverse : colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {lang.nativeLabel}
                  </Text>
                  {lang.nativeLabel !== lang.label && (
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textMuted,
                        marginTop: 2,
                        textAlign: isRTL ? "right" : "left",
                      }}
                    >
                      {lang.label}
                    </Text>
                  )}
                </View>

                {active ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.primary}
                    style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: colors.border,
                      marginLeft: isRTL ? 0 : 8,
                      marginRight: isRTL ? 8 : 0,
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
