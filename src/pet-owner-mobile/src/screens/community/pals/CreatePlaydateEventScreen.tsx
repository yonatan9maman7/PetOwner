import { useState } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView,
  ActivityIndicator, Alert, StyleSheet, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { CreatePlaydateEventDto } from "../../../types/api";
import { playdatesApi } from "../../../api/client";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation, rowDirectionForAppLayout } from "../../../i18n";

const SPECIES = ["DOG", "CAT", "BIRD", "RABBIT", "OTHER"];

export function CreatePlaydateEventScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const navigation = useNavigation<any>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [species, setSpecies] = useState<string[]>(["DOG"]);
  const [maxPets, setMaxPets] = useState("");
  const [creating, setCreating] = useState(false);

  // Simple date/time state (30 min from now, rounded to nearest 30)
  const defaultDate = new Date(Date.now() + 24 * 3600 * 1000);
  const [scheduledFor, setScheduledFor] = useState(defaultDate.toISOString().slice(0, 16));

  const toggleSpecies = (s: string) =>
    setSpecies((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const create = async () => {
    if (!title.trim()) {
      Alert.alert(t("errorTitle"), "Title is required.");
      return;
    }
    if (!locationName.trim()) {
      Alert.alert(t("errorTitle"), "Location is required.");
      return;
    }
    setCreating(true);
    try {
      const dto: CreatePlaydateEventDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        locationName: locationName.trim(),
        latitude: 0,
        longitude: 0,
        scheduledFor: new Date(scheduledFor).toISOString(),
        allowedSpecies: species.length > 0 ? species : ["DOG"],
        maxPets: maxPets ? parseInt(maxPets, 10) : undefined,
      };
      await playdatesApi.create(dto);
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "Failed to create event.";
      Alert.alert(t("errorTitle"), msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), alignItems: "center", padding: 16, gap: 12 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text, flex: 1, textAlign: isRTL ? "right" : "left" }}>
          {t("createEvent")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("eventTitle")} *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, color: colors.text }]}
          value={title}
          onChangeText={setTitle}
          placeholder={t("eventTitle")}
          placeholderTextColor={colors.textMuted}
          textAlign={isRTL ? "right" : "left"}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("eventLocation")} *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, color: colors.text }]}
          value={locationName}
          onChangeText={setLocationName}
          placeholder="e.g. Hayarkon Park"
          placeholderTextColor={colors.textMuted}
          textAlign={isRTL ? "right" : "left"}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("eventDescription")}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, color: colors.text, minHeight: 80, textAlignVertical: "top" }]}
          value={description}
          onChangeText={setDescription}
          placeholder={t("eventDescription")}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlign={isRTL ? "right" : "left"}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("eventDate")} *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, color: colors.text }]}
          value={scheduledFor}
          onChangeText={setScheduledFor}
          placeholder="YYYY-MM-DDTHH:MM"
          placeholderTextColor={colors.textMuted}
          textAlign={isRTL ? "right" : "left"}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("eventAllowedSpecies")}</Text>
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

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("eventMaxPets")}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, color: colors.text, width: 100 }]}
          value={maxPets}
          onChangeText={setMaxPets}
          keyboardType="number-pad"
          placeholder="∞"
          placeholderTextColor={colors.textMuted}
        />

        <Pressable
          onPress={create}
          disabled={creating}
          style={[styles.createBtn, { backgroundColor: colors.text, opacity: creating ? 0.6 : 1 }]}
        >
          {creating
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "700" }}>{t("createEvent")}</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  createBtn: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
});
