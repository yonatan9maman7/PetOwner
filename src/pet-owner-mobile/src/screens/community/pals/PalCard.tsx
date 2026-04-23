import { useState } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { PalDto } from "../../../types/api";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation, rowDirectionForAppLayout } from "../../../i18n";
import { PetTagChips } from "./PetTagChips";
import { initials, formatDistance } from "./helpers";

interface Props {
  pal: PalDto;
}

export function PalCard({ pal }: Props) {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const navigation = useNavigation<any>();

  return (
    <Pressable
      onPress={() => navigation.navigate("PalProfile", { userId: pal.userId })}
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow, borderColor: colors.border }]}
    >
      {/* Header row */}
      <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), alignItems: "center", gap: 12 }}>
        <View style={[styles.avatar, { backgroundColor: colors.text }]}>
          <Text style={[styles.avatarText, { color: colors.textInverse }]}>{initials(pal.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>{pal.name}</Text>
          <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), alignItems: "center", gap: 4, marginTop: 2 }}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{formatDistance(pal.distanceKm, isRTL)}</Text>
            {pal.city ? <Text style={{ fontSize: 12, color: colors.textMuted }}>· {pal.city}</Text> : null}
          </View>
        </View>
        <Pressable
          onPress={() => navigation.navigate("PalProfile", { userId: pal.userId })}
          style={[styles.sayHiBtn, { backgroundColor: colors.text }]}
        >
          <Text style={{ color: colors.textInverse, fontSize: 13, fontWeight: "700" }}>{t("palsSayHi")}</Text>
        </Pressable>
      </View>

      {/* Pets */}
      {pal.pets.map((pet) => (
        <View key={pet.id} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), alignItems: "center", gap: 8 }}>
            {pet.imageUrl ? (
              <Image source={{ uri: pet.imageUrl }} style={styles.petThumb} />
            ) : (
              <View style={[styles.petThumb, { backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="paw-outline" size={16} color={colors.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
                {pet.name}
                {pet.breed ? ` · ${pet.breed}` : ""}
                {pet.dogSize ? ` · ${pet.dogSize}` : ""}
              </Text>
            </View>
          </View>
          <PetTagChips pet={pet} maxChips={3} />
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "700" },
  name: { fontSize: 16, fontWeight: "700" },
  sayHiBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  petThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
