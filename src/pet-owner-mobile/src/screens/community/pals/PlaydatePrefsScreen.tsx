import { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, Switch, ScrollView,
  ActivityIndicator, Alert, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { PlaydatePrefsDto, UpdatePlaydatePrefsDto } from "../../../types/api";
import { palsApi } from "../../../api/client";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation, rowDirectionForAppLayout } from "../../../i18n";
import { useAuthStore } from "../../../store/authStore";

const SPECIES = ["DOG", "CAT", "BIRD", "RABBIT", "REPTILE", "OTHER"];
const DOG_SIZES = ["SMALL", "MEDIUM", "LARGE", "GIANT"];

export function PlaydatePrefsScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const navigation = useNavigation<any>();

  const [prefs, setPrefs] = useState<PlaydatePrefsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optedIn, setOptedIn] = useState(false);
  const [maxDistance, setMaxDistance] = useState(5);
  const [bio, setBio] = useState("");
  const [species, setSpecies] = useState<string[]>([]);
  const [dogSizes, setDogSizes] = useState<string[]>([]);
  const [includeAsProvider, setIncludeAsProvider] = useState(false);

  useEffect(() => {
    palsApi.getMyPrefs().then((p) => {
      setPrefs(p);
      setOptedIn(p.optedIn);
      setMaxDistance(p.maxDistanceKm);
      setBio(p.bio ?? "");
      setSpecies(p.preferredSpecies);
      setDogSizes(p.preferredDogSizes);
      setIncludeAsProvider(p.includeAsProvider);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleSpecies = (s: string) =>
    setSpecies((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const toggleSize = (s: string) =>
    setDogSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const dto: UpdatePlaydatePrefsDto = {
        optedIn,
        maxDistanceKm: maxDistance,
        bio: bio.trim() || null,
        preferredSpecies: species,
        preferredDogSizes: dogSizes,
        includeAsProvider,
      };
      await palsApi.updateMyPrefs(dto);
      Alert.alert("", t("palsPrefsSaved"));
      navigation.goBack();
    } catch (e: any) {
      if (e?.response?.data?.code === "NoPetOnProfile")
        Alert.alert(t("errorTitle"), t("palsNoPetGateSubtitle"));
      else
        Alert.alert(t("errorTitle"), "Failed to save preferences.");
    } finally {
      setSaving(false);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), alignItems: "center", padding: 16, gap: 12 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text, flex: 1, textAlign: isRTL ? "right" : "left" }}>
          {t("palsTab")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Opt-in toggle */}
        <View style={[styles.row, { borderColor: colors.border }]}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text, flex: 1, textAlign: isRTL ? "right" : "left" }}>
            {t("palsOptedIn")}
          </Text>
          <Switch
            value={optedIn}
            onValueChange={setOptedIn}
            trackColor={{ true: colors.text, false: colors.border }}
          />
        </View>

        {/* Provider toggle (only if provider) */}
        {prefs?.isProvider && (
          <View style={[styles.row, { borderColor: colors.border }]}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1, textAlign: isRTL ? "right" : "left" }}>
              {t("palsIncludeAsProvider")}
            </Text>
            <Switch
              value={includeAsProvider}
              onValueChange={setIncludeAsProvider}
              trackColor={{ true: colors.text, false: colors.border }}
            />
          </View>
        )}

        {/* Max distance — stepper */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("palsMaxDistance")}: {maxDistance} km</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 4 }}>
          <Pressable
            onPress={() => setMaxDistance((v) => Math.max(1, v - 1))}
            style={[styles.stepBtn, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}
          >
            <Ionicons name="remove" size={18} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, minWidth: 40, textAlign: "center" }}>
            {maxDistance} km
          </Text>
          <Pressable
            onPress={() => setMaxDistance((v) => Math.min(50, v + 1))}
            style={[styles.stepBtn, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}
          >
            <Ionicons name="add" size={18} color={colors.text} />
          </Pressable>
        </View>

        {/* Bio */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("palsBio")}</Text>
        <TextInput
          style={[styles.bioInput, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, color: colors.text }]}
          value={bio}
          onChangeText={setBio}
          placeholder={t("palsBioPlaceholder")}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={280}
          textAlign={isRTL ? "right" : "left"}
        />

        {/* Species pills */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("filterBySpecies")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SPECIES.map((s) => {
            const active = species.includes(s);
            return (
              <Pressable key={s} onPress={() => toggleSpecies(s)}
                style={[styles.pill, { backgroundColor: active ? colors.text : colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: active ? colors.textInverse : colors.textSecondary }}>{s}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Dog sizes */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("dogSizeLabel")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {DOG_SIZES.map((s) => {
            const active = dogSizes.includes(s);
            const labelKey = `dogSize${s.charAt(0) + s.slice(1).toLowerCase()}` as any;
            return (
              <Pressable key={s} onPress={() => toggleSize(s)}
                style={[styles.pill, { backgroundColor: active ? colors.text : colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: active ? colors.textInverse : colors.textSecondary }}>{t(labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Save */}
        <Pressable
          onPress={save}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.text, opacity: saving ? 0.6 : 1 }]}
        >
          {saving
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "700" }}>{t("save")}</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 8,
  },
  bioInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  saveBtn: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
