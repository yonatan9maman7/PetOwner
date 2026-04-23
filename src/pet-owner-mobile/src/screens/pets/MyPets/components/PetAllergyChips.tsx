import { View, Text } from "react-native";
import type { PetDto } from "../../../../types/api";
import { useTranslation, type TranslationKey, rowDirectionForAppLayout } from "../../../../i18n";
import { ALLERGY_LABEL_I18N } from "../../addPetHelpers";

interface PetAllergyChipsProps {
  pet: PetDto;
  isRTL: boolean;
  surfaceColor: string;
  borderLight: string;
}

function formatAllergySegment(
  raw: string,
  t: (key: TranslationKey) => string,
): string {
  const s = raw.trim();
  if (!s) return s;
  const key = ALLERGY_LABEL_I18N[s] ?? ALLERGY_LABEL_I18N[s.replace(/\s+/g, " ")];
  if (key) return t(key);
  for (const [label, k] of Object.entries(ALLERGY_LABEL_I18N)) {
    if (label.toLowerCase() === s.toLowerCase()) return t(k);
  }
  return s;
}

export function PetAllergyChips({ pet, isRTL, surfaceColor, borderLight }: PetAllergyChipsProps) {
  const { t } = useTranslation();
  if (!pet.allergies && !pet.medicalConditions) return null;

  return (
    <View
      style={{
        backgroundColor: surfaceColor,
        borderTopWidth: 1,
        borderTopColor: borderLight,
        paddingHorizontal: 20,
        paddingVertical: 10,
        flexDirection: rowDirectionForAppLayout(isRTL),
        flexWrap: "wrap",
        gap: 6,
      }}
    >
      {pet.allergies?.split(",").map((a, i) => (
        <View
          key={`a${i}`}
          style={{
            backgroundColor: "#fef2f2",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#dc2626" }}>
            ⚠ {formatAllergySegment(a, t)}
          </Text>
        </View>
      ))}
      {pet.medicalConditions?.split(",").map((c, i) => (
        <View
          key={`c${i}`}
          style={{
            backgroundColor: "#fef9c3",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#854d0e" }}>{c.trim()}</Text>
        </View>
      ))}
    </View>
  );
}
