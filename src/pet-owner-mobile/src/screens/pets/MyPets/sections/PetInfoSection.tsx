import { View, Text, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, rowDirectionForAppLayout } from "../../../../i18n";
import { useTheme } from "../../../../theme/ThemeContext";
import type { PetDto } from "../../../../types/api";

function InfoCard({
  icon,
  label,
  value,
  isRTL,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isRTL: boolean;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: color + "18",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={{ fontSize: 12, fontWeight: "700", color: color, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 21,
          textAlign: isRTL ? "right" : "left",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function PetInfoSection({ pet }: { pet: PetDto }) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const hasMedical =
    pet.medicalNotes ||
    pet.feedingSchedule ||
    pet.microchipNumber ||
    pet.vetName ||
    pet.isNeutered;

  if (!hasMedical) {
    return (
      <View style={{ padding: 32, alignItems: "center" }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: "#f5f3ff",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons name="information-circle-outline" size={32} color="#c4b5fd" />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: "600", textAlign: "center" }}>
          {t("noMedicalInfo")}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: "center" }}>
          {t("noMedicalInfoHint")}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20, gap: 16 }}>
      {pet.medicalNotes && (
        <InfoCard icon="document-text" label={t("medicalNotes")} value={pet.medicalNotes} isRTL={isRTL} color="#0d9488" />
      )}
      {pet.feedingSchedule && (
        <InfoCard icon="restaurant" label={t("feedingSchedule")} value={pet.feedingSchedule} isRTL={isRTL} color="#f59e0b" />
      )}
      {pet.microchipNumber && (
        <InfoCard icon="hardware-chip" label={t("microchip")} value={pet.microchipNumber} isRTL={isRTL} color="#6366f1" />
      )}
      {pet.isNeutered && (
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            gap: 10,
            backgroundColor: "#ecfdf5",
            padding: 14,
            borderRadius: 14,
          }}
        >
          <Ionicons name="checkmark-circle" size={20} color="#0d9488" />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#0d9488" }}>{t("neutered")}</Text>
        </View>
      )}
      {pet.vetName && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "#ecfdf5",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="medkit" size={18} color="#0d9488" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#0f766e",
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {pet.vetName}
              </Text>
              {pet.vetPhone && (
                <Pressable onPress={() => Linking.openURL(`tel:${pet.vetPhone}`)}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#0d9488",
                      textDecorationLine: "underline",
                      textAlign: isRTL ? "right" : "left",
                      marginTop: 2,
                    }}
                  >
                    {pet.vetPhone}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
