/**
 * CancelBookingSheet
 *
 * Full-screen modal presented when an owner wants to cancel a booking or a
 * provider wants to decline an incoming request.  Shows a short predefined
 * reason list (different for owner vs provider), plus an "Other" option that
 * reveals a free-text input.  At least one reason (predefined OR non-blank
 * free text) is required before the destructive action button is enabled.
 */
import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CancelBookingMode = "owner" | "provider";

interface Props {
  visible: boolean;
  mode: CancelBookingMode;
  onConfirm: (reason: string) => Promise<void>;
  onDismiss: () => void;
}

// ─── Reason i18n key lists ────────────────────────────────────────────────────

type TransKey = Parameters<ReturnType<typeof useTranslation>["t"]>[0];

const OWNER_REASON_KEYS: TransKey[] = [
  "cancelReasonOwner1",
  "cancelReasonOwner2",
  "cancelReasonOwner3",
  "cancelReasonOwner4",
  "cancelReasonOwner5",
  "cancelReasonOwner6",
];

const PROVIDER_REASON_KEYS: TransKey[] = [
  "cancelReasonProvider1",
  "cancelReasonProvider2",
  "cancelReasonProvider3",
  "cancelReasonProvider4",
  "cancelReasonProvider5",
  "cancelReasonProvider6",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CancelBookingSheet({ visible, mode, onConfirm, onDismiss }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedKey, setSelectedKey] = useState<TransKey | "other" | null>(null);
  const [otherText, setOtherText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  const reasonKeys = mode === "owner" ? OWNER_REASON_KEYS : PROVIDER_REASON_KEYS;
  const isOwner = mode === "owner";

  // The effective reason string we'll send to the API
  const resolvedReason =
    selectedKey === "other"
      ? otherText.trim()
      : selectedKey
        ? t(selectedKey)
        : "";

  const isValid = resolvedReason.length > 0;

  const handleSelect = useCallback(
    (key: TransKey | "other") => {
      void Haptics.selectionAsync();
      setSelectedKey(key);
      setShowError(false);
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (!isValid) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowError(true);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await onConfirm(resolvedReason);
      setSelectedKey(null);
      setOtherText("");
      setShowError(false);
    } finally {
      setLoading(false);
    }
  }, [isValid, resolvedReason, onConfirm]);

  const handleDismiss = useCallback(() => {
    if (loading) return;
    setSelectedKey(null);
    setOtherText("");
    setShowError(false);
    onDismiss();
  }, [loading, onDismiss]);

  const titleKey: TransKey = isOwner ? "cancelReasonTitle" : "declineReasonTitle";
  const subtitleKey: TransKey = isOwner ? "cancelReasonSubtitle" : "declineReasonSubtitle";
  const confirmKey: TransKey = isOwner ? "cancelConfirmBtn" : "declineConfirmBtn";

  const s = styles(colors, isDark, insets);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.container}>
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={handleDismiss} hitSlop={12} style={s.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={s.title}>{t(titleKey)}</Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={s.subtitle}>{t(subtitleKey)}</Text>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Predefined reasons */}
            {reasonKeys.map((key) => {
              const selected = selectedKey === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => handleSelect(key)}
                  style={[s.chip, selected && s.chipSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={s.chipLeft}>
                    <View style={[s.radio, selected && s.radioSelected]}>
                      {selected && <View style={s.radioDot} />}
                    </View>
                    <Text style={[s.chipLabel, selected && s.chipLabelSelected]}>
                      {t(key)}
                    </Text>
                  </View>
                  {selected && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}

            {/* Other — free text */}
            <Pressable
              onPress={() => handleSelect("other")}
              style={[s.chip, selectedKey === "other" && s.chipSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedKey === "other" }}
            >
              <View style={s.chipLeft}>
                <View style={[s.radio, selectedKey === "other" && s.radioSelected]}>
                  {selectedKey === "other" && <View style={s.radioDot} />}
                </View>
                <Text
                  style={[
                    s.chipLabel,
                    selectedKey === "other" && s.chipLabelSelected,
                  ]}
                >
                  {t("cancelReasonOther")}
                </Text>
              </View>
              {selectedKey === "other" && (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              )}
            </Pressable>

            {selectedKey === "other" && (
              <View style={s.textInputWrapper}>
                <Text style={s.textInputLabel}>{t("cancelReasonOtherLabel")}</Text>
                <TextInput
                  style={s.textInput}
                  placeholder={t("cancelReasonOtherPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  value={otherText}
                  onChangeText={(v) => {
                    setOtherText(v);
                    setShowError(false);
                  }}
                  multiline
                  maxLength={500}
                  autoFocus
                  textAlignVertical="top"
                />
                <Text style={s.charCount}>{otherText.length} / 500</Text>
              </View>
            )}

            {showError && (
              <Text style={s.errorText}>{t("cancelReasonRequired")}</Text>
            )}
          </ScrollView>

          {/* Footer action */}
          <View style={s.footer}>
            <Pressable
              onPress={handleConfirm}
              disabled={loading}
              style={[
                s.confirmBtn,
                isOwner ? s.confirmBtnOwner : s.confirmBtnProvider,
                loading && s.confirmBtnDisabled,
              ]}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.confirmBtnText}>{t(confirmKey)}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function styles(
  colors: ReturnType<typeof useTheme>["colors"],
  isDark: boolean,
  insets: { bottom: number; top: number },
) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: insets.top > 0 ? insets.top : 16,
      paddingBottom: insets.bottom + 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    closeBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      flex: 1,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 10,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: isDark ? colors.cardHighlight : "#f8fafc",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: isDark ? colors.primaryLight : "#eef2ff",
    },
    chipLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: {
      borderColor: colors.primary,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    chipLabel: {
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
    chipLabelSelected: {
      fontWeight: "600",
      color: colors.primary,
    },
    textInputWrapper: {
      marginTop: 4,
    },
    textInputLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: isDark ? colors.cardHighlight : "#f8fafc",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      minHeight: 100,
    },
    charCount: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "right",
      marginTop: 4,
    },
    errorText: {
      fontSize: 13,
      color: "#ef4444",
      marginTop: 4,
      textAlign: "center",
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    confirmBtn: {
      height: 52,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmBtnOwner: {
      backgroundColor: "#ef4444",
    },
    confirmBtnProvider: {
      backgroundColor: "#f97316",
    },
    confirmBtnDisabled: {
      opacity: 0.5,
    },
    confirmBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#ffffff",
    },
  });
}
