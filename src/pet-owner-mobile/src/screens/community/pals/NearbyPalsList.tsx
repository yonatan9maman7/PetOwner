import { useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import type { PalDto } from "../../../types/api";
import { palsApi } from "../../../api/client";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation } from "../../../i18n";
import { PalCard } from "./PalCard";
import { ListEmptyState } from "../../../components/shared";

export function NearbyPalsList() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [pals, setPals] = useState<PalDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await palsApi.getNearby();
      setPals(data);
    } catch (e: any) {
      const code = e?.response?.data?.code;
      if (code === "NoPetOnProfile") setError("noPet");
      else if (code === "LocationRequired") setError("noLocation");
      else setError("other");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // load on first render
  useState(() => { load(); });

  if (loading && pals.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
      <FlashList
        data={pals}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.text]} />
      }
      ListEmptyComponent={
        error === "noLocation" ? (
          <ListEmptyState icon="location-outline" title={t("errorTitle")} message="Set your location in your profile to find nearby pals." />
        ) : (
          <ListEmptyState icon="paw-outline" title={t("noNearbyPals")} message={t("noNearbyPalsSubtitle")} />
        )
      }
      renderItem={({ item }) => <PalCard pal={item} />}
    />
  );
}
