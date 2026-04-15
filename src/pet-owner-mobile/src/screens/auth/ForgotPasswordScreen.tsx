import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { BrandedAppHeader } from "../../components/BrandedAppHeader";
import { LanguageToggle } from "../../components/LanguageToggle";
import { authApi } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation<any>();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { t, isHebrew, rtlText, rtlStyle, rtlRow, rtlInput, alignCls } =
    useTranslation();
  const { colors } = useTheme();

  useEffect(() => {
    if (isLoggedIn) navigation.popToTop();
  }, [isLoggedIn, navigation]);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t("errorTitle"), t("fillAllFields"));
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      Alert.alert(t("resetSentTitle"), t("resetSentMessage"), [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const message = err.response?.data?.message ?? t("forgotError");
      Alert.alert(t("errorTitle"), message);
    } finally {
      setLoading(false);
    }
  };

  const labelCls = `text-xs font-bold mb-2 px-1 ${alignCls} ${!isHebrew ? "uppercase tracking-widest" : ""}`;

  return (
    <SafeAreaView className="flex-1" edges={["top"]} style={{ marginTop: -8, backgroundColor: colors.surface }}>
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
          {/* ── Header: brand + language ── */}
          <View className="mb-6">
            <BrandedAppHeader
              horizontalPadding={0}
              elevated={false}
              trailing={<LanguageToggle />}
            />
          </View>

          {/* ── Hero ── */}
          <View className="items-center mb-8">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: colors.primary }}
            >
              <Ionicons name="mail" size={24} color={colors.textInverse} />
            </View>
            <Text
              style={[rtlStyle, { color: colors.text }]}
              className="text-2xl font-bold text-center mb-2"
            >
              {t("forgotTitle")}
            </Text>
            <Text
              style={[rtlStyle, { color: colors.textSecondary }]}
              className="text-sm text-center leading-5 px-2"
            >
              {t("forgotSubtitle")}
            </Text>
          </View>

          {/* ── Email ── */}
          <View className="mb-6">
            <Text style={[rtlText, { color: colors.textSecondary }]} className={labelCls}>
              {t("forgotEmailLabel")}
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
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              <TextInput
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
                placeholder={t("forgotEmailPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* ── Send Reset Button ── */}
          <Pressable
            className="h-14 rounded-xl items-center justify-center active:opacity-90"
            style={{ backgroundColor: colors.primary }}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text className="text-base font-bold" style={{ color: colors.textInverse }}>
                {t("sendResetLink")}
              </Text>
            )}
          </Pressable>

          {/* ── Footer ── */}
          <View
            style={{ marginTop: "auto", paddingTop: 16, alignItems: "center" }}
          >
            <Pressable onPress={() => navigation.goBack()}>
              <Text
                style={[rtlStyle, { color: colors.textSecondary }]}
                className="text-sm font-bold"
              >
                {t("backToLogin")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
