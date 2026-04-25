import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import {
  useTranslation,
  rowDirectionForAppLayout,
  type TranslationKey,
} from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import type { ThemePreference } from "../../store/themeStore";

/* ───────────────────── Primitives ───────────────────── */

function GroupHeader({ label }: { label: string }) {
  const { rtlText } = useTranslation();
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 10,
        paddingHorizontal: 4,
        ...rtlText,
      }}
    >
      {label}
    </Text>
  );
}

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
  isLast?: boolean;
  iconColor?: string;
  iconBg?: string;
}

function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  disabled,
  iconColor,
  iconBg,
}: RowProps) {
  const { isRTL, rtlText, rowIconGapEnd } = useTranslation();
  const { colors } = useTheme();
  const fg = disabled ? colors.textMuted : colors.text;
  const defaultIconColor = disabled ? colors.textMuted : colors.primary;

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.6}
      style={{
        flexDirection: rowDirectionForAppLayout(isRTL),
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 18,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          ...rowIconGapEnd,
          backgroundColor: iconBg ?? (disabled ? colors.surfaceSecondary : colors.iconBlueBg),
        }}
      >
        <Ionicons name={icon} size={19} color={iconColor ?? defaultIconColor} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: fg,
            ...rtlText,
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 12.5,
              color: colors.textSecondary,
              marginTop: 1,
              ...rtlText,
              lineHeight: 17,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function GroupCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      {children}
    </View>
  );
}

function RowDivider() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginStart: 68,
      }}
    />
  );
}

/* ───────────────────── Dark Mode Picker Modal ───────────────────── */

const THEME_OPTIONS: { id: ThemePreference; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "light", icon: "sunny-outline" },
  { id: "dark", icon: "moon-outline" },
  { id: "system", icon: "phone-portrait-outline" },
];

