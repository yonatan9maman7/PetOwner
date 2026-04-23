import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, rowDirectionForAppLayout } from "../../../../i18n";

interface EmergencyStripProps {
  onPress: () => void;
}

export function EmergencyStrip({ onPress }: EmergencyStripProps) {
  const { t, isRTL } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: rowDirectionForAppLayout(isRTL),
        alignItems: "center",
        marginHorizontal: 20,
        marginTop: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: "#dc2626",
        gap: 12,
        shadowColor: "#dc2626",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: "rgba(255,255,255,0.2)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="medkit" size={22} color="#fff" />
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
          {t("triageTitle")}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "500",
            color: "rgba(255,255,255,0.8)",
            textAlign: isRTL ? "right" : "left",
            marginTop: 1,
          }}
        >
          {t("triageSubtitle")}
        </Text>
      </View>
      <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="rgba(255,255,255,0.7)" />
    </Pressable>
  );
}
