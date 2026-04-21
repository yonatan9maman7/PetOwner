import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
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

/* ─── Password Modal (Android + iOS) ──────────────────────────────── */

function PasswordConfirmModal({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();

  // Reset on each open.
  useEffect(() => {
    if (visible) setPassword("");
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onCancel}
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 32 }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 6 }}>
            {t("biometricEnablePasswordTitle")}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 20, lineHeight: 20 }}>
            {t("biometricEnablePasswordDesc")}
          </Text>

          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              backgroundColor: colors.inputBg,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 20,
              gap: 10,
            }}
          >
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: colors.text,
                padding: 0,
                textAlign: isRTL ? "right" : "left",
              }}
              placeholder={t("passwordPlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secure}
              autoFocus
            />
            <Pressable onPress={() => setSecure((v) => !v)} hitSlop={8}>
              <Ionicons
                name={secure ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: 13,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: colors.surfaceSecondary,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                {t("cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => password.trim() && onConfirm(password)}
              disabled={!password.trim()}
              style={{
                flex: 1,
                paddingVertical: 13,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: password.trim() ? colors.primary : colors.textMuted,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryText }}>
                {t("loginButton")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

/* ─── Biometric Card ───────────────────────────────────────────────── */

function BiometricCard() {
  const user = useAuthStore((s) => s.user);
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();

  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [typeLabel, setTypeLabel] = useState<biometricService.BiometricTypeLabel>("generic");
  const [toggling, setToggling] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const refresh = useCallback(async () => {
    const [s, e, label] = await Promise.all([
      biometricService.isSupported(),
      biometricService.isEnabled(),
      biometricService.getSupportedTypeLabel(),
    ]);
    setSupported(s);
    setEnabled(e);
    setTypeLabel(label);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (!supported || Platform.OS === "web") return null;

  const iconName =
    typeLabel === "faceId"
      ? ("scan-circle-outline" as const)
      : ("finger-print" as const);

  const buttonLabel =
    typeLabel === "faceId"
      ? t("biometricLoginButton")
      : t("biometricFingerprintButton");

  /* ── Turn ON ── */
  const handleEnable = () => {
    setShowPasswordModal(true);
  };

  const confirmEnable = async (password: string) => {
    setShowPasswordModal(false);
    if (!user?.email) return;
    setToggling(true);
    try {
      // Re-verify the password against the server before storing it.
      await authApi.login({ email: user.email, password });
      // Credentials valid — now prompt biometrics and persist.
      await biometricService.enable(user.email, password, t("biometricEnablePrompt"));
      setEnabled(true);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        Alert.alert(t("errorTitle"), t("biometricPasswordWrong"));
      } else if (err?.response) {
        Alert.alert(
          t("errorTitle"),
          err.response?.data?.message ?? t("loginError"),
        );
      }
      // Biometric / SecureStore failures: biometricService.enable already showed "Biometric Error".
    } finally {
      setToggling(false);
    }
  };

  /* ── Turn OFF ── */
  const handleDisable = () => {
    Alert.alert(
      t("biometricDisableConfirm"),
      "",
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("logoutButton"),
          style: "destructive",
          onPress: async () => {
            await biometricService.disable();
            setEnabled(false);
          },
        },
      ],
    );
  };

  const handleToggle = () => {
    if (toggling) return;
    enabled ? handleDisable() : handleEnable();
  };

  return (
    <>
      <View
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
              backgroundColor: colors.iconGreenBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={iconName} size={22} color="#059669" />
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
              {buttonLabel}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 2,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("biometricLoginDesc")}
            </Text>
          </View>

          {toggling ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor={enabled ? colors.primaryText : colors.surface}
            />
          )}
        </View>
      </View>

      <PasswordConfirmModal
        visible={showPasswordModal}
        onConfirm={confirmEnable}
        onCancel={() => setShowPasswordModal(false)}
      />
    </>
  );
}

/* ─── Screen ───────────────────────────────────────────────────────── */

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
        {/* ── Biometric Toggle (shown only when hardware is available) ── */}
        <BiometricCard />

        {/* ── Change Password ── */}
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

        <View style={{ flex: 1, minHeight: 100 }} />

        {/* ── Delete Account ── */}
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
