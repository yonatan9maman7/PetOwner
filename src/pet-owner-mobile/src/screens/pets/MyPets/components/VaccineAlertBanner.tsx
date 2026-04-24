import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, rowDirectionForAppLayout } from "../../../../i18n";
import { medicalApi } from "../../../../api/client";
import { useTheme } from "../../../../theme/ThemeContext";

interface VaccineAlertBannerProps {
  petId: string;
  onPress: () => void;
}

export function VaccineAlertBanner({ petId, onPress }: VaccineAlertBannerProps) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const [overdueCount, setOverdueCount] = useState(0);
  const [dueSoonCount, setDueSoonCount] = useState(0);

  useEffect(() => {
    medicalApi
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
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            gap: 12,
            backgroundColor: colors.surface,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderWidth: 1.5,
            borderColor: colors.danger,
            shadowColor: colors.danger,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 6,
            elevation: 2,
          }}
          android_ripple={{ color: `${colors.danger}18` }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: colors.dangerLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: colors.danger, textAlign: isRTL ? "right" : "left" }}>
            {t("vaccineOverdueBanner").replace("{count}", String(overdueCount))}
          </Text>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={colors.danger} />
        </Pressable>
      )}
      {dueSoonCount > 0 && (
        <Pressable
          onPress={onPress}
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            gap: 12,
            backgroundColor: colors.surface,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderWidth: 1.5,
            borderColor: colors.warning,
            shadowColor: colors.warning,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 6,
            elevation: 2,
          }}
          android_ripple={{ color: `${colors.warning}18` }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: colors.warningLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="time-outline" size={18} color={colors.warning} />
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: colors.warning, textAlign: isRTL ? "right" : "left" }}>
            {t("vaccineDueSoonBanner").replace("{count}", String(dueSoonCount))}
          </Text>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={colors.warning} />
        </Pressable>
      )}
    </View>
  );
}
