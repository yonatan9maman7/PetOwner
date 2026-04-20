import { useState, useEffect, useMemo } from "react";
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

export function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [secureEntry, setSecureEntry] = useState(true);

  const navigation = useNavigation<any>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { t, language, isHebrew, rtlText, rtlStyle, rtlRow, rtlInput, alignCls } =
    useTranslation();
  const { colors } = useTheme();

  useEffect(() => {
    if (isLoggedIn) navigation.popToTop();
  }, [isLoggedIn, navigation]);

  const handleRegister = async () => {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert(t("errorTitle"), t("fillAllFields"));
      return;
    }
    if (!termsAccepted) {
      Alert.alert(t("errorTitle"), t("acceptTermsError"));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t("errorTitle"), t("passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.register({
        name: fullName,
        email,
        phone,
        password,
        role: "Owner",
        languagePreference: language,
      });
      await setAuth(data.token, data.userId);
      navigation.navigate("Explore");
    } catch (err: any) {
      const message = err.response?.data?.message ?? t("registerError");
      Alert.alert(t("errorTitle"), message);
    } finally {
      setLoading(false);
    }
  };

  const labelCls = `text-xs font-bold mb-2 px-1 ${alignCls} ${!isHebrew ? "uppercase tracking-widest" : ""}`;

  const canSubmit = useMemo(
    () =>
      fullName.trim().length > 0 &&
      email.trim().length > 0 &&
      phone.trim().length > 0 &&
      password.trim().length > 0 &&
      confirmPassword.trim().length > 0 &&
      termsAccepted,
    [fullName, email, phone, password, confirmPassword, termsAccepted],
  );

  const requiredAfterLabel = (
    <Text style={{ color: colors.danger }} accessibilityLabel="required">
      {" *"}
    </Text>
  );

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
          <View className="items-center mb-7">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: colors.brand }}
            >
              <Ionicons name="heart" size={24} color={colors.textInverse} />
            </View>
            <Text
              style={[rtlStyle, { color: colors.text }]}
              className="text-2xl font-bold text-center mb-2"
            >
              {t("registerTitle")}
            </Text>
            <Text
              style={[rtlStyle, { color: colors.textSecondary }]}
              className="text-sm text-center"
            >
              {t("registerSubtitle")}
            </Text>
          </View>

          {/* ── Full Name ── */}
          <View className="mb-4">
            <Text style={[rtlText, { color: colors.textSecondary }]} className={labelCls}>
              {t("fullNameLabel")}
              {requiredAfterLabel}
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
              <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
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
                placeholder={t("fullNamePlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          </View>

          {/* ── Email ── */}
          <View className="mb-4">
            <Text style={[rtlText, { color: colors.textSecondary }]} className={labelCls}>
              {t("emailLabel")}
              {requiredAfterLabel}
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
                placeholder={t("emailPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* ── Phone ── */}
          <View className="mb-4">
            <Text style={[rtlText, { color: colors.textSecondary }]} className={labelCls}>
              {t("phoneLabel")}
              {requiredAfterLabel}
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
                autoComplete="tel"
              />
            </View>
          </View>

          {/* ── Password ── */}
          <View className="mb-5">
            <Text style={[rtlText, { color: colors.textSecondary }]} className={labelCls}>
              {t("passwordLabel")}
              {requiredAfterLabel}
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
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.textSecondary}
              />
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
                placeholder={t("passwordPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureEntry}
              />
              <Pressable
                onPress={() => setSecureEntry((v) => !v)}
                hitSlop={8}
              >
                <Ionicons
                  name={secureEntry ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          {/* ── Confirm Password ── */}
          <View className="mb-5">
            <Text style={[rtlText, { color: colors.textSecondary }]} className={labelCls}>
              {t("confirmPasswordLabel")}
              {requiredAfterLabel}
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
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.textSecondary}
              />
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
                placeholder={t("confirmPasswordPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={secureEntry}
              />
              <Pressable
                onPress={() => setSecureEntry((v) => !v)}
                hitSlop={8}
              >
                <Ionicons
                  name={secureEntry ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          {/* ── Terms ── */}
          <Pressable
            style={rtlRow}
            className="items-center gap-3 mb-6"
            onPress={() => setTermsAccepted((v) => !v)}
          >
            <View
              className="w-5 h-5 rounded border-2 items-center justify-center"
              style={
                termsAccepted
                  ? { backgroundColor: colors.brand, borderColor: colors.brand }
                  : { borderColor: colors.textSecondary }
              }
            >
              {termsAccepted && (
                <Ionicons name="checkmark" size={14} color={colors.textInverse} />
              )}
            </View>
            <Text style={[rtlText, { color: colors.textSecondary }]} className="text-sm flex-1">
              <Text style={{ color: colors.danger }} accessibilityLabel="required">
                *{" "}
              </Text>
              {t("termsAgree")}{" "}
              <Text style={{ color: colors.primary }} className="font-bold">
                {t("termsOfService")}
              </Text>
            </Text>
          </Pressable>

          {/* ── Register Button ── */}
          <Pressable
            className="h-14 rounded-xl items-center justify-center"
            style={{
              backgroundColor: colors.brand,
              opacity: loading || !canSubmit ? 0.45 : 1,
            }}
            onPress={handleRegister}
            disabled={loading || !canSubmit}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text className="text-base font-bold" style={{ color: colors.textInverse }}>
                {t("registerButton")}
              </Text>
            )}
          </Pressable>

          {/* ── Footer ── */}
          <View
            style={{ marginTop: "auto", paddingTop: 20, alignItems: "center" }}
          >
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={[rtlStyle, { color: colors.textSecondary }]} className="text-sm">
                {t("alreadyHaveAccount")}{" "}
                <Text style={{ color: colors.text }} className="font-bold">
                  {t("signIn")}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
