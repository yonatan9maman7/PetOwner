import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Alert, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { LiveBeaconDto } from "../../../types/api";
import { palsApi } from "../../../api/client";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation } from "../../../i18n";
import { useAuthStore } from "../../../store/authStore";
import { PetTagChips } from "./PetTagChips";
import { initials, formatRemaining, formatDistance } from "./helpers";

export function LiveBeaconDetailScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const beaconId: string = route.params?.beaconId;
  const user = useAuthStore((s) => s.user);

  const [beacon, setBeacon] = useState<LiveBeaconDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [remaining, setRemaining] = useState({ minutes: 0, label: "", urgent: false });

  useEffect(() => {
    palsApi.getActiveBeacons().then((beacons) => {
      const found = beacons.find((b) => b.id === beaconId);
      if (found) {
        setBeacon(found);
        setRemaining(formatRemaining(found.expiresAt));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [beaconId]);

  useEffect(() => {
    if (!beacon) return;
    const id = setInterval(() => setRemaining(formatRemaining(beacon.expiresAt)), 60_000);
    return () => clearInterval(id);
  }, [beacon]);

  const endBeacon = async () => {
    if (!beacon || ending) return;
    setEnding(true);
    try {
      await palsApi.endBeacon(beacon.id);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t("errorTitle"), "Could not end beacon.");
    } finally {
      setEnding(false);
    }
  };

  const sayHi = async () => {
    if (!beacon) return;
    try {
      const r = await palsApi.sendPlaydateRequest(beacon.hostUserId, {});
      navigation.navigate("ChatRoom", {
        otherUserId: r.otherUserId,
        otherUserName: r.otherUserName,
        prefilledMessage: r.prefilledMessage,
      });
    } catch (e: any) {
      if (e?.response?.status === 429)
        Alert.alert(t("palsLimitReachedTitle"), t("palsLimitReachedBody"));
      else
        Alert.alert(t("errorTitle"), t("playdateRequestError"));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  if (!beacon) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 16 }}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.textMuted }}>{t("beaconExpired")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isHost = user?.id === beacon.hostUserId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <Pressable onPress={() => navigation.goBack()} style={{ padding: 16 }}>
        <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
      </Pressable>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* Live badge */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <View style={[styles.liveDot, { backgroundColor: remaining.urgent ? "#dc2626" : "#16a34a" }]} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: remaining.urgent ? "#dc2626" : "#16a34a" }}>
            {remaining.label}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>· {formatDistance(beacon.distanceKm, isRTL)}</Text>
        </View>

        {/* Host */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <View style={[styles.avatar, { backgroundColor: colors.text }]}>
            <Text style={{ color: colors.textInverse, fontSize: 18, fontWeight: "700" }}>{initials(beacon.hostUserName)}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{beacon.hostUserName}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={{ fontSize: 14, color: colors.textMuted }}>{beacon.placeName}</Text>
            </View>
          </View>
        </View>

        {/* Pets */}
        {beacon.pets.map((pet) => (
          <View key={pet.id} style={[styles.petCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>🐾 {pet.name}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              {[pet.species, pet.breed, pet.dogSize].filter(Boolean).join(" · ")}
            </Text>
            <PetTagChips pet={pet} maxChips={6} />
          </View>
        ))}

        {/* Actions */}
        {isHost ? (
          <Pressable
            onPress={endBeacon}
            disabled={ending}
            style={[styles.actionBtn, { backgroundColor: "#dc2626", opacity: ending ? 0.6 : 1, marginTop: 20 }]}
          >
            {ending ? <ActivityIndicator color="#fff" /> : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                {t("endMyBeacon").replace("{{min}}", String(remaining.minutes))}
              </Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={sayHi}
            style={[styles.actionBtn, { backgroundColor: colors.text, marginTop: 20 }]}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.textInverse} />
            <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "700" }}>{t("palsSayHi")}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  petCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
});
