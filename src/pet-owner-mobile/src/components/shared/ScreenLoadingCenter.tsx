import { View, Text, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { PawLoadingSpinner } from "./PawLoadingSpinner";

export interface ScreenLoadingCenterProps {
  /** Optional line under the spinner (e.g. `t("profileTitle") + "…"`). */
  title?: string;
  spinnerSize?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * When true (default), the outer container uses `flex: 1` so it fills the
   * parent (typical full-screen loading below a header). Set false when the
   * parent already constrains size (e.g. absolute-fill overlay).
   */
  fill?: boolean;
}

/**
 * DRY branded full-area loading layout.
 * Use for screen transitions, profiles, and dashboards.
 * Do NOT use for buttons, rows, or small inline areas — keep `ActivityIndicator` there.
 */
export function ScreenLoadingCenter({
  title,
  spinnerSize = 80,
  style,
  fill = true,
}: ScreenLoadingCenterProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        fill ? { flex: 1 } : undefined,
        {
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          paddingBottom: 60,
        },
        style,
      ]}
    >
      <PawLoadingSpinner size={spinnerSize} />
      {title ? (
        <Text
          style={{ fontSize: 15, color: colors.textMuted, fontWeight: "500" }}
        >
          {title}
        </Text>
      ) : null}
    </View>
  );
}
