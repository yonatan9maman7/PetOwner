import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { getNormalizedApiError } from "../../utils/apiUtils";
import { mapAuthApiErrorToTranslationKey } from "../../utils/authErrorI18n";
import { LanguageToggle } from "../../components/LanguageToggle";
import { authApi } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import { useKeyboardAvoidingState } from "../../hooks/useKeyboardAvoidingState";
import * as biometricService from "../../services/biometricService";

WebBrowser.maybeCompleteAuthSession();

const LOGIN_HERO_LOGO = require("../../../assets/petcare-logo-transparent.png");

/** True when `expo-auth-session` Google provider has the client IDs it requires for this OS. */
function hasGoogleOAuthEnvForCurrentPlatform(): boolean {
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!web) return false;
  if (Platform.OS === "android") {
    return Boolean(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim());
  }
  if (Platform.OS === "ios") {
    return Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim());
  }
  return true;
}

type GoogleSignInControlProps = {
  socialLoading: boolean;
  colors: { text: string; inputBg: string; surfaceSecondary: string };
  rtlRow: Record<string, unknown>;
  onIdToken: (idToken: string) => void;
  onFlowError: () => void;
};

/** Isolated so `Google.useAuthRequest` is only mounted when env is complete (avoids render-time invariant). */
function GoogleSignInControl({
  socialLoading,
  colors,
  rtlRow,
  onIdToken,
  onFlowError,
}: GoogleSignInControlProps) {
  /** Must match `expo.scheme` in app.json so the standalone app receives the OAuth return (default uses `applicationId:` which does not match intent filters). */
  const googleRedirectUri = useMemo(
    () =>
      makeRedirectUri({
        scheme: "petowner",
        path: "oauthredirect",
      }),
    [],
  );

  const [_googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri: googleRedirectUri,
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.authentication?.idToken;
      if (!idToken) {
        onFlowError();
        return;
      }
      onIdToken(idToken);
    } else if (googleResponse?.type === "error") {
      onFlowError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- use latest handlers from parent
  }, [googleResponse]);

  return (
    <Pressable
      className="flex-1 items-center justify-center gap-3 h-12 rounded-xl"
      style={({ pressed }) => ({
        ...rtlRow,
        backgroundColor: pressed ? colors.inputBg : colors.surfaceSecondary,
      })}
      onPress={() => {
        void promptGoogleAsync();
      }}
      disabled={socialLoading}
    >
      {socialLoading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color={colors.text} />
          <Text className="text-sm font-bold" style={{ color: colors.text }}>
            Google
          </Text>
        </>
      )}
    </Pressable>
  );
}

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioTypeLabel, setBioTypeLabel] = useState<biometricService.BiometricTypeLabel>("generic");
  /** When false and biometrics are on, show biometric-first layout (no email/password). */
  const [showPasswordForm, setShowPasswordForm] = useState(true);
  const showPasswordFormRef = useRef(showPasswordForm);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    showPasswordFormRef.current = showPasswordForm;
  }, [showPasswordForm]);
  const navigation = useNavigation<any>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const insets = useSafeAreaInsets();
  const { t, isHebrew, rtlText, rtlStyle, rtlRow, rtlInput, alignCls, trailingFormLinkAlign } =
    useTranslation();
  const { colors, isDark } = useTheme();
  const { behavior: keyboardAvoidBehavior } = useKeyboardAvoidingState();

  /** Text on filled `colors.brand` controls; `textInverse` matches `brand` in dark theme and disappears. */
  const onBrandLabelColor = colors.primaryText;
  /** Forgot password: legible on dark hero/surface (see theme dark `brand` vs background). */
  const forgotPasswordColor = isDark ? "#E0E0E0" : "#333333";
  const usePasswordInsteadColor = isDark ? "#E0E0E0" : colors.brand;

  const clearAuthError = useCallback(() => setErrorMessage(null), []);

  const showGoogleButton = hasGoogleOAuthEnvForCurrentPlatform();
  const showSocialSection = Platform.OS === "ios" || showGoogleButton;

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
    let bioTimer: ReturnType<typeof setTimeout> | undefined;
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
        setShowPasswordForm(false);
        bioTimer = setTimeout(() => {
          if (!showPasswordFormRef.current) {
            void runBiometricLogin(label);
          }
        }, 400);
      }
    })();
    return () => { cancelled = true; if (bioTimer) clearTimeout(bioTimer); };
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
        setShowPasswordForm(true);
        setErrorMessage(t("biometricFailedFallback"));
        emailRef.current?.focus();
      } else if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: unknown }).response
      ) {
        const key = mapAuthApiErrorToTranslationKey(getNormalizedApiError(err));
        setErrorMessage(t(key));
      }
      // Unexpected biometric / SecureStore errors: authenticateAndGetCredentials already showed "Biometric Error".
    } finally {
      setBioLoading(false);
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      showGlobalAlertCompat(t("errorTitle"), t("fillAllFields"));
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      await setAuth(data.token, data.userId);
      navigation.navigate("Explore");
    } catch (err: unknown) {
      const key = mapAuthApiErrorToTranslationKey(getNormalizedApiError(err));
      setErrorMessage(t(key));
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
    setErrorMessage(null);
    try {
      const data = await authApi.socialLogin({
        provider,
        idToken,
        ...options,
      });
      await setAuth(data.token, data.userId, data.requiresPhone);
    } catch (err: unknown) {
      const key = mapAuthApiErrorToTranslationKey(getNormalizedApiError(err));
      setErrorMessage(t(key));
    } finally {
      setSocialLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    showGlobalAlertCompat("בפיתוח", "התחברות עם אפל תתאפשר בעדכון הבא");

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
    //     showGlobalAlertCompat(t("errorTitle"), t("socialLoginFailed"));
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
    //   showGlobalAlertCompat(t("errorTitle"), t("socialLoginFailed"));
    // }
  };

  const labelCls = `text-xs font-bold mb-2 px-1 ${alignCls} ${!isHebrew ? "uppercase tracking-widest" : ""}`;

  const bioButtonLabel =
    bioTypeLabel === "faceId"
      ? t("biometricLoginButton")
      : t("biometricFingerprintButton");

  const bioIcon = bioTypeLabel === "faceId" ? "scan-circle-outline" : "finger-print";
  const showBiometricLanding = bioEnabled && !showPasswordForm;
  const showCredentialForm = !bioEnabled || showPasswordForm;
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
        behavior={keyboardAvoidBehavior}
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
          {showBiometricLanding ? (
            <View
              style={[
                rtlRow,
                {
                  width: "100%",
                  justifyContent: "flex-end",
                  marginBottom: 8,
                },
              ]}
            >
              <LanguageToggle />
            </View>
          ) : (
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
          )}

          {showBiometricLanding ? (
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              {errorMessage ? (
                <Text
                  accessibilityRole="alert"
                  style={[
                    rtlText,
                    {
                      color: colors.danger,
                      marginBottom: 16,
                      textAlign: isHebrew ? "right" : "left",
                      width: "100%",
                    },
                  ]}
                  className="text-sm leading-5 px-1"
                >
                  {errorMessage}
                </Text>
              ) : null}

              <Pressable
                testID="login-biometric-primary"
                onPress={() => runBiometricLogin()}
                disabled={bioLoading}
                style={({ pressed }) => ({
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 32,
                  paddingHorizontal: 24,
                  borderRadius: 16,
                  backgroundColor: colors.brand,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                {bioLoading ? (
                  <ActivityIndicator color={onBrandLabelColor} size="large" />
                ) : (
                  <>
                    <Ionicons name={bioIcon as any} size={56} color={onBrandLabelColor} />
                    <Text
                      style={{
                        marginTop: 14,
                        fontSize: 17,
                        fontWeight: "700",
                        color: onBrandLabelColor,
                        textAlign: "center",
                      }}
                    >
                      {bioButtonLabel}
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  clearAuthError();
                  setShowPasswordForm(true);
                  requestAnimationFrame(() => emailRef.current?.focus());
                }}
                hitSlop={12}
                style={{ marginTop: 20 }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: usePasswordInsteadColor }}>
                  {t("usePasswordInstead")}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {showCredentialForm ? (
            <>
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
                    onChangeText={(v) => {
                      clearAuthError();
                      setEmail(v);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    textContentType="username"
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
                    onChangeText={(v) => {
                      clearAuthError();
                      setPassword(v);
                    }}
                    secureTextEntry={secureEntry}
                    textContentType="password"
                    autoComplete="password"
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
                className="mb-2"
                style={trailingFormLinkAlign}
                hitSlop={8}
                onPress={() => navigation.navigate("ForgotPasswordScreen")}
              >
                <Text className="text-xs font-bold" style={{ color: forgotPasswordColor }}>
                  {t("forgotPassword")}
                </Text>
              </Pressable>

              {errorMessage ? (
                <Text
                  accessibilityRole="alert"
                  style={[
                    rtlText,
                    {
                      color: colors.danger,
                      marginBottom: 14,
                      textAlign: isHebrew ? "right" : "left",
                    },
                  ]}
                  className="text-sm leading-5 px-1"
                >
                  {errorMessage}
                </Text>
              ) : (
                <View style={{ height: 10 }} />
              )}

              {/* ── Sign-In Button ── */}
              <Pressable
                testID="login-submit-button"
                className="h-14 rounded-xl items-center justify-center active:opacity-90"
                style={{ backgroundColor: colors.brand }}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={onBrandLabelColor} />
                ) : (
                  <Text className="text-base font-bold" style={{ color: onBrandLabelColor }}>
                    {t("loginButton")}
                  </Text>
                )}
              </Pressable>

              {bioEnabled ? (
                <Pressable
                  testID="login-biometric-switch-back"
                  accessibilityRole="button"
                  accessibilityLabel={bioButtonLabel}
                  onPress={() => {
                    clearAuthError();
                    setShowPasswordForm(false);
                  }}
                  hitSlop={12}
                  style={[
                    rtlRow,
                    {
                      marginTop: 14,
                      alignSelf: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      alignItems: "center",
                      gap: 6,
                    },
                  ]}
                >
                  <Ionicons name={bioIcon as any} size={20} color={colors.textSecondary} />
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>{bioButtonLabel}</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {/* ── Divider + social (only when at least one provider is available) ── */}
          {showSocialSection && (
            <>
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
                        <Text className="text-sm font-bold" style={{ color: colors.text }}>
                          Apple
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
                {showGoogleButton && (
                  <GoogleSignInControl
                    socialLoading={socialLoading}
                    colors={colors}
                    rtlRow={rtlRow}
                    onIdToken={(idToken) => void handleSocialLoginToken("Google", idToken)}
                    onFlowError={() => setErrorMessage(t("socialLoginFailed"))}
                  />
                )}
              </View>
            </>
          )}

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
