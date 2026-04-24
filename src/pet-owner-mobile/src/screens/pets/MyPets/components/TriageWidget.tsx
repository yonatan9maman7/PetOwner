import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation, rowDirectionForAppLayout } from "../../../../i18n";

interface TriageWidgetProps {
  onOpenTriage: () => void;
  onOpenHistory: () => void;
  disabled?: boolean;
}

export function TriageWidget({ onOpenTriage, onOpenHistory, disabled }: TriageWidgetProps) {
  const { t, isRTL } = useTranslation();

  return (
    <View
      style={{
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#4f46e5",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <LinearGradient
        colors={["#4f46e5", "#7c3aed"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Pressable
          onPress={onOpenTriage}
          disabled={disabled}
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            paddingHorizontal: 18,
            paddingVertical: 16,
            gap: 14,
          }}
          android_ripple={{ color: "rgba(255,255,255,0.15)" }}
        >
          {/* Icon */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="sparkles" size={24} color="#fff" />
          </View>

          {/* Text */}
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
                color: "rgba(255,255,255,0.75)",
                marginTop: 2,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("poweredByGemini")}
            </Text>
          </View>

          {/* History chevron */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (!disabled) onOpenHistory();
            }}
            disabled={disabled}
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              gap: 3,
              backgroundColor: "rgba(255,255,255,0.15)",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
            }}
          >
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={14}
              color="rgba(255,255,255,0.7)"
            />
          </Pressable>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