function DarkModePicker({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, isDark, preference, setPreference } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();

  const labels: Record<ThemePreference, string> = {
    light: t("themeLight"),
    dark: t("themeDark"),
    system: t("themeSystem"),
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <TouchableOpacity activeOpacity={1} style={{
          width: "100%",
          maxWidth: 340,
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: 20,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 10,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            textAlign: "center",
            marginBottom: 20,
          }}>
            {t("darkMode")}
          </Text>

          {THEME_OPTIONS.map((opt) => {
            const active = preference === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.6}
                onPress={() => {
                  setPreference(opt.id);
                  onClose();
                }}
                style={{
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  marginBottom: 6,
                  backgroundColor: active ? colors.primaryLight : "transparent",
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: active ? colors.primary : colors.surfaceSecondary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginEnd: 14,
                }}>
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={active ? colors.primaryText : colors.textMuted}
                  />
                </View>
                <Text style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: "600",
                  color: active ? colors.primary : colors.text,
                  ...rtlText,
                }}>
                  {labels[opt.id]}
                </Text>
                {active && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.primary}
                    style={{ marginStart: 8 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

/* ───────────────────── Profile Header ───────────────────── */

function localizedUserRole(
  t: (key: TranslationKey) => string,
  role: string | undefined,
): string {
  const r = (role ?? "").trim();
  if (!r) return "";
  const low = r.toLowerCase();
  if (low === "owner") return t("roleOwner");
  if (low === "provider") return t("roleProvider");
  if (low === "admin") return t("roleAdmin");
  return r;
}

function ProfileHeader() {
  const user = useAuthStore((s) => s.user);
  const { t, rtlStyle } = useTranslation();
  const { colors } = useTheme();
  const initials = (user?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={{
      alignItems: "center",
      marginBottom: 28,
      paddingVertical: 20,
      backgroundColor: colors.surface,
      borderRadius: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    }}>
      <View style={{
        width: 76,
        height: 76,
        borderRadius: 38,
        padding: 3,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
      }}>
        <View style={{
          width: "100%",
          height: "100%",
          borderRadius: 35,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary,
        }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.primaryText }}>
            {initials}
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 19,
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
          ...rtlStyle,
        }}
      >
        {user?.name ?? "User"}
      </Text>
      {user?.role ? (
        <View style={{
          marginTop: 6,
          paddingHorizontal: 14,
          paddingVertical: 4,
          borderRadius: 20,
          backgroundColor: colors.primaryLight,
        }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.primary,
              textAlign: "center",
              ...rtlStyle,
            }}
          >
            {localizedUserRole(t, user.role)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ───────────────────── Screen ───────────────────── */

export function AccountSettingsScreen() {
  const navigation = useNavigation<any>();
  const language = useAuthStore((s) => s.language);
  const { t, isRTL, rtlStyle } = useTranslation();
  const { colors, preference } = useTheme();
  const [showThemePicker, setShowThemePicker] = useState(false);

  const themeLabel: Record<ThemePreference, string> = {
    light: t("themeLight"),
    dark: t("themeDark"),
    system: t("themeSystem"),
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }}
      edges={["top"]}
    >
      {/* ── Header bar ── */}
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
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
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            textAlign: "center",
            ...rtlStyle,
          }}
        >
          {t("accountSettings")}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader />

        {/* ── Group 1 : Profile Settings ── */}
        <View style={{ marginBottom: 24 }}>
          <GroupHeader label={t("settingsProfileGroup")} />
          <GroupCard>
            <SettingsRow
              icon="person-outline"
              label={t("personalInfo")}
              subtitle={t("personalInfoSubtitle")}
              iconColor="#3b6cf5"
              iconBg={colors.iconBlueBg}
              onPress={() => navigation.navigate("AccountEdit")}
            />
            <RowDivider />
            <SettingsRow
              icon="shield-checkmark-outline"
              label={t("loginAndSecurity")}
              subtitle={t("loginSecuritySubtitle")}
              iconColor="#059669"
              iconBg={colors.iconGreenBg}
              onPress={() => navigation.navigate("Security")}
            />
            <RowDivider />
            <SettingsRow
              icon="eye-off-outline"
              label={t("privacy")}
              subtitle={t("privacySubtitle")}
              iconColor="#7c3aed"
              iconBg={colors.iconPurpleBg}
              onPress={() => navigation.navigate("Privacy")}
            />
            <RowDivider />
            <SettingsRow
              icon="notifications-outline"
              label={t("notificationsLabel")}
              subtitle={t("notificationsSettingsSubtitle")}
              iconColor="#ea580c"
              iconBg={colors.iconOrangeBg}
              onPress={() => navigation.navigate("NotificationSettings")}
              isLast
            />
          </GroupCard>
        </View>

        {/* ── Group 2 : Appearance & Language ── */}
        <View style={{ marginBottom: 24 }}>
          <GroupHeader label={t("settingsAppearanceGroup")} />
          <GroupCard>
            <SettingsRow
              icon="globe-outline"
              label={t("languageSetting")}
              subtitle={
                t("appLanguageSubtitle") +
                "  ·  " +
                (language === "he" ? "עברית" : "English")
              }
              iconColor="#0891b2"
              iconBg={colors.iconCyanBg}
              onPress={() => navigation.navigate("LanguageSelect")}
            />
            <RowDivider />
            <SettingsRow
              icon="moon-outline"
              label={t("darkMode")}
              subtitle={themeLabel[preference]}
              iconColor="#6366f1"
              iconBg={colors.iconIndigoBg}
              onPress={() => setShowThemePicker(true)}
              isLast
            />
          </GroupCard>
        </View>

        {/* ── Group 3 : Help & Support ── */}
        <View style={{ marginBottom: 32 }}>
          <GroupHeader label={t("settingsHelpGroup")} />
          <GroupCard>
            <SettingsRow
              icon="help-circle-outline"
              label={t("helpCenter")}
              iconColor="#0284c7"
              iconBg={colors.iconSkyBg}
              onPress={() => navigation.navigate("HelpCenter")}
            />
            <RowDivider />
            <SettingsRow
              icon="chatbubble-outline"
              label={t("contactUs")}
              subtitle={t("contactUsSettingsSubtitle")}
              iconColor="#0d9488"
              iconBg={colors.iconTealBg}
              onPress={() => navigation.navigate("ContactUs")}
            />
            <RowDivider />
            <SettingsRow
              icon="document-text-outline"
              label={t("termsOfService")}
              iconColor="#64748b"
              iconBg={colors.iconSlateBg}
              onPress={() => navigation.navigate("Terms")}
              isLast
            />
          </GroupCard>
        </View>

        <Text style={{ textAlign: "center", fontSize: 12, color: colors.textMuted, marginTop: 20 }}>
          PetOwner v1.0.0
        </Text>
      </ScrollView>

      <DarkModePicker visible={showThemePicker} onClose={() => setShowThemePicker(false)} />
    </SafeAreaView>
  );
}
