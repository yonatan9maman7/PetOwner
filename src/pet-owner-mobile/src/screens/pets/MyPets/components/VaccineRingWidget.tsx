import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { VaccineStatusDto } from "../../../../types/api";
import { useTranslation } from "../../../../i18n";
import { WidgetCard } from "./WidgetCard";
import type { Section } from "../types";

interface VaccineRingWidgetProps {
  vaccineStatuses: VaccineStatusDto[];
  onPress: () => void;
  disabled?: boolean;
}

const RING_SIZE = 52;
const STROKE = 5;
const R = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

function VaccineRing({ pct, color }: { pct: number; color: string }) {
  const dash = CIRCUMFERENCE * pct;
  const gap = CIRCUMFERENCE - dash;

  return (
    <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: "-90deg" }] }}>
      {/* Track */}
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={R}
        stroke="#e2e8f0"
        strokeWidth={STROKE}
        fill="none"
      />
      {/* Progress */}
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={R}
        stroke={color}
        strokeWidth={STROKE}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function VaccineRingWidget({ vaccineStatuses, onPress, disabled }: VaccineRingWidgetProps) {
  const { t } = useTranslation();

  const total = vaccineStatuses.length;
  const upToDate = vaccineStatuses.filter((v) => v.status === "Up to Date").length;
  const overdue = vaccineStatuses.filter((v) => v.status === "Overdue").length;
  const dueSoon = vaccineStatuses.filter((v) => v.status === "Due Soon").length;

  const pct = total === 0 ? 0 : upToDate / total;
  const ringColor = overdue > 0 ? "#ef4444" : dueSoon > 0 ? "#f59e0b" : "#059669";

  const subtitle =
    overdue > 0
      ? t("vaccineOverdueBanner").replace("{count}", String(overdue))
      : dueSoon > 0
        ? t("vaccineDueSoonBanner").replace("{count}", String(dueSoon))
        : t("vaccinesUpToDate").replace("{n}", String(upToDate));

  const RightSlot = (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute" }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "800",
            color: ringColor,
            textAlign: "center",
          }}
        >
          {total === 0 ? "–" : `${Math.round(pct * 100)}%`}
        </Text>
      </View>
      <VaccineRing pct={pct} color={ringColor} />
    </View>
  );

  return (
    <WidgetCard
      icon="shield-checkmark"
      iconColor="#059669"
      iconBg="#dcfce7"
      title={t("vaccines")}
      subtitle={subtitle}
      onPress={onPress}
      disabled={disabled}
      rightSlot={RightSlot}
    />
  );
}
