import { View, Text, Pressable, ScrollView, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";

export function SecurityScreen() {
  const navigation = useNavigation<any>();
  const logout = useAuthStore((s) => s.logout);
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();

  const handleDeleteAccount = () => {
    Alert.alert(t("deleteAccount"), t("deleteAccountWarning"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("deleteAccount"),
        style: "destructive",
        onPress: () => Alert.alert(t("comingSoon")),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
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
          {t("securityTitle")}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => navigation.navigate("ChangePassword")}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: colors.cardHighlight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: colors.text,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("changePassword")}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginTop: 2,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("changePasswordDesc")}
              </Text>
            </View>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={20}
              color={colors.textMuted}
            />
          </View>
        </Pressable>

        <View style={{ flex: 1, minHeight: 200 }} />

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: "#fecaca",
          }}
        >
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: colors.dangerLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: colors.danger,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("deleteAccount")}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textMuted,
                  marginTop: 2,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("deleteAccountSubtitle")}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.danger,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textInverse }}>
              {t("deleteAccount")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
