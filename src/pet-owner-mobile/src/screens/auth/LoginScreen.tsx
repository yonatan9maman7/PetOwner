import { useState, useEffect, useRef } from "react";
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
import { LanguageToggle } from "../../components/LanguageToggle";
import { BrandedAppHeader } from "../../components/BrandedAppHeader";
import { authApi } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import * as biometricService from "../../services/biometricService";

/* ─── LoginScreen (root) ─────────────────────────────────────────── */

export function LoginScreen() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);
  const { t, rtlText, rtlStyle } = useTranslation();
  const { colors } = useTheme();

  if (isLoggedIn) {
    return (
      <SafeAreaView className="flex-1" edges={["top"]} style={{ marginTop: -8, backgroundColor: colors.surface }}>
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: colors.background }}
          >
            <Ionicons name="person" size={36} color={colors.text} />
          </View>
          <Text
            style={[rtlStyle, { color: colors.text }]}
            className="text-xl font-bold text-center mb-6"
          >
            {t("myProfile")}
          </Text>
          <Pressable
            className="py-3.5 px-10 rounded-2xl active:opacity-80"
            style={{ backgroundColor: colors.dangerLight }}
            onPress={logout}
          >
            <Text className="text-base font-bold" style={{ color: colors.danger }}>
              {t("logoutButton")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <LoginForm />;
}

