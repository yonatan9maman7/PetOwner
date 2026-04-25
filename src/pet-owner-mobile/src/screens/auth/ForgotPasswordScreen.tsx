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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { LanguageToggle } from "../../components/LanguageToggle";
import { authApi } from "../../api/client";
import { getNormalizedApiError } from "../../utils/apiUtils";
import { showApiErrorToast } from "../../services/apiErrorToast";
import { useTheme } from "../../theme/ThemeContext";

const AUTH_PETCARE_HERO_LOGO = require("../../../assets/petcare-logo-transparent.png");

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation<any>();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const insets = useSafeAreaInsets();
  const { t, isHebrew, rtlText, rtlStyle, rtlRow, rtlInput, alignCls } =
    useTranslation();
  const { colors } = useTheme();

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
    } catch (err: unknown) {
      showApiErrorToast(getNormalizedApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const labelCls = `text-xs font-bold mb-2 px-1 ${alignCls} ${!isHebrew ? "uppercase tracking-widest" : ""}`;

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
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: 8,
            paddingBottom: 120,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
                {t("forgotTitle")}
              </Text>
              <LanguageToggle />
            </View>
            <Text
              style={[rtlText, { color: colors.textSecondary }]}
              className={`text-sm leading-5 ${alignCls}`}
            >
              {t("forgotSubtitle")}
            </Text>
          </View>

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

          <Pressable
            className="h-14 rounded-xl items-center justify-center active:opacity-90"
            style={{ backgroundColor: colors.brand }}
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
    </View>
  );
}
