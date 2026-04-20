import { useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { PlaydateEventDto } from "../../../types/api";
import { playdatesApi } from "../../../api/client";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation } from "../../../i18n";

interface Props {
  event: PlaydateEventDto;
  onRsvpChange?: (eventId: string, status: string | null) => void;
}

export function PlaydateEventCard({ event, onRsvpChange }: Props) {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const navigation = useNavigation<any>();
  const [myRsvp, setMyRsvp] = useState(event.myRsvpStatus);
  const [goingCount, setGoingCount] = useState(event.goingCount);
  const [rsvping, setRsvping] = useState(false);
  const rsvpLockRef = useRef(false);

  const rsvp = async (status: string) => {
    if (rsvping || rsvpLockRef.current) return;
    rsvpLockRef.current = true;
    setRsvping(true);
    const prevRsvp = myRsvp;
    try {
      await playdatesApi.rsvp(event.id, { status: status as any });
      setMyRsvp(status as any);
      if (status === "Going" && prevRsvp !== "Going") setGoingCount((n) => n + 1);
      if (status !== "Going" && prevRsvp === "Going") setGoingCount((n) => Math.max(0, n - 1));
      onRsvpChange?.(event.id, status);
    } catch {
      Alert.alert(t("genericErrorTitle"), t("genericErrorDesc"));
    } finally {
      setRsvping(false);
      rsvpLockRef.current = false;
    }
  };

  const scheduledDate = new Date(event.scheduledFor);

  return (
    <Pressable
      onPress={() => navigation.navigate("PlaydateEventDetail", { eventId: event.id })}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}
    >
      {event.isCancelled && (
        <View style={styles.cancelledBanner}>
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{t("eventCancelled")}</Text>
        </View>
      )}

      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text, textAlign: isRTL ? "right" : "left" }}>{event.title}</Text>

      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, marginTop: 6 }}>
        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
        <Text style={{ fontSize: 13, color: colors.textMuted }}>
          {scheduledDate.toLocaleDateString()} · {scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>

      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, marginTop: 4 }}>
        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
        <Text style={{ fontSize: 13, color: colors.textMuted }}>{event.locationName}</Text>
        {event.distanceKm != null && (
          <Text style={{ fontSize: 12, color: colors.textMuted }}>· {event.distanceKm}km</Text>
        )}
      </View>

      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, marginTop: 4 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>
          {t("goingCount").replace("{{n}}", String(goingCount))}
          {event.maybeCount > 0 ? ` · ${t("maybeCount").replace("{{n}}", String(event.maybeCount))}` : ""}
        </Text>
      </View>

      {!event.isCancelled && (
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginTop: 12 }}>
          {(["Going", "Maybe", "NotGoing"] as const).map((s) => {
            const active = myRsvp === s;
            const label = s === "Going" ? t("rsvpGoing") : s === "Maybe" ? t("rsvpMaybe") : t("rsvpCantGo");
            return (
              <Pressable key={s} onPress={() => rsvp(s)} disabled={rsvping}
                style={[styles.rsvpPill, { backgroundColor: active ? colors.text : colors.surface, borderColor: colors.border, opacity: rsvping ? 0.6 : 1 }]}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: active ? colors.textInverse : colors.textSecondary }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
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
    overflow: "hidden",
  },
  cancelledBanner: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  rsvpPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
});
