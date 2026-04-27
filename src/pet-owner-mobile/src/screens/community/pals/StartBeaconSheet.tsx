import { useState, useCallback } from "react";
import {
  View, Text, Modal, Pressable, TextInput, ScrollView,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { showGlobalAlertCompat } from "../../../components/global-modal";
import { Ionicons } from "@expo/vector-icons";
import type { PalPetDto } from "../../../types/api";
import { palsApi, petsApi } from "../../../api/client";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation } from "../../../i18n";

const DURATION_OPTIONS = [
  { label: "beaconDuration30", value: 30 },
  { label: "beaconDuration60", value: 60 },
  { label: "beaconDuration120", value: 120 },
  { label: "beaconDuration180", value: 180 },
] as const;

interface Props {
  visible: boolean;
  onClose: () => void;
  onStarted: () => void;
}

export function StartBeaconSheet({ visible, onClose, onStarted }: Props) {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();

  const [placeName, setPlaceName] = useState("");
  const [duration, setDuration] = useState(60);
  const [myPets, setMyPets] = useState<any[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPets, setLoadingPets] = useState(false);

  const loadPets = useCallback(async () => {
    setLoadingPets(true);
    try {
      const pets = await petsApi.getMyPets();
      setMyPets(pets);
      setSelectedPetIds(pets.map((p: any) => p.id));
    } catch {}
    setLoadingPets(false);
  }, []);

  // load pets when sheet opens
  useState(() => { if (visible) loadPets(); });

  const togglePet = (id: string) =>
    setSelectedPetIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const start = async () => {
    if (!placeName.trim()) {
      showGlobalAlertCompat(t("errorTitle"), t("beaconPlacePlaceholder"));
      return;
    }
    if (selectedPetIds.length === 0) {
      showGlobalAlertCompat(t("errorTitle"), "Select at least one pet.");
      return;
    }
    setLoading(true);
    try {
      await palsApi.startBeacon({
        placeName: placeName.trim(),
        latitude: 0,  // In a real app, use expo-location to get the user's current position
        longitude: 0,
        durationMinutes: duration,
        petIds: selectedPetIds,
        species: "DOG",
      });
      setPlaceName("");
      onStarted();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? t("beaconStartError");
      showGlobalAlertCompat(t("errorTitle"), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ justifyContent: "flex-end" }}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text, textAlign: isRTL ? "right" : "left", marginBottom: 20 }}>
            {t("iAmHereNow")}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t("beaconPlaceName")} *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, color: colors.text }]}
            value={placeName}
            onChangeText={setPlaceName}
            placeholder={t("beaconPlacePlaceholder")}
            placeholderTextColor={colors.textMuted}
            textAlign={isRTL ? "right" : "left"}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t("beaconDuration")}</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {DURATION_OPTIONS.map((opt) => {
              const active = duration === opt.value;
              return (
                <Pressable key={opt.value} onPress={() => setDuration(opt.value)}
                  style={[styles.pill, { backgroundColor: active ? colors.text : colors.surface, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: active ? colors.textInverse : colors.textSecondary }}>
                    {t(opt.label as any)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Pet selection */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Your pets</Text>
          {loadingPets ? <ActivityIndicator color={colors.text} /> : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {myPets.map((pet: any) => {
                const active = selectedPetIds.includes(pet.id);
                return (
                  <Pressable key={pet.id} onPress={() => togglePet(pet.id)}
                    style={[styles.pill, { backgroundColor: active ? colors.text : colors.surface, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: active ? colors.textInverse : colors.textSecondary }}>
                      🐾 {pet.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={start}
            disabled={loading}
            style={[styles.startBtn, { backgroundColor: colors.text, opacity: loading ? 0.6 : 1 }]}
          >
            {loading
              ? <ActivityIndicator color={colors.textInverse} />
              : <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "700" }}>{t("startBeacon")}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  startBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
});
