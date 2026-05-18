import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { LanguageToggle } from "../../components/LanguageToggle";
import { authApi } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import { useKeyboardAvoidingState } from "../../hooks/useKeyboardAvoidingState";
import { getNormalizedApiError } from "../../utils/apiUtils";
import { mapAuthApiErrorToTranslationKey } from "../../utils/authErrorI18n";
import { isValidEmailFormat } from "../../utils/emailValidation";
import { isValidPhoneFormat } from "../../utils/phoneValidation";

const AUTH_PETCARE_HERO_LOGO = require("../../../assets/petcare-logo-transparent.png");

const MIN_PASSWORD_LENGTH = 6;

function InlineFieldError({
  message,
  rtlText,
  colors,
}: {
  message: string | null;
  rtlText: { textAlign: "right" | "left"; writingDirection: "rtl" | "ltr" };
  colors: { danger: string };
}) {
  if (!message) return null;
  return (
    <Text
      accessibilityRole="alert"
      style={[
        rtlText,
        {
          color: colors.danger,
          fontSize: 12,
          marginTop: 6,
          lineHeight: 16,
        },
      ]}
      className="px-1"
    >
      {message}
    </Text>
  );
}

export function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [secureEntry, setSecureEntry] = useState(true);

  const clearAuthError = useCallback(() => setErrorMessage(null), []);

  const fullNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const navigation = useNavigation<any>();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const insets = useSafeAreaInsets();
  const { t, language, isHebrew, rtlText, rtlStyle, rtlRow, rtlInput, alignCls } =
    useTranslation();
  const { colors, isDark } = useTheme();
  const { behavior: keyboardAvoidBehavior } = useKeyboardAvoidingState();

  /** Dark theme `brand` matches page chrome; use accent fill for terms checkbox + CTA. */
  const termsCheckboxAccent = isDark ? colors.primary : colors.brand;
  const termsCheckboxUncheckedBorder = isDark ? "rgba(232, 237, 244, 0.55)" : colors.textSecondary;
  const registerCtaBackground = isDark ? colors.primary : colors.brand;
  const onRegisterCtaLabel = colors.primaryText;

  const heroBackgroundColor = "#081B3E";
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

  useEffect(() => {
    const src = Image.resolveAssetSource(AUTH_PETCARE_HERO_LOGO);
    if (src?.uri) {
      Image.prefetch(src.uri).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) navigation.popToTop();
  }, [isLoggedIn, navigation]);

  const handleRegister = async () => {
    if (loading) return;

    setErrorMessage(null);
    setFullNameError(null);
    setEmailError(null);
    setPhoneError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setTermsError(null);

    let valid = true;

    if (!fullName.trim()) {
      setFullNameError(t("fieldRequiredShort"));
      valid = false;
    }
    if (!email.trim()) {
      setEmailError(t("fieldRequiredShort"));
      valid = false;
    } else if (!isValidEmailFormat(email)) {
      setEmailError(t("invalid_email_format"));
      valid = false;
    }
    if (!phone.trim()) {
      setPhoneError(t("fieldRequiredShort"));
      valid = false;
    } else if (!isValidPhoneFormat(phone)) {
      setPhoneError(t("invalid_phone") || "Please enter a valid phone number");
      valid = false;
    }
    if (!password.trim()) {
      setPasswordError(t("fieldRequiredShort"));
      valid = false;
    } else if (password.trim().length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t("passwordMinLengthRegister"));
      valid = false;
    }
    if (!confirmPassword.trim()) {
      setConfirmPasswordError(t("fieldRequiredShort"));
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError(t("passwordMismatch"));
      valid = false;
    }
    if (!termsAccepted) {
      setTermsError(t("acceptTermsError"));
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    try {
      await authApi.register({
        name: fullName,
        email,
        phone: phone.trim(),
        password,
        role: "Owner",
        languagePreference: language,
      });
      showGlobalAlertCompat(
        t("registerSuccessTitle"),
        t("registerSuccessMessage"),
        [
          {
            text: t("alertDismissOk"),
            style: "default",
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{ name: "LoginScreen" }],
              }),
          },
        ],
      );
    } catch (err: unknown) {
      const key = mapAuthApiErrorToTranslationKey(getNormalizedApiError(err));
      setErrorMessage(t(key));
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
          source={AUTH_PETCARE_HERO_LOGO}
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
          {/* Title + language: EN title left | toggle right; HE toggle left | title right (rtlRow) */}
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
                className={`text-2xl font-bold ${alignCls}`}
                numberOfLines={2}
              >
                {t("registerTitle")}
              </Text>
              <LanguageToggle />
            </View>
            <Text
              style={[rtlText, { color: colors.textSecondary }]}
              className={`text-sm leading-5 ${alignCls}`}
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
                ref={fullNameRef}
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
                onChangeText={(v) => {
                  clearAuthError();
                  setFullNameError(null);
                  setFullName(v);
                }}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
            <InlineFieldError message={fullNameError} rtlText={rtlText} colors={colors} />
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
                onChangeText={(v) => {
                  clearAuthError();
                  setEmailError(null);
                  setEmail(v);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                ref={emailRef}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            </View>
            <InlineFieldError message={emailError} rtlText={rtlText} colors={colors} />
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
                onChangeText={(v) => {
                  clearAuthError();
                  setPhoneError(null);
                  setPhone(v);
                }}
                keyboardType="phone-pad"
                autoComplete="tel"
                ref={phoneRef}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
            <InlineFieldError message={phoneError} rtlText={rtlText} colors={colors} />
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
                  setPasswordError(null);
                  setConfirmPasswordError(null);
                  setPassword(v);
                }}
                secureTextEntry={secureEntry}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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
            <InlineFieldError message={passwordError} rtlText={rtlText} colors={colors} />
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
                ref={confirmPasswordRef}
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
                onChangeText={(v) => {
                  clearAuthError();
                  setConfirmPasswordError(null);
                  setConfirmPassword(v);
                }}
                secureTextEntry={secureEntry}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
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
            <InlineFieldError message={confirmPasswordError} rtlText={rtlText} colors={colors} />
          </View>

          {/* ── Terms ── */}
          <View className="mb-6">
            <Pressable
              style={rtlRow}
              className="items-center gap-3"
              onPress={() => {
                clearAuthError();
                setTermsError(null);
                setTermsAccepted((v) => !v);
              }}
            >
              <View
                className="w-5 h-5 rounded border-2 items-center justify-center"
                style={
                  termsAccepted
                    ? { backgroundColor: termsCheckboxAccent, borderColor: termsCheckboxAccent }
                    : {
                        borderColor: termsCheckboxUncheckedBorder,
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "transparent",
                      }
                }
              >
                {termsAccepted && (
                  <Ionicons name="checkmark" size={14} color={onRegisterCtaLabel} />
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
            <InlineFieldError message={termsError} rtlText={rtlText} colors={colors} />
          </View>

          {errorMessage ? (
            <Text
              accessibilityRole="alert"
              style={[
                rtlText,
                {
                  color: colors.danger,
                  marginBottom: 12,
                  textAlign: isHebrew ? "right" : "left",
                },
              ]}
              className="text-sm leading-5 px-1"
            >
              {errorMessage}
            </Text>
          ) : null}

          {/* ── Register Button ── */}
          <Pressable
            className="h-14 rounded-xl items-center justify-center"
            style={{
              backgroundColor: registerCtaBackground,
              opacity: loading || !canSubmit ? 0.45 : 1,
            }}
            onPress={handleRegister}
            disabled={loading || !canSubmit}
          >
            {loading ? (
              <ActivityIndicator color={onRegisterCtaLabel} />
            ) : (
              <Text className="text-base font-bold" style={{ color: onRegisterCtaLabel }}>
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
    </View>
  );
}
