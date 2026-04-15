import { View, Text } from "react-native";
import type { PetDto } from "../../../../types/api";

interface PetAllergyChipsProps {
  pet: PetDto;
  isRTL: boolean;
  surfaceColor: string;
  borderLight: string;
}

export function PetAllergyChips({ pet, isRTL, surfaceColor, borderLight }: PetAllergyChipsProps) {
  if (!pet.allergies && !pet.medicalConditions) return null;

  return (
    <View
      style={{
        backgroundColor: surfaceColor,
        borderTopWidth: 1,
        borderTopColor: borderLight,
        paddingHorizontal: 20,
        paddingVertical: 10,
        flexDirection: isRTL ? "row-reverse" : "row",
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
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#dc2626" }}>⚠ {a.trim()}</Text>
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
