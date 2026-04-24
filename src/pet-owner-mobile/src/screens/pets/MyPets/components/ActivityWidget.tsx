import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ActivitySummaryDto } from "../../../../types/api";
import { useTranslation } from "../../../../i18n";
import { WidgetCard } from "./WidgetCard";
import { useTheme } from "../../../../theme/ThemeContext";

interface ActivityWidgetProps {
  summary: ActivitySummaryDto | null;
  petId?: string | null;
  onPress: () => void;
  disabled?: boolean;
}

export function ActivityWidget({ summary, petId, onPress, disabled }: ActivityWidgetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const streak = summary?.currentStreak ?? 0;
  const walks = summary?.totalWalks ?? 0;

  const subtitle = walks > 0
    ? t("walksThisWeek").replace("{n}", String(walks))
    : t("activityLogSubtitle");

  const RightSlot = streak > 0 ? (
    <View style={{ alignItems: "center", gap: 1 }}>
      <Text style={{ fontSize: 22 }}>🔥</Text>
      <Text style={{ fontSize: 11, fontWeight: "800", color: "#f97316" }}>
        {t("streakDays").replace("{n}", String(streak))}
      </Text>
    </View>
  ) : undefined;

  return (
    <WidgetCard
      icon="footsteps"
      iconColor={colors.primary}
      iconBg={colors.primaryLight}
      title={t("activityLogTitle")}
      subtitle={subtitle}
      onPress={onPress}
      disabled={disabled}
      rightSlot={RightSlot}
    />
  );
}
