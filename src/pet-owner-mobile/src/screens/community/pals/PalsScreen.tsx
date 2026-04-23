import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { PlaydatePrefsDto } from "../../../types/api";
import { palsApi } from "../../../api/client";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation, rowDirectionForAppLayout } from "../../../i18n";
import { NearbyPalsList } from "./NearbyPalsList";
import { LiveBeaconsList } from "./LiveBeaconsList";
import { PlaydateEventsList } from "./PlaydateEventsList";
import type { SubTab } from "./helpers";

export function PalsScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const navigation = useNavigation<any>();

  const [prefs, setPrefs] = useState<PlaydatePrefsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>("nearby");

  useEffect(() => {
    palsApi.getMyPrefs()
      .then(setPrefs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  // Gate 1: No pet
  if (prefs && !prefs.hasPet) {
    return (
      <View style={[styles.gateContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="paw-outline" size={56} color={colors.textMuted} />
        <Text style={[styles.gateTitle, { color: colors.text }]}>{t("palsNoPetGateTitle")}</Text>
        <Text style={[styles.gateSubtitle, { color: colors.textMuted }]}>{t("palsNoPetGateSubtitle")}</Text>
        <Pressable
          onPress={() => navigation.navigate("AddPet")}
          style={[styles.gateCta, { backgroundColor: colors.text }]}
        >
          <Ionicons name="add" size={18} color={colors.textInverse} />
          <Text style={{ color: colors.textInverse, fontSize: 15, fontWeight: "700" }}>{t("palsNoPetGateCta")}</Text>
        </Pressable>
      </View>
    );
  }

  // Gate 2: Not opted in
  if (prefs && !prefs.optedIn) {
    return (
      <View style={[styles.gateContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="people-outline" size={56} color={colors.textMuted} />
        <Text style={[styles.gateTitle, { color: colors.text }]}>{t("palsOptInTitle")}</Text>
        <Text style={[styles.gateSubtitle, { color: colors.textMuted }]}>{t("palsOptInSubtitle")}</Text>
        <Pressable
          onPress={() => navigation.navigate("PlaydatePrefs")}
          style={[styles.gateCta, { backgroundColor: colors.text }]}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textInverse} />
          <Text style={{ color: colors.textInverse, fontSize: 15, fontWeight: "700" }}>{t("palsOptInCta")}</Text>
        </Pressable>
      </View>
    );
  }

  // Main content: segmented control + sub-tab content
  const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: "nearby", label: t("palsTabNearby") },
    { key: "live", label: t("palsTabLiveNow") },
    { key: "events", label: t("palsTabEvents") },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Segmented control */}
      <View style={[styles.segmented, { backgroundColor: colors.surfaceSecondary, flexDirection: rowDirectionForAppLayout(isRTL) }]}>
        {SUB_TABS.map(({ key, label }) => {
          const active = subTab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setSubTab(key)}
              style={[styles.segment, active && styles.segmentActive, active && { backgroundColor: colors.surface }]}
            >
              <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? colors.text : colors.textSecondary }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => navigation.navigate("PlaydatePrefs")}
          style={{ padding: 10 }}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Sub-tab content */}
      {subTab === "nearby" && <NearbyPalsList />}
      {subTab === "live" && <LiveBeaconsList />}
      {subTab === "events" && <PlaydateEventsList />}
    </View>
  );
}

const styles = StyleSheet.create({
  gateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  gateTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  gateSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  gateCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  segmented: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 11,
  },
  segmentActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
