import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { BrandLogoImage } from "./BrandLogoImage";
import { useTheme } from "../theme/ThemeContext";

export const BRAND_HEADER_HORIZONTAL_PAD = 28;

/**
 * Brand header rows stay physically LTR; app language drives surrounding layout.
 * Parent containers should also set `direction: "ltr"` (see `BRAND_HEADER_LTR_CONTAINER`).
 */
export function brandHeaderRowFlexDirection(): "row" | "row-reverse" {
  return "row";
}

/** Locks the whole header strip to physical LTR (logo stays on the default/left edge). */
export const BRAND_HEADER_LTR_CONTAINER = {
  direction: "ltr" as const,
  flexDirection: "row" as const,
};

type Props = {
  /** Renders before the wordmark (e.g. back button). */
  leading?: ReactNode;
  /** Optional trailing slot (e.g. `LanguageToggle` on auth screens only). */
  trailing?: ReactNode;
  /** Surface background + shadow (tab roots). Auth inside ScrollView uses false. */
  elevated?: boolean;
  /** Navy bar + light wordmark, aligned with bottom tab chrome. */
  chromed?: boolean;
  /** Use 0 when the parent already applies horizontal padding (e.g. auth ScrollView). */
  horizontalPadding?: number;
  /** Header logo height in pt (default 36). */
  logoHeight?: number;
  style?: StyleProp<ViewStyle>;
};

export function BrandedAppHeader({
  leading,
  trailing,
  elevated = true,
  chromed = false,
  horizontalPadding = BRAND_HEADER_HORIZONTAL_PAD,
  logoHeight,
  style,
}: Props) {
  const { colors } = useTheme();

  const surfaceStyle = chromed
    ? { backgroundColor: colors.tabBar }
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
        BRAND_HEADER_LTR_CONTAINER,
        {
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
          flexDirection: brandHeaderRowFlexDirection(),
          alignItems: "center",
          flex: 1,
          minWidth: 0,
          gap: 12,
        }}
      >
        {leading}
        <BrandLogoImage variant="header" headerHeight={logoHeight} />
      </View>
      {trailing}
    </View>
  );
}
