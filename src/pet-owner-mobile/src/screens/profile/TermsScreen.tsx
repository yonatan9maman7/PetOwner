import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";

export function TermsScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();

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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ padding: 4 }}
        >
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" }}>
          {t("termsTitle")}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
        <View
          style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Ionicons name="document-text-outline" size={36} color={colors.text} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 8 }}>
          {t("toBeContinued")}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center", lineHeight: 20 }}>
          {t("featureComingSoonDesc")}
        </Text>
      </View>
    </SafeAreaView>
  );
}
