import { useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { PlaydateEventDto } from "../../../types/api";
import { playdatesApi } from "../../../api/client";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation, rowDirectionForAppLayout } from "../../../i18n";
import { PlaydateEventCard } from "./PlaydateEventCard";
import { ListEmptyState } from "../../../components/shared";

export function PlaydateEventsList() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<PlaydateEventDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await playdatesApi.list());
    } catch {}
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useState(() => { load(); });

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.text]} />
        }
        ListEmptyComponent={
          loading ? null : (
            <ListEmptyState icon="calendar-outline" title={t("playdateEventsEmpty")} message={t("playdateEventsEmptySubtitle")} />
          )
        }
        renderItem={({ item }) => <PlaydateEventCard event={item} onRsvpChange={() => {}} />}
      />

      {/* Create event FAB */}
      <Pressable
        onPress={() => navigation.navigate("CreatePlaydateEvent")}
        style={[styles.fab, { backgroundColor: colors.text, flexDirection: rowDirectionForAppLayout(isRTL) }]}
      >
        <Ionicons name="add" size={20} color={colors.textInverse} />
        <Text style={{ color: colors.textInverse, fontSize: 14, fontWeight: "700" }}>{t("createEvent")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
