import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useTranslation } from "../i18n";
import { useTheme } from "../theme/ThemeContext";
import type { ThemePreference } from "../store/themeStore";

const THEME_OPTIONS: { id: ThemePreference; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "light", icon: "sunny-outline" },
  { id: "dark", icon: "moon-outline" },
  { id: "system", icon: "phone-portrait-outline" },
];

export interface ThemePickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ThemePickerModal({ visible, onClose }: ThemePickerModalProps) {
  const { width } = useWindowDimensions();
  const { colors, preference, setPreference } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();

  const labels: Record<ThemePreference, string> = {
    light: t("themeLight"),
    dark: t("themeDark"),
    system: t("themeSystem"),
  };

  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardWidth = Math.min(340, width - 64);

  const selectTheme = (id: ThemePreference) => {
    void setPreference(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View style={[styles.card, { width: cardWidth }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t("darkMode")}</Text>

          <View style={styles.optionsList}>
            {THEME_OPTIONS.map((opt) => {
              const active = preference === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => selectTheme(opt.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.option,
                    active && { backgroundColor: colors.primaryLight },
                    pressed && !active && { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <View style={[styles.optionRow, isRTL && styles.optionRowRTL]}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceSecondary,
                        },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={20}
                        color={active ? colors.primaryText : colors.textMuted}
                      />
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        rtlText,
                        { color: active ? colors.primary : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {labels[opt.id]}
                    </Text>
                    <View style={styles.checkSlot}>
                      {active ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={colors.primary}
                        />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 10,
      zIndex: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 20,
    },
    optionsList: {
      gap: 16,
    },
    option: {
      borderRadius: 12,
      minHeight: 48,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    optionRowRTL: {
      flexDirection: "row-reverse",
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    optionLabel: {
      flex: 1,
      minWidth: 0,
      fontSize: 16,
      fontWeight: "600",
    },
    checkSlot: {
      width: 28,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
  });
}

export function ThemeToggleButton({ onPress }: { onPress: () => void }) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Dark mode" : "Light mode"}
      style={{
        padding: 8,
        borderRadius: 20,
        backgroundColor: colors.surfaceSecondary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name={isDark ? "moon-outline" : "sunny-outline"}
        size={20}
        color={colors.text}
      />
    </Pressable>
  );
}
