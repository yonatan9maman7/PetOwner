import { useState, useEffect, useRef, useCallback } from "react";
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
  Animated,
  Easing,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
// Paused until Apple Developer Program enrollment — restore when enabling Sign in with Apple.
// import * as AppleAuthentication from "expo-apple-authentication";
// import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { getNormalizedApiError } from "../../utils/apiUtils";
import { showApiErrorToast } from "../../services/apiErrorToast";
import { LanguageToggle } from "../../components/LanguageToggle";
import { authApi } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import * as biometricService from "../../services/biometricService";

WebBrowser.maybeCompleteAuthSession();

const LOGIN_HERO_LOGO = require("../../../assets/petcare-logo-transparent.png");

const KEYBOARD_AVOID_BEHAVIOR: "padding" | "height" =
  Platform.OS === "ios" ? "padding" : "height";

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
  const [socialLoading, setSocialLoading] = useState(false);
  const [secureEntry, setSecureEntry] = useState(true);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioTypeLabel, setBioTypeLabel] = useState<biometricService.BiometricTypeLabel>("generic");
  const [autoPromptDone, setAutoPromptDone] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const navigation = useNavigation<any>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const insets = useSafeAreaInsets();
  const { t, isHebrew, rtlText, rtlStyle, rtlRow, rtlInput, alignCls, trailingFormLinkAlign } =
    useTranslation();
  const { colors } = useTheme();

  const [_googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  /* Warm hero logo decode/cache as soon as the screen mounts */
  useEffect(() => {
    const src = Image.resolveAssetSource(LOGIN_HERO_LOGO);
    if (src?.uri) {
      Image.prefetch(src.uri).catch(() => {});
    }
  }, []);

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

  /* ── Check Apple availability on mount (iOS only) — paused with Sign in with Apple
  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    }
  }, []);
  ── */

  /* ── Handle Google auth result ── */
  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.authentication?.idToken;
      if (!idToken) {
        showApiErrorToast({
          message: t("socialLoginFailed"),
          title: t("errorTitle"),
          isConnectivityError: false,
          isAuthError: false,
          isServerError: false,
        });
        return;
      }
      handleSocialLoginToken("Google", idToken);
    } else if (googleResponse?.type === "error") {
      showApiErrorToast({
        message: t("socialLoginFailed"),
        title: t("errorTitle"),
        isConnectivityError: false,
        isAuthError: false,
        isServerError: false,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse]);

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
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 401
      ) {
        // Stored password is stale (changed elsewhere) — wipe and fall back.
        await biometricService.disable();
        setBioEnabled(false);
        showApiErrorToast({
          message: t("biometricFailedFallback"),
          title: t("errorTitle"),
          isConnectivityError: false,
          isAuthError: true,
          isServerError: false,
        });
        emailRef.current?.focus();
      } else if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: unknown }).response
      ) {
        showApiErrorToast(getNormalizedApiError(err));
      }
      // Unexpected biometric / SecureStore errors: authenticateAndGetCredentials already showed "Biometric Error".
    } finally {
      setBioLoading(false);
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("errorTitle"), t("fillAllFields"));
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      await setAuth(data.token, data.userId);
      navigation.navigate("Explore");
    } catch (err: unknown) {
      showApiErrorToast(getNormalizedApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLoginToken = async (
    provider: "Google" | "Apple",
    idToken: string,
    options?: { givenName?: string; familyName?: string; rawNonce?: string }
  ) => {
    setSocialLoading(true);
    try {
      const data = await authApi.socialLogin({
        provider,
        idToken,
        ...options,
      });
      await setAuth(data.token, data.userId, data.requiresPhone);
    } catch (err: unknown) {
      const status =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status;
      if (status === 409) {
        showApiErrorToast({
          message: t("socialLoginEmailExists"),
          title: t("errorTitle"),
          isConnectivityError: false,
          isAuthError: false,
          isServerError: false,
        });
      } else {
        showApiErrorToast(getNormalizedApiError(err));
      }
    } finally {
      setSocialLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    Alert.alert("בפיתוח", "התחברות עם אפל תתאפשר בעדכון הבא");

    // ── Sign in with Apple (restore when enrolled in Apple Developer Program) ──
    // try {
    //   const rawNonce = Array.from(
    //     await Crypto.getRandomBytesAsync(32),
    //     (b) => b.toString(16).padStart(2, "0")
    //   ).join("");
    //   const hashedNonce = await Crypto.digestStringAsync(
    //     Crypto.CryptoDigestAlgorithm.SHA256,
    //     rawNonce
    //   );
    //
    //   const credential = await AppleAuthentication.signInAsync({
    //     requestedScopes: [
    //       AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    //       AppleAuthentication.AppleAuthenticationScope.EMAIL,
    //     ],
    //     nonce: hashedNonce,
    //   });
    //
    //   if (!credential.identityToken) {
    //     Alert.alert(t("errorTitle"), t("socialLoginFailed"));
    //     return;
    //   }
    //
    //   await handleSocialLoginToken("Apple", credential.identityToken, {
    //     givenName: credential.fullName?.givenName ?? undefined,
    //     familyName: credential.fullName?.familyName ?? undefined,
    //     rawNonce,
    //   });
    // } catch (err: any) {
    //   if (err.code === "ERR_REQUEST_CANCELED") {
    //     return; // silent cancel
    //   }
    //   Alert.alert(t("errorTitle"), t("socialLoginFailed"));
    // }
  };

  const handleGoogleSignIn = async () => {
    await promptGoogleAsync();
  };

  const labelCls = `text-xs font-bold mb-2 px-1 ${alignCls} ${!isHebrew ? "uppercase tracking-widest" : ""}`;

  const bioButtonLabel =
    bioTypeLabel === "faceId"
      ? t("biometricLoginButton")
      : t("biometricFingerprintButton");

  const bioIcon = bioTypeLabel === "faceId" ? "scan-circle-outline" : "finger-print";
  const heroBackgroundColor = "#081B3E";
  /**
   * Logo reveal tuning (local ≈ production; tunnel is slower before onLoad):
   * - Lower OPACITY_START = stronger fade (0.35–0.55 typical). Above ~0.75 feels “no fade”.
   * - Lower SCALE_START = more “pop” (0.965–0.985). Above ~0.99 is basically invisible.
   * - FADE_MS = opacity  → 1 duration. SCALE_MS often slightly shorter feels natural.
   */
  const LOGO_REVEAL_OPACITY_START = 0.35;
  const LOGO_REVEAL_SCALE_START = 0.6;
  const LOGO_FADE_MS = 880;
  const LOGO_SCALE_MS = 420;

  const logoOpacity = useRef(new Animated.Value(LOGO_REVEAL_OPACITY_START)).current;
  const logoScale = useRef(new Animated.Value(LOGO_REVEAL_SCALE_START)).current;

  const startLogoReveal = useCallback(() => {
    logoOpacity.stopAnimation();
    logoScale.stopAnimation();
    logoOpacity.setValue(LOGO_REVEAL_OPACITY_START);
    logoScale.setValue(LOGO_REVEAL_SCALE_START);
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: LOGO_FADE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: LOGO_SCALE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale]);

  useFocusEffect(
    useCallback(() => {
      startLogoReveal();
      return () => {
        logoOpacity.stopAnimation();
        logoScale.stopAnimation();
      };
    }, [startLogoReveal, logoOpacity, logoScale]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View
        style={{
          backgroundColor: heroBackgroundColor,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
          paddingTop: insets.top + 6,
          paddingBottom: 22,
          paddingHorizontal: 20,
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <Ionicons
            name="paw-outline"
            size={88}
            color="rgba(255,255,255,0.08)"
            style={{ position: "absolute", left: 18, top: insets.top + 14 }}
          />
          <Ionicons
            name="paw-outline"
            size={64}
            color="rgba(255,255,255,0.06)"
            style={{ position: "absolute", left: 84, top: insets.top + 72 }}
          />
          <Ionicons
            name="paw-outline"
            size={80}
            color="rgba(255,255,255,0.08)"
            style={{ position: "absolute", right: 24, top: insets.top + 20 }}
          />
          <Ionicons
            name="paw-outline"
            size={58}
            color="rgba(255,255,255,0.05)"
            style={{ position: "absolute", right: 94, top: insets.top + 88 }}
          />
        </View>
        <Animated.Image
          source={LOGIN_HERO_LOGO}
          style={{
            width: "100%",
            maxWidth: 326,
            height: 152,
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
          resizeMode="contain"
          onLoad={startLogoReveal}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={KEYBOARD_AVOID_BEHAVIOR}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: 8,
            paddingBottom: 120 + insets.bottom,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          {/* ── Welcome + language (one row: EN title | toggle, HE toggle | title via rtlRow) ── */}
          <View className="mb-5">
            <View
              style={[
                rtlRow,
                {
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                },
              ]}
            >
              <Text
                style={[rtlText, { color: colors.text, flex: 1, minWidth: 0 }]}
                className={`text-3xl font-bold ${alignCls}`}
                numberOfLines={2}
              >
                {t("welcomeTitle")}
              </Text>
              <LanguageToggle />
            </View>
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
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
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
                ref={passwordRef}
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
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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
            className="mb-6"
            style={trailingFormLinkAlign}
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
                  ...rtlRow,
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
            {Platform.OS === "ios" && (
              <Pressable
                className="flex-1 items-center justify-center gap-3 h-12 rounded-xl"
                style={({ pressed }) => ({
                  ...rtlRow,
                  backgroundColor: pressed ? colors.inputBg : colors.surfaceSecondary,
                })}
                onPress={handleAppleSignIn}
                disabled={socialLoading}
              >
                {socialLoading ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={20} color={colors.text} />
                    <Text className="text-sm font-bold" style={{ color: colors.text }}>Apple</Text>
                  </>
                )}
              </Pressable>
            )}
            <Pressable
              className="flex-1 items-center justify-center gap-3 h-12 rounded-xl"
              style={({ pressed }) => ({
                ...rtlRow,
                backgroundColor: pressed ? colors.inputBg : colors.surfaceSecondary,
              })}
              onPress={handleGoogleSignIn}
              disabled={socialLoading}
            >
              {socialLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color={colors.text} />
                  <Text className="text-sm font-bold" style={{ color: colors.text }}>Google</Text>
                </>
              )}
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
    </View>
  );
}
