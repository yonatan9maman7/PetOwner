import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, rowDirectionForAppLayout } from "../i18n";
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
  const { colors, preference, setPreference } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();

  const labels: Record<ThemePreference, string> = {
    light: t("themeLight"),
    dark: t("themeDark"),
    system: t("themeSystem"),
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: "100%",
            maxWidth: 340,
            alignSelf: "stretch",
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 20,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            {t("darkMode")}
          </Text>

          {THEME_OPTIONS.map((opt) => {
            const active = preference === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.6}
                onPress={() => {
                  void setPreference(opt.id);
                  onClose();
                }}
                style={{
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  alignItems: "center",
                  alignSelf: "stretch",
                  width: "100%",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  marginBottom: 6,
                  backgroundColor: active ? colors.primaryLight : "transparent",
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: active ? colors.primary : colors.surfaceSecondary,
                    alignItems: "center",
                    justifyContent: "center",
                    marginEnd: 14,
                    flexShrink: 0,
                  }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={active ? colors.primaryText : colors.textMuted}
                  />
                </View>
                <Text
                  style={{
                    flex: 1,
                    flexShrink: 1,
                    minWidth: 0,
                    fontSize: 16,
                    fontWeight: "600",
                    color: active ? colors.primary : colors.text,
                    ...rtlText,
                  }}
                >
                  {labels[opt.id]}
                </Text>
                {active ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.primary}
                    style={{ marginStart: 8, flexShrink: 0 }}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
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
