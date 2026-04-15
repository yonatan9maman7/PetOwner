import { useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useNotificationStore } from "../../store/notificationStore";
import {
  resolveNotificationApiText,
  useTranslation,
  type TranslationKey,
} from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import type { NotificationDto } from "../../types/api";
import { parseUtcTimestamp } from "../../utils/parseUtcTimestamp";

function formatNotificationRelativeTime(
  dateStr: string,
  t: (key: TranslationKey) => string,
): string {
  const then = parseUtcTimestamp(dateStr);
  if (!then) return "";
  let diffMs = Date.now() - then.getTime();
  if (diffMs < 0) diffMs = 0;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return t("timeRelJustNow");
  if (mins < 60) {
    if (mins === 1) return t("timeRelOneMinute");
    return t("timeRelMinutes").replace(/\{\{n\}\}/g, String(mins));
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    if (hrs === 1) return t("timeRelOneHour");
    return t("timeRelHours").replace(/\{\{n\}\}/g, String(hrs));
  }
  const days = Math.floor(hrs / 24);
  if (days === 1) return t("timeRelOneDay");
  return t("timeRelDays").replace(/\{\{n\}\}/g, String(days));
}

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL, language } = useTranslation();
  const { colors } = useTheme();
  const notifications = useNotificationStore((s) => s.notifications);
  const loading = useNotificationStore((s) => s.loading);
  const fetchNotifications = useNotificationStore(
    (s) => s.fetchNotifications,
  );
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const handlePress = useCallback(
    (n: NotificationDto) => {
      if (!n.isRead) markRead(n.id);

      switch (n.type) {
        case "ProviderApplication":
          navigation.navigate("AdminDashboard");
          break;
        case "BookingCreated":
        case "NewRequest":
          navigation.navigate("MyBookings", { tab: "incoming" });
          break;
        case "BookingConfirmed":
        case "RequestCompleted":
        case "RequestCancelled":
        case "RequestAccepted":
          navigation.navigate("MyBookings", { tab: "outgoing" });
          break;
      }
    },
    [markRead, navigation],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={colors.primary}
          />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "700", color: colors.primary }}>
          {t("notificationsTitle")}
        </Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead}>
            <Text
              style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}
            >
              {t("markAllRead")}
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <Ionicons
            name="notifications-off-outline"
            size={56}
            color={colors.borderLight}
          />
          <Text
            style={{
              color: colors.textMuted,
              marginTop: 12,
              fontWeight: "600",
              fontSize: 15,
              textAlign: "center",
            }}
          >
            {t("noNotifications")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 140 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "flex-start",
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: item.isRead ? colors.surface : colors.cardHighlight,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: item.isRead ? colors.border : "#8b5cf6",
                  marginTop: 5,
                }}
              />

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: item.isRead ? "600" : "700",
                      color: colors.text,
                      flex: 1,
                      textAlign: isRTL ? "right" : "left",
                    }}
                    numberOfLines={1}
                  >
                    {resolveNotificationApiText(item.title, language)}
                  </Text>
                  <View
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {!item.isRead && (
                      <View
                        style={{
                          backgroundColor: "#8b5cf6",
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: "700",
                            color: "#fff",
                          }}
                        >
                          {t("unread")}
                        </Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      {formatNotificationRelativeTime(item.createdAt, t)}
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    lineHeight: 19,
                    textAlign: isRTL ? "right" : "left",
                  }}
                  numberOfLines={3}
                >
                  {resolveNotificationApiText(item.message, language)}
                </Text>

                <View
                  style={{
                    alignSelf: isRTL ? "flex-end" : "flex-start",
                    backgroundColor: colors.surfaceSecondary,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    marginTop: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "600",
                      color: colors.textMuted,
                    }}
                  >
                    {item.type}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
