import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation, rowDirectionForAppLayout } from "../../../../i18n";
import { useTheme } from "../../../../theme/ThemeContext";

interface ActivityLogTileProps {
  disabled?: boolean;
  petId?: string | null;
}

/**
 * Premium card tile aligned with app theme + NativeWind layout utilities.
 */
export function ActivityLogTile({ disabled, petId }: ActivityLogTileProps) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const handlePress = () => {
    if (disabled || !petId) return;
    navigation.navigate("ActivityLog", { petId });
  };

  return (
    <View
      className="mx-5 mt-3 overflow-hidden rounded-2xl"
      style={{
        backgroundColor: colors.primaryLight,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        className="items-center gap-3.5 px-5 py-4"
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          opacity: disabled ? 0.5 : 1,
        }}
        android_ripple={{ color: `${colors.primary}22` }}
      >
        <View
          className="h-11 w-11 items-center justify-center rounded-[14px]"
          style={{ backgroundColor: colors.surface }}
        >
          <Ionicons name="footsteps" size={22} color={colors.primary} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-[15px] font-extrabold"
            style={{ color: colors.text, textAlign: isRTL ? "right" : "left" }}
            numberOfLines={1}
          >
            {t("activityLogTitle")}
          </Text>
          <Text
            className="mt-0.5 text-[11px] font-medium"
            style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}
            numberOfLines={2}
          >
            {t("activityLogSubtitle")}
          </Text>
        </View>
        <Ionicons
          name={isRTL ? "chevron-back" : "chevron-forward"}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>
    </View>
  );
}
