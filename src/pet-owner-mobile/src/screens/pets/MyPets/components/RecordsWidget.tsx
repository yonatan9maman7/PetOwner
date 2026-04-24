import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MedicalRecordDto } from "../../../../types/api";
import { useTranslation } from "../../../../i18n";
import { WidgetCard } from "./WidgetCard";
import { useTheme } from "../../../../theme/ThemeContext";

interface RecordsWidgetProps {
  medicalRecords: MedicalRecordDto[];
  onPress: () => void;
  disabled?: boolean;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

export function RecordsWidget({ medicalRecords, onPress, disabled }: RecordsWidgetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const sortedRecords = [...medicalRecords].sort(
    (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime(),
  );
  const lastRecord = sortedRecords[0];
  const count = medicalRecords.length;

  const subtitle =
    count === 0
      ? t("noRecordsYet")
      : lastRecord?.date ?? lastRecord?.createdAt
        ? t("lastRecordOn").replace("{date}", formatRelativeDate(lastRecord.date || lastRecord.createdAt))
        : `${count} records`;

  const RightSlot =
    count > 0 ? (
      <View style={{ position: "relative", width: 38, height: 38 }}>
        <Ionicons name="documents" size={34} color={`${colors.warning}40`} />
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: colors.warning,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "800", color: "#fff" }}>
            {count > 99 ? "99+" : String(count)}
          </Text>
        </View>
      </View>
    ) : undefined;

  return (
    <WidgetCard
      icon="folder-open"
      iconColor="#d97706"
      iconBg="#fef3c7"
      title={t("medicalRecords")}
      subtitle={subtitle}
      onPress={onPress}
      disabled={disabled}
      rightSlot={RightSlot}
    />
  );
}
