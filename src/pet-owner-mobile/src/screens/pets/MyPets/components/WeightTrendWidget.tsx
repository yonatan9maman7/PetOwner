import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { WeightLogDto } from "../../../../types/api";
import { useTranslation } from "../../../../i18n";
import { SparklineChart } from "../../../../components/SparklineChart";
import { WidgetCard } from "./WidgetCard";
import { useTheme } from "../../../../theme/ThemeContext";

interface WeightTrendWidgetProps {
  weightHistory: WeightLogDto[];
  onPress: () => void;
  disabled?: boolean;
}

export function WeightTrendWidget({ weightHistory, onPress, disabled }: WeightTrendWidgetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const last8 = weightHistory.slice(-8);
  const values = last8.map((w) => w.weight);
  const latest = values[values.length - 1];
  const prev = values.length >= 2 ? values[values.length - 2] : null;

  const delta = prev != null && latest != null ? +(latest - prev).toFixed(2) : null;
  const deltaColor = delta === null || delta === 0 ? colors.textMuted : delta > 0 ? "#f59e0b" : "#059669";
  const deltaIcon: "arrow-up" | "arrow-down" | "remove" =
    delta === null || delta === 0 ? "remove" : delta > 0 ? "arrow-up" : "arrow-down";

  const subtitle =
    latest != null
      ? `${latest} kg${delta !== null ? (delta >= 0 ? ` (+${delta} kg)` : ` (${delta} kg)`) : ""}`
      : t("noWeightData");

  const RightSlot = values.length >= 2 ? (
    <View style={{ alignItems: "flex-end", gap: 4 }}>
      <SparklineChart
        data={values}
        width={72}
        height={32}
        strokeColor={colors.primary}
        fillColor={`${colors.primary}18`}
        showLastDot={false}
      />
      {delta !== null && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Ionicons name={deltaIcon} size={11} color={deltaColor} />
          <Text style={{ fontSize: 11, fontWeight: "700", color: deltaColor }}>
            {Math.abs(delta)} kg
          </Text>
        </View>
      )}
    </View>
  ) : null;

  return (
    <WidgetCard
      icon="analytics"
      iconColor="#001a5a"
      iconBg="#e8ecf4"
      title={t("weightLog")}
      subtitle={subtitle}
      onPress={onPress}
      disabled={disabled}
      rightSlot={RightSlot ?? undefined}
    />
  );
}
