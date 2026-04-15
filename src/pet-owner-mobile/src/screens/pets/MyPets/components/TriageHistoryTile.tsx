import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../../i18n";

interface TriageHistoryTileProps {
  onPress: () => void;
  disabled?: boolean;
}

export function TriageHistoryTile({ onPress, disabled }: TriageHistoryTileProps) {
  const { t, isRTL } = useTranslation();

  return (
    <View
      style={{
        backgroundColor: "#6366f1",
        borderRadius: 20,
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
        overflow: "hidden",
        marginHorizontal: 20,
        marginTop: 12,
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          paddingVertical: 18,
          paddingHorizontal: 20,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 14,
          opacity: disabled ? 0.5 : 1,
        }}
        android_ripple={{ color: "rgba(255,255,255,0.2)" }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="pulse" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "800",
              color: "#fff",
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("triageHistory")}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
              marginTop: 2,
              fontWeight: "500",
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("viewAssessments")}
          </Text>
        </View>
        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color="rgba(255,255,255,0.6)" />
      </Pressable>
    </View>
  );
}
