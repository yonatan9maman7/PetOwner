import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable, ActivityIndicator,
  Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { PlaydateEventDetailDto, PlaydateCommentDto } from "../../../types/api";
import { playdatesApi } from "../../../api/client";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation } from "../../../i18n";
import { useAuthStore } from "../../../store/authStore";
import { relativeTime, initials } from "./helpers";

export function PlaydateEventDetailScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const eventId: string = route.params?.eventId;
  const user = useAuthStore((s) => s.user);

  const [detail, setDetail] = useState<PlaydateEventDetailDto | null>(null);
  const [comments, setComments] = useState<PlaydateCommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([
        playdatesApi.getById(eventId),
        playdatesApi.getComments(eventId),
      ]);
      setDetail(d);
      setComments(c);
    } catch {}
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const sendComment = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const c = await playdatesApi.addComment(eventId, content);
      setComments((prev) => [...prev, c]);
      setDraft("");
    } catch {}
    setSending(false);
  };

  const cancelEvent = async () => {
    Alert.alert(t("cancelEvent"), t("confirmCancelEvent"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("cancelEvent"), style: "destructive",
        onPress: async () => {
          try {
            await playdatesApi.cancel(eventId);
            navigation.goBack();
          } catch { Alert.alert(t("errorTitle"), "Failed to cancel event."); }
        },
      },
    ]);
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

  if (!detail) return null;
  const { event } = detail;
  const isHost = user?.id === event.hostUserId;
  const scheduledDate = new Date(event.scheduledFor);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", padding: 16, gap: 12 }}>
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, flex: 1, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>
            {event.title}
          </Text>
          {isHost && !event.isCancelled && (
            <Pressable onPress={cancelEvent}>
              <Ionicons name="trash-outline" size={22} color="#dc2626" />
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {/* Event info */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                {scheduledDate.toLocaleDateString()} · {scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{event.locationName}</Text>
            </View>
            {event.description ? (
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 10 }}>{event.description}</Text>
            ) : null}
          </View>

          {/* Attendees */}
          {detail.attendees.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                {t("goingCount").replace("{{n}}", String(event.goingCount))}
              </Text>
              {detail.attendees.filter((a) => a.status === "Going").map((a) => (
                <View key={a.userId} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <View style={[styles.miniAvatar, { backgroundColor: colors.text }]}>
                    <Text style={{ color: colors.textInverse, fontSize: 11, fontWeight: "700" }}>{initials(a.userName)}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: colors.text }}>{a.userName}</Text>
                  {a.pet && <Text style={{ fontSize: 12, color: colors.textMuted }}>· 🐾 {a.pet.name}</Text>}
                </View>
              ))}
            </View>
          )}

          {/* Comments */}
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 20, marginBottom: 10, textAlign: isRTL ? "right" : "left" }}>
            {t("eventComments")}
          </Text>
          {comments.map((c) => (
            <View key={c.id} style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginBottom: 12 }}>
              <View style={[styles.miniAvatar, { backgroundColor: colors.textMuted }]}>
                <Text style={{ color: colors.textInverse, fontSize: 11, fontWeight: "700" }}>{initials(c.userName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>{c.userName}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{relativeTime(c.createdAt)}</Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{c.content}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Comment composer */}
        {!event.isCancelled && (
          <View style={[styles.composerRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.commentInput, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, color: colors.text }]}
              value={draft}
              onChangeText={setDraft}
              placeholder={t("eventAddComment")}
              placeholderTextColor={colors.textMuted}
              textAlign={isRTL ? "right" : "left"}
            />
            <Pressable
              onPress={sendComment}
              disabled={!draft.trim() || sending}
              style={[styles.sendBtn, { backgroundColor: colors.text, opacity: (!draft.trim() || sending) ? 0.5 : 1 }]}
            >
              {sending ? <ActivityIndicator size="small" color={colors.textInverse} /> : (
                <Ionicons name="send" size={16} color={colors.textInverse} />
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
