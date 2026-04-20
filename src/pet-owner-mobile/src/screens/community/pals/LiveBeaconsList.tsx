import { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, Pressable, ActivityIndicator, StyleSheet, RefreshControl,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import type { LiveBeaconDto } from "../../../types/api";
import { palsApi } from "../../../api/client";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation } from "../../../i18n";
import { LiveBeaconCard } from "./LiveBeaconCard";
import { StartBeaconSheet } from "./StartBeaconSheet";
import { ListEmptyState } from "../../../components/shared";
import { formatRemaining } from "./helpers";

export function LiveBeaconsList() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const [beacons, setBeacons] = useState<LiveBeaconDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [myBeaconExpiry, setMyBeaconExpiry] = useState<string | null>(null);
  const [myBeaconId, setMyBeaconId] = useState<string | null>(null);
  const [endingBeacon, setEndingBeacon] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await palsApi.getActiveBeacons();
      setBeacons(data);
    } catch {}
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useState(() => { load(); });

  const endBeacon = async () => {
    if (!myBeaconId || endingBeacon) return;
    setEndingBeacon(true);
    try {
      await palsApi.endBeacon(myBeaconId);
      setMyBeaconId(null);
      setMyBeaconExpiry(null);
      await load();
    } catch {}
    setEndingBeacon(false);
  };

  const remaining = myBeaconExpiry ? formatRemaining(myBeaconExpiry) : null;

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        data={beacons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.text]} />
        }
        ListEmptyComponent={
          loading ? null : (
            <ListEmptyState icon="radio-outline" title={t("liveNowEmpty")} message={t("liveNowEmptySubtitle")} />
          )
        }
        renderItem={({ item }) => <LiveBeaconCard beacon={item} />}
      />

      {/* Sticky bottom CTA */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {myBeaconId && remaining ? (
          <Pressable
            onPress={endBeacon}
            disabled={endingBeacon}
            style={[styles.beaconBtn, { backgroundColor: "#dc2626", opacity: endingBeacon ? 0.6 : 1 }]}
          >
            {endingBeacon
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                  {t("endMyBeacon").replace("{{min}}", String(remaining.minutes))}
                </Text>}
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setSheetOpen(true)}
            style={[styles.beaconBtn, { backgroundColor: colors.text }]}
          >
            <Ionicons name="location" size={18} color={colors.textInverse} />
            <Text style={{ color: colors.textInverse, fontSize: 15, fontWeight: "700" }}>{t("iAmHereNow")}</Text>
          </Pressable>
        )}
      </View>

      <StartBeaconSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onStarted={() => {
          load();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  beaconBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
});
