import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../api/client";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import * as biometricService from "../../services/biometricService";

export function ChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const userEmail = useAuthStore((s) => s.user?.email);
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();

  const [manualEmail, setManualEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const emailToUse = userEmail || manualEmail.trim();

  const maskedEmail = userEmail
    ? userEmail.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(b.length) + c)
    : null;

  const handleSend = async () => {
    if (!emailToUse) return;
    setSending(true);
    try {
      await authApi.forgotPassword(emailToUse);
      // The user is about to change their password via the email link.
      // Wipe stored biometric credentials so the next login doesn't silently
      // try the old password. The user can re-enable biometrics afterwards.
      biometricService.disable().catch(() => {});
      setSent(true);
    } catch {
      Alert.alert(t("errorTitle"), t("genericError"));
    }
    setSending(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ padding: 4 }}
          >
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{ flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" }}
          >
            {t("changePassword")}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}>
          {sent ? (
            /* ── Success state ── */
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.successLight,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                }}
              >
                <Ionicons name="checkmark-circle" size={44} color={colors.success} />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: colors.text,
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                {t("resetLinkSent")}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 22,
                  marginBottom: 8,
                }}
              >
                {t("resetLinkSentDesc")}
              </Text>
              {maskedEmail && (
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.text,
                    textAlign: "center",
                    marginBottom: 32,
                  }}
                >
                  {maskedEmail}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{
                  backgroundColor: colors.text,
                  paddingHorizontal: 36,
                  paddingVertical: 14,
                  borderRadius: 14,
                }}
              >
                <Text style={{ color: colors.textInverse, fontWeight: "700", fontSize: 15 }}>
                  {t("backStep")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Send state ── */
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.primaryLight,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                }}
              >
                <Ionicons name="mail-outline" size={38} color={colors.text} />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: colors.text,
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                {t("changePassword")}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                {t("changePasswordDesc")}
              </Text>

              {maskedEmail ? (
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: colors.surface,
                    paddingHorizontal: 18,
                    paddingVertical: 14,
                    borderRadius: 14,
                    marginBottom: 24,
                    alignSelf: "stretch",
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <Ionicons name="mail" size={18} color={colors.textSecondary} />
                  <Text style={{ fontSize: 15, color: colors.text, fontWeight: "600", flex: 1, textAlign: isRTL ? "right" : "left" }}>
                    {maskedEmail}
                  </Text>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                </View>
              ) : (
                <TextInput
                  placeholder={t("emailPlaceholder")}
                  value={manualEmail}
                  onChangeText={setManualEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={colors.textMuted}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 18,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: colors.text,
                    textAlign: isRTL ? "right" : "left",
                    marginBottom: 24,
                    alignSelf: "stretch",
                  }}
                />
              )}

              <View
                className="rounded-2xl border px-4 py-3.5 mb-4 self-stretch"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                }}
              >
                <Text
                  className="text-sm leading-5 font-semibold"
                  style={{
                    color: colors.text,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {t("changePasswordEmailHint")}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleSend}
                disabled={sending || !emailToUse}
                activeOpacity={0.7}
                className="rounded-2xl self-stretch flex-row items-center justify-center gap-2 py-4"
                style={{
                  backgroundColor: !emailToUse ? colors.textMuted : colors.primary,
                  opacity: sending ? 0.7 : 1,
                  shadowColor: colors.text,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  elevation: 4,
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color={colors.textInverse} />
                    <Text className="font-bold text-base" style={{ color: colors.textInverse }}>
                      {t("sendResetLink")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
