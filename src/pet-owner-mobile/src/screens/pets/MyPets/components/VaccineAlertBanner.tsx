import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../../i18n";
import { petHealthApi } from "../../../../api/client";

interface VaccineAlertBannerProps {
  petId: string;
  onPress: () => void;
}

export function VaccineAlertBanner({ petId, onPress }: VaccineAlertBannerProps) {
  const { t, isRTL } = useTranslation();
  const [overdueCount, setOverdueCount] = useState(0);
  const [dueSoonCount, setDueSoonCount] = useState(0);

  useEffect(() => {
    petHealthApi
      .getVaccineStatus(petId)
      .then((statuses) => {
        setOverdueCount(statuses.filter((s) => s.status === "Overdue").length);
        setDueSoonCount(statuses.filter((s) => s.status === "Due Soon").length);
      })
      .catch(() => {});
  }, [petId]);

  if (overdueCount === 0 && dueSoonCount === 0) return null;

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 12, gap: 8 }}>
      {overdueCount > 0 && (
        <Pressable
          onPress={onPress}
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#fee2e2",
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: "#fecaca",
          }}
        >
          <Ionicons name="alert-circle" size={22} color="#dc2626" />
          <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#991b1b", textAlign: isRTL ? "right" : "left" }}>
            {t("vaccineOverdueBanner").replace("{count}", String(overdueCount))}
          </Text>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color="#991b1b" />
        </Pressable>
      )}
      {dueSoonCount > 0 && (
        <Pressable
          onPress={onPress}
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#fef9c3",
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: "#fde68a",
          }}
        >
          <Ionicons name="time-outline" size={22} color="#d97706" />
          <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#854d0e", textAlign: isRTL ? "right" : "left" }}>
            {t("vaccineDueSoonBanner").replace("{count}", String(dueSoonCount))}
          </Text>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color="#854d0e" />
        </Pressable>
      )}
    </View>
  );
}
