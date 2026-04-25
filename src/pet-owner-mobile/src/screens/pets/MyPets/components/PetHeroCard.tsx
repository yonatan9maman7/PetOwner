import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../../i18n";
import { formatBreedForDisplay } from "../../addPetHelpers";
import type { PetDto } from "../../../../types/api";
import { getSpeciesEmoji } from "../constants";

interface PetHeroCardProps {
  pet: PetDto;
  primaryColor: string;
}

/** Top gradient area: avatar, name, stats, lost badge. */
export function PetHeroCard({ pet, primaryColor }: PetHeroCardProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        backgroundColor: primaryColor,
        paddingTop: 24,
        paddingBottom: 28,
        paddingHorizontal: 24,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          backgroundColor: "rgba(255,255,255,0.15)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 38 }}>{getSpeciesEmoji(pet.species)}</Text>
      </View>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "800",
          color: "#fff",
          textAlign: "center",
        }}
      >
        {pet.name}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.7)",
          textAlign: "center",
          marginTop: 4,
        }}
      >
        {pet.breed ? formatBreedForDisplay(pet.breed, t) : ""}
        {pet.breed ? " · " : ""}
        {pet.age}y
        {pet.weight ? ` · ${pet.weight}kg` : ""}
      </Text>

      {pet.isLost && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            backgroundColor: "#ef4444",
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 10,
          }}
        >
          <Ionicons name="alert-circle" size={14} color="#fff" />
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>{t("lostLabel")}</Text>
        </View>
      )}
    </View>
  );
}
