import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../theme/ThemeContext";
import { rowDirectionForAppLayout, useTranslation } from "../../../../i18n";

export interface WidgetCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  rightSlot?: ReactNode;
  showChevron?: boolean;
}

export function WidgetCard({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  disabled,
  rightSlot,
  showChevron = true,
}: WidgetCardProps) {
  const { colors } = useTheme();
  const { isRTL } = useTranslation();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 18,
        overflow: "hidden",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled || !onPress}
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 14,
          opacity: disabled ? 0.45 : 1,
        }}
        android_ripple={{ color: `${colors.primary}12` }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            backgroundColor: iconBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: colors.text,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 2,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightSlot ? (
          <View style={{ alignItems: "flex-end" }}>{rightSlot}</View>
        ) : null}

        {showChevron && onPress ? (
          <Ionicons
            name={isRTL ? "chevron-back" : "chevron-forward"}
            size={16}
            color={colors.textMuted}
          />
        ) : null}
      </Pressable>
    </View>
  );
}
