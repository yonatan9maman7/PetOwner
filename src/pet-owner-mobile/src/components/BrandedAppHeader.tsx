import type { ReactNode } from "react";
import { View, Text, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { rowDirectionForAppLayout } from "../i18n";

export const BRAND_HEADER_HORIZONTAL_PAD = 28;

type Props = {
  /** Renders before the paw + wordmark (e.g. back button). */
  leading?: ReactNode;
  /** Optional trailing slot (e.g. `LanguageToggle` on auth screens only). */
  trailing?: ReactNode;
  /** Surface background + shadow (tab roots). Auth inside ScrollView uses false. */
  elevated?: boolean;
  /** Navy bar + light wordmark, aligned with bottom tab chrome. */
  chromed?: boolean;
  /** Use 0 when the parent already applies horizontal padding (e.g. auth ScrollView). */
  horizontalPadding?: number;
  style?: StyleProp<ViewStyle>;
};

export function BrandedAppHeader({
  leading,
  trailing,
  elevated = true,
  chromed = false,
  horizontalPadding = BRAND_HEADER_HORIZONTAL_PAD,
  style,
}: Props) {
  const { colors } = useTheme();
  const language = useAuthStore((s) => s.language);
  const isRTL = language === "he";
  const row = rowDirectionForAppLayout(isRTL);

  const surfaceStyle = chromed
    ? { backgroundColor: colors.text }
    : elevated
      ? { backgroundColor: colors.surface }
      : undefined;

  const shadowStyle =
    elevated && chromed
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 6,
          elevation: 5,
        }
      : elevated && !chromed
        ? {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          }
        : undefined;

  return (
    <View
      style={[
        {
          flexDirection: row,
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: horizontalPadding,
          paddingVertical: chromed ? 8 : 10,
          gap: 12,
        },
        surfaceStyle,
        shadowStyle,
        style,
      ]}
    >
      <View
        style={{
          flexDirection: row,
          alignItems: "center",
          flex: 1,
          minWidth: 0,
          gap: 12,
        }}
      >
        {leading}
        <View
          style={{
            flexDirection: row,
            alignItems: "center",
            gap: 12,
            minWidth: 0,
            flexShrink: 1,
          }}
        >
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{
              backgroundColor: chromed ? "rgba(255,255,255,0.18)" : colors.text,
            }}
          >
            <Ionicons name="paw" size={22} color={colors.textInverse} />
          </View>
          <Text
            className="text-2xl font-extrabold"
            style={{ color: chromed ? colors.textInverse : colors.text }}
            numberOfLines={1}
          >
            PetOwner
          </Text>
        </View>
      </View>
      {trailing}
    </View>
  );
}
