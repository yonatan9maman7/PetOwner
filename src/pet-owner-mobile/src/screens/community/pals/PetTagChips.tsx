import type { PalPetDto } from "../../../types/api";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation } from "../../../i18n";

const TAG_LABEL_KEYS: Record<string, string> = {
  HighEnergy: "tagHighEnergy",
  LowEnergy: "tagLowEnergy",
  Playful: "tagPlayful",
  Calm: "tagCalm",
  Friendly: "tagFriendly",
  SelectiveFriends: "tagSelectiveFriends",
  GoodWithKids: "tagGoodWithKids",
  GoodWithSmallDogs: "tagGoodWithSmallDogs",
  GoodWithLargeDogs: "tagGoodWithLargeDogs",
  Trained: "tagTrained",
  InTraining: "tagInTraining",
  Senior: "tagSenior",
  Puppy: "tagPuppy",
};

const STERILIZATION_KEY: Record<string, string> = {
  Spayed: "sterilizationSpayed",
  Neutered: "sterilizationNeutered",
  Intact: "sterilizationIntact",
};

interface Props {
  pet: PalPetDto;
  maxChips?: number;
}

export function PetTagChips({ pet, maxChips = 3 }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const chips: string[] = [];

  if (pet.sterilization && STERILIZATION_KEY[pet.sterilization]) {
    chips.push(t(STERILIZATION_KEY[pet.sterilization] as any));
  }

  for (const tag of pet.tags) {
    if (TAG_LABEL_KEYS[tag]) {
      chips.push(t(TAG_LABEL_KEYS[tag] as any));
    }
  }

  const visible = chips.slice(0, maxChips);
  const hidden = chips.length - visible.length;

  if (visible.length === 0) return null;

  return (
    <View style={styles.row}>
      {visible.map((label, i) => (
        <View key={i} style={[styles.chip, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}>
          <Text style={[styles.chipText, { color: colors.textSecondary }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ))}
      {hidden > 0 && (
        <View style={[styles.chip, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}>
          <Text style={[styles.chipText, { color: colors.textMuted }]}>+{hidden}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
