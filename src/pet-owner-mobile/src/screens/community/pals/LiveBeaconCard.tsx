import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { LiveBeaconDto } from "../../../types/api";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation, rowDirectionForAppLayout } from "../../../i18n";
import { PetTagChips } from "./PetTagChips";
import { initials, formatRemaining, formatDistance } from "./helpers";

interface Props {
  beacon: LiveBeaconDto;
}

export function LiveBeaconCard({ beacon }: Props) {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const navigation = useNavigation<any>();
  const [remaining, setRemaining] = useState(() => formatRemaining(beacon.expiresAt));

  useEffect(() => {
    const id = setInterval(() => setRemaining(formatRemaining(beacon.expiresAt)), 60_000);
    return () => clearInterval(id);
  }, [beacon.expiresAt]);

  return (
    <Pressable
      onPress={() => navigation.navigate("LiveBeaconDetail", { beaconId: beacon.id })}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}
    >
      {/* Live badge + countdown */}
      <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), alignItems: "center", gap: 8, marginBottom: 8 }}>
        <View style={[styles.liveDot, { backgroundColor: remaining.urgent ? "#dc2626" : "#16a34a" }]} />
        <Text style={{ fontSize: 12, fontWeight: "700", color: remaining.urgent ? "#dc2626" : "#16a34a" }}>
          {remaining.label}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginLeft: "auto" }}>
          {formatDistance(beacon.distanceKm, isRTL)}
        </Text>
      </View>

      {/* Host info */}
      <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), alignItems: "center", gap: 10 }}>
        <View style={[styles.avatar, { backgroundColor: colors.text }]}>
          <Text style={{ color: colors.textInverse, fontSize: 14, fontWeight: "700" }}>{initials(beacon.hostUserName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
            {beacon.hostUserName}
          </Text>
          <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), alignItems: "center", gap: 4 }}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{beacon.placeName}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => navigation.navigate("LiveBeaconDetail", { beaconId: beacon.id })}
          style={[styles.sayHiBtn, { backgroundColor: colors.text }]}
        >
          <Text style={{ color: colors.textInverse, fontSize: 13, fontWeight: "700" }}>{t("palsSayHi")}</Text>
        </Pressable>
      </View>

      {/* Pets */}
      {beacon.pets.slice(0, 2).map((pet) => (
        <View key={pet.id} style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
            🐾 {pet.name}{pet.breed ? ` · ${pet.breed}` : ""}
          </Text>
          <PetTagChips pet={pet} maxChips={2} />
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
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sayHiBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
});
