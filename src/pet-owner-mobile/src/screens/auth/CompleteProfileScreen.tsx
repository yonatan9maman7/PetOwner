import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { BrandedAppHeader } from "../../components/BrandedAppHeader";
import { authApi } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";

const PHONE_REGEX = /^0(5[0-9])\d{7}$/;

export function CompleteProfileScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const phoneRef = useRef<TextInput>(null);

  const clearRequiresPhone = useAuthStore((s) => s.clearRequiresPhone);
  const logout = useAuthStore((s) => s.logout);
  const { t, rtlText, rtlStyle, rtlRow, rtlInput, alignCls, isHebrew } = useTranslation();
  const { colors } = useTheme();

  /* Block Android hardware back button — user must complete or logout */
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  const handleSave = async () => {
    if (loading) return;
    const trimmed = phone.trim();
    if (!trimmed) {
      Alert.alert(t("errorTitle"), t("phoneInvalidFormat"));
      return;
    }
    if (!PHONE_REGEX.test(trimmed)) {
      Alert.alert(t("errorTitle"), t("phoneInvalidFormat"));
      return;
    }

    setLoading(true);
    try {
      await authApi.updatePhone(trimmed);
      await clearRequiresPhone();
    } catch (err: any) {
      if (err.response?.data?.code === "PHONE_TAKEN") {
        Alert.alert(t("errorTitle"), t("phoneTaken"));
      } else {
        Alert.alert(t("errorTitle"), t("phoneUpdateError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t("logoutButton"),
      t("completeProfileLogout"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("logoutButton"),
          style: "destructive",
          onPress: () => logout(),
        },
      ]
    );
  };

  const labelCls = `text-xs font-bold mb-2 px-1 ${alignCls} ${!isHebrew ? "uppercase tracking-widest" : ""}`;

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ marginTop: -8, backgroundColor: colors.surface }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: 4,
            paddingBottom: 120,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View className="mb-8">
            <BrandedAppHeader horizontalPadding={0} elevated={false} />
          </View>

          {/* ── Title ── */}
          <View className="mb-8">
            <Text
              style={[rtlText, { color: colors.text }]}
              className={`text-3xl font-bold mb-3 ${alignCls}`}
            >
              {t("completeProfileTitle")}
            </Text>
            <Text
              style={[rtlText, { color: colors.textSecondary }]}
              className={`text-base leading-6 ${alignCls}`}
            >
              {t("completeProfileSubtitle")}
            </Text>
          </View>

          {/* ── Phone Input ── */}
          <View className="mb-6">
            <Text
              style={[rtlText, { color: colors.textSecondary }]}
              className={labelCls}
            >
              {t("phoneLabel")}
            </Text>
            <View
              style={[
                rtlRow,
                {
                  alignItems: "center",
                  backgroundColor: colors.inputBg,
                  borderRadius: 12,
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 15,
                  minHeight: 55,
                },
              ]}
            >
              <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
              <TextInput
                ref={phoneRef}
                style={[
                  rtlInput,
                  {
                    flex: 1,
                    fontSize: 16,
                    lineHeight: 20,
                    color: colors.text,
                    padding: 0,
                  },
                ]}
                placeholder={t("phonePlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>
          </View>

          {/* ── Save Button ── */}
          <Pressable
            className="h-14 rounded-xl items-center justify-center active:opacity-90 mb-4"
            style={{ backgroundColor: colors.brand }}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text
                className="text-base font-bold"
                style={{ color: colors.textInverse }}
              >
                {t("completeProfileSave")}
              </Text>
            )}
          </Pressable>

          {/* ── Logout escape hatch ── */}
          <View style={{ marginTop: "auto", paddingTop: 16, alignItems: "center" }}>
            <Pressable onPress={handleLogout} hitSlop={8}>
              <Text
                style={[rtlStyle, { color: colors.textSecondary, fontSize: 13 }]}
              >
                {t("completeProfileLogout")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