/* ─── LoginForm ──────────────────────────────────────────────────── */

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [secureEntry, setSecureEntry] = useState(true);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioTypeLabel, setBioTypeLabel] = useState<biometricService.BiometricTypeLabel>("generic");
  const [autoPromptDone, setAutoPromptDone] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const navigation = useNavigation<any>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t, isHebrew, rtlText, rtlStyle, rtlRow, rtlInput, alignCls } =
    useTranslation();
  const { colors } = useTheme();

  /* ── Check biometric availability on mount ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sup, en, label] = await Promise.all([
        biometricService.isSupported(),
        biometricService.isEnabled(),
        biometricService.getSupportedTypeLabel(),
      ]);
      if (cancelled) return;
      const available = sup && en;
      setBioEnabled(available);
      setBioTypeLabel(label);
      if (available) {
        // Slight delay so the form is visible before the system prompt appears.
        setTimeout(() => runBiometricLogin(label), 400);
        setAutoPromptDone(true);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Biometric login helper ── */
  const runBiometricLogin = async (label?: biometricService.BiometricTypeLabel) => {
    const effectiveLabel = label ?? bioTypeLabel;
    const promptMessage =
      effectiveLabel === "faceId"
        ? t("biometricLoginButton")
        : t("biometricFingerprintButton");

    setBioLoading(true);
    try {
      const creds = await biometricService.authenticateAndGetCredentials(promptMessage);
      if (!creds) {
        // User cancelled — silently return to form.
        return;
      }
      const data = await authApi.login(creds);
      await setAuth(data.token, data.userId);
      navigation.navigate("Explore");
    } catch (err: any) {
      if (err?.response?.status === 401) {
        // Stored password is stale (changed elsewhere) — wipe and fall back.
        await biometricService.disable();
        setBioEnabled(false);
        Alert.alert(t("errorTitle"), t("biometricFailedFallback"));
        emailRef.current?.focus();
      } else if (err?.response) {
        Alert.alert(t("errorTitle"), t("loginError"));
      }
      // Unexpected biometric / SecureStore errors: authenticateAndGetCredentials already showed "Biometric Error".
    } finally {
      setBioLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("errorTitle"), t("fillAllFields"));
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      await setAuth(data.token, data.userId);
      navigation.navigate("Explore");
    } catch (err: any) {
      const message = err.response?.data?.message ?? t("loginError");
      Alert.alert(t("errorTitle"), message);
    } finally {
      setLoading(false);
    }
  };

  const labelCls = `text-xs font-bold mb-2 px-1 ${alignCls} ${!isHebrew ? "uppercase tracking-widest" : ""}`;

  const bioButtonLabel =
    bioTypeLabel === "faceId"
      ? t("biometricLoginButton")
      : t("biometricFingerprintButton");

  const bioIcon = bioTypeLabel === "faceId" ? "scan-circle-outline" : "finger-print";

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
          <View className="mb-8">
            <BrandedAppHeader
              horizontalPadding={0}
              elevated={false}
              trailing={<LanguageToggle />}
            />
          </View>

          {/* ── Welcome ── */}
          <View className="mb-6">
            <Text
              style={[rtlText, { color: colors.text }]}
              className={`text-3xl font-bold mb-2 ${alignCls}`}
            >
              {t("welcomeTitle")}
            </Text>
            <Text
              style={[rtlText, { color: colors.textSecondary }]}
              className={`text-base leading-6 ${alignCls}`}
            >
              {t("welcomeSubtitle")}
            </Text>
          </View>

          {/* ── Email ── */}
          <View className="mb-4">
            <Text style={[rtlText, { color: colors.textSecondary }]} className={labelCls}>
              {t("emailLabel")}
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
                testID="login-email-input"
                ref={emailRef}
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

          {/* ── Password ── */}
          <View className="mb-3">
            <Text style={[rtlText, { color: colors.textSecondary }]} className={labelCls}>
              {t("passwordLabel")}
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
                testID="login-password-input"
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

          {/* ── Forgot Password Link ── */}
          <Pressable
            className={`mb-6 ${isHebrew ? "self-end" : "self-start"}`}
            hitSlop={8}
            onPress={() => navigation.navigate("ForgotPasswordScreen")}
          >
            <Text className="text-xs font-bold" style={{ color: colors.brand }}>
              {t("forgotPassword")}
            </Text>
          </Pressable>

          {/* ── Sign-In Button ── */}
          <Pressable
            testID="login-submit-button"
            className="h-14 rounded-xl items-center justify-center active:opacity-90"
            style={{ backgroundColor: colors.brand }}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text className="text-base font-bold" style={{ color: colors.textInverse }}>
                {t("loginButton")}
              </Text>
            )}
          </Pressable>

          {/* ── Biometric Button (shown only when enabled and supported) ── */}
          {bioEnabled && (
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <Pressable
                onPress={() => runBiometricLogin()}
                disabled={bioLoading}
                style={({ pressed }) => ({
                  flexDirection: isHebrew ? "row-reverse" : "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 52,
                  borderRadius: 12,
                  paddingHorizontal: 20,
                  width: "100%",
                  backgroundColor: pressed ? colors.inputBg : colors.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: colors.border,
                })}
              >
                {bioLoading ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <>
                    <Ionicons name={bioIcon as any} size={22} color={colors.brand} />
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.brand }}>
                      {bioButtonLabel}
                    </Text>
                  </>
                )}
              </Pressable>

              {/* "Use password instead" link — appears when auto-prompted */}
              {autoPromptDone && (
                <Pressable
                  onPress={() => {
                    setAutoPromptDone(false);
                    emailRef.current?.focus();
                  }}
                  hitSlop={8}
                  style={{ marginTop: 10 }}
                >
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    {t("usePasswordInstead")}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ── Divider ── */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px" style={{ backgroundColor: colors.borderLight }} />
            <Text
              style={[rtlStyle, { color: colors.textSecondary }]}
              className={`px-4 text-xs font-bold ${!isHebrew ? "uppercase tracking-wider" : ""}`}
            >
              {t("socialDivider")}
            </Text>
            <View className="flex-1 h-px" style={{ backgroundColor: colors.borderLight }} />
          </View>

          {/* ── Social Login ── */}
          <View className="flex-row gap-4">
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-3 h-12 rounded-xl"
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.inputBg : colors.surfaceSecondary,
              })}
            >
              <Ionicons name="logo-apple" size={20} color={colors.text} />
              <Text className="text-sm font-bold" style={{ color: colors.text }}>Apple</Text>
            </Pressable>
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-3 h-12 rounded-xl"
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.inputBg : colors.surfaceSecondary,
              })}
            >
              <Ionicons name="logo-google" size={20} color={colors.text} />
              <Text className="text-sm font-bold" style={{ color: colors.text }}>Google</Text>
            </Pressable>
          </View>

          {/* ── Footer ── */}
          <View
            style={{ marginTop: "auto", paddingTop: 16, alignItems: "center" }}
          >
            <Pressable onPress={() => navigation.navigate("RegisterScreen")}>
              <Text style={[rtlStyle, { color: colors.textSecondary }]} className="text-sm">
                {t("newToCommunity")}{" "}
                <Text style={{ color: colors.text }} className="font-bold">
                  {t("createAccount")}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
