import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, Image, ActivityIndicator,
  Alert, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { PalDto } from "../../../types/api";
import { palsApi } from "../../../api/client";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation, rowDirectionForAppLayout } from "../../../i18n";
import { formatBreedForDisplay } from "../../pets/addPetHelpers";
import { PetTagChips } from "./PetTagChips";
import { initials, formatDistance } from "./helpers";

export function PalProfileScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId: string = route.params?.userId;

  const [pal, setPal] = useState<PalDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    palsApi.getNearby().then((pals) => {
      const found = pals.find((p) => p.userId === userId);
      if (found) setPal(found);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  const onSendRequest = async () => {
    if (sending) return;
    setSending(true);
    try {
      const r = await palsApi.sendPlaydateRequest(userId, { message: undefined });
      navigation.replace("ChatRoom", {
        otherUserId: r.otherUserId,
        otherUserName: r.otherUserName,
        prefilledMessage: r.prefilledMessage,
      });
    } catch (e: any) {
      if (e?.response?.status === 429)
        Alert.alert(t("palsLimitReachedTitle"), t("palsLimitReachedBody"));
      else if (e?.response?.data?.code === "NoPetOnProfile")
        Alert.alert(t("errorTitle"), t("palsNoPetGateSubtitle"));
      else
        Alert.alert(t("errorTitle"), t("playdateRequestError"));
    } finally {
      setSending(false);
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

  if (!pal) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.textMuted }}>{t("errorTitle")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
      </Pressable>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* User header */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <View style={[styles.bigAvatar, { backgroundColor: colors.text }]}>
            <Text style={{ color: colors.textInverse, fontSize: 28, fontWeight: "700" }}>{initials(pal.name)}</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 12 }}>{pal.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={{ fontSize: 13, color: colors.textMuted }}>{formatDistance(pal.distanceKm, isRTL)}</Text>
          </View>
          {pal.bio ? <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: "center" }}>{pal.bio}</Text> : null}
        </View>

        {/* Pets */}
        {pal.pets.map((pet) => (
          <View key={pet.id} style={[styles.petCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), gap: 12, alignItems: "center" }}>
              {pet.imageUrl ? (
                <Image source={{ uri: pet.imageUrl }} style={styles.petImage} />
              ) : (
                <View style={[styles.petImage, { backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="paw-outline" size={24} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{pet.name}</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  {[
                    pet.species,
                    pet.breed ? formatBreedForDisplay(pet.breed, t) : null,
                    pet.dogSize ? `(${pet.dogSize})` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{pet.age}y old</Text>
              </View>
            </View>
            <PetTagChips pet={pet} maxChips={10} />
          </View>
        ))}

        {/* CTA */}
        <Pressable
          onPress={onSendRequest}
          disabled={sending}
          style={[styles.ctaBtn, { backgroundColor: colors.text, opacity: sending ? 0.6 : 1 }]}
        >
          {sending ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Ionicons name="chatbubble-outline" size={18} color={colors.textInverse} />
              <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "700" }}>{t("palsSayHi")}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: { padding: 16 },
  bigAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  petCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  petImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
});
