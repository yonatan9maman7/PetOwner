import type { ReactNode } from "react";
import { View, Text, Pressable, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rowDirectionForAppLayout, useTranslation } from "../i18n";
import { useTheme } from "../theme/ThemeContext";

const SIDE_SLOT_WIDTH = 40;

type StackBackHeaderProps = {
  title: string;
  onBack: () => void;
  style?: StyleProp<ViewStyle>;
  /** Optional trailing control; defaults to an empty balance slot matching the back button width. */
  rightSlot?: ReactNode;
};

/**
 * Stack-style header with a back control and a title centered in the remaining width.
 * Uses equal-width side slots so the title stays visually centered in RTL and LTR.
 */
export function StackBackHeader({
  title,
  onBack,
  style,
  rightSlot,
}: StackBackHeaderProps) {
  const { colors } = useTheme();
  const { isRTL, rtlStyle } = useTranslation();

  return (
    <View
      style={[
        {
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        },
        style,
      ]}
    >
      <View
        style={{
          width: SIDE_SLOT_WIDTH,
          alignItems: isRTL ? "flex-end" : "flex-start",
        }}
      >
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={colors.text}
          />
        </Pressable>
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 17,
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
          ...rtlStyle,
        }}
        numberOfLines={1}
      >
        {title}
      </Text>
      <View
        style={{
          width: SIDE_SLOT_WIDTH,
          alignItems: isRTL ? "flex-start" : "flex-end",
          justifyContent: "center",
        }}
      >
        {rightSlot}
      </View>
    </View>
  );
}
