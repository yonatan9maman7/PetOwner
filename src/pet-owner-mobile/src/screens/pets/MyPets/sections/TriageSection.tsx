import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, rowDirectionForAppLayout } from "../../../../i18n";
import { useTheme } from "../../../../theme/ThemeContext";
import { triageApi } from "../../../../api/client";
import { ListSkeleton } from "../../../../components/shared/ListSkeleton";
import type { TeletriageHistoryDto } from "../../../../types/api";
import { SEVERITY_COLOR } from "../constants";

export function TriageSection({ petId, reloadNonce = 0 }: { petId: string; reloadNonce?: number }) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const [history, setHistory] = useState<TeletriageHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    triageApi
      .getHistory(petId)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [petId, reloadNonce]);

  if (loading) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <ListSkeleton rows={3} variant="row" />
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={{ padding: 32, alignItems: "center" }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: colors.primaryLight,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons name="pulse-outline" size={32} color="#a5b4fc" />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: "600", textAlign: "center" }}>{t("noTriageHistory")}</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20, gap: 12 }}>
      {history.map((session) => {
        const sevColor = SEVERITY_COLOR[session.severity] ?? "#94a3b8";
        return (
          <View
            key={session.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), alignItems: "center", gap: 8, marginBottom: 10 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: sevColor,
                }}
              />
              <View
                style={{
                  backgroundColor: sevColor + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: sevColor }}>{session.severity}</Text>
              </View>
              {session.isEmergency && (
                <View
                  style={{
                    backgroundColor: "#fee2e2",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#ef4444" }}>{t("emergency")}</Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>{new Date(session.createdAt).toLocaleDateString()}</Text>
            </View>

            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                lineHeight: 19,
                textAlign: isRTL ? "right" : "left",
                marginBottom: 8,
              }}
              numberOfLines={3}
            >
              {session.symptoms}
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                lineHeight: 19,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {session.assessment}
            </Text>

            {session.recommendations && (
              <View
                style={{
                  backgroundColor: colors.primaryLight,
                  borderRadius: 10,
                  padding: 12,
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: "#1e40af",
                    lineHeight: 18,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {session.recommendations}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
