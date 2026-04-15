import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "../../store/chatStore";
import { startConnection } from "../../services/signalr";
import { useTranslation } from "../../i18n";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import {
  BrandedAppHeader,
  BRAND_HEADER_HORIZONTAL_PAD,
} from "../../components/BrandedAppHeader";
import { ListSkeleton, ListEmptyState } from "../../components/shared";
import type { ChatConversationDto } from "../../types/api";

function formatTimeAgo(dateStr: string, t: (k: string) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) return t("today");
  if (diffDays === 1) return t("yesterday");
  return date.toLocaleDateString();
}

export function MessagesScreen() {
  const { t, rtlText, rtlRow, isRTL } = useTranslation();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.loading);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    startConnection();
  }, []);

  useFocusEffect(
    useCallback(() => {
      useChatStore.getState().fetchConversations();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await useChatStore.getState().fetchConversations();
    setRefreshing(false);
  }, []);

  const sorted = [...conversations].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() -
      new Date(a.lastMessageAt).getTime(),
  );

  const handlePress = useCallback(
    (otherUserId: string, otherUserName: string) => {
      navigation.navigate("ChatRoom", { otherUserId, otherUserName });
    },
    [navigation],
  );

  const renderItem = ({ item }: { item: ChatConversationDto }) => {
    const initials = item.otherUserName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const snippet = item.lastMessageSnippet
      ? item.lastMessageSnippet.length > 40
        ? item.lastMessageSnippet.slice(0, 40) + "\u2026"
        : item.lastMessageSnippet
      : "";

    return (
      <TouchableOpacity
        onPress={() => handlePress(item.otherUserId, item.otherUserName)}
        activeOpacity={0.7}
        style={{ paddingHorizontal: BRAND_HEADER_HORIZONTAL_PAD, paddingVertical: 16 }}
      >
        <View style={[rtlRow, { alignItems: "center", gap: 12 }]}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.primary,
            }}
          >
            {item.otherUserAvatar ? (
              <Ionicons name="person-circle" size={48} color={colors.textInverse} />
            ) : (
              <Text style={{ color: colors.textInverse, fontWeight: "bold", fontSize: 16 }}>
                {initials}
              </Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View style={[rtlRow, { alignItems: "center", justifyContent: "space-between", marginBottom: 4 }]}>
              <Text
                style={[rtlText, { fontSize: 16, fontWeight: "600", color: colors.text }]}
                numberOfLines={1}
              >
                {item.otherUserName}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {formatTimeAgo(item.lastMessageAt, t as (k: string) => string)}
              </Text>
            </View>

            <View style={[rtlRow, { alignItems: "center", justifyContent: "space-between" }]}>
              <Text
                style={[rtlText, { fontSize: 14, color: colors.textMuted, flex: 1 }]}
                numberOfLines={1}
              >
                {snippet}
              </Text>
              {item.unreadCount > 0 && (
                <View
                  style={{
                    marginLeft: 8,
                    minWidth: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 6,
                  }}
                >
                  <Text style={{ color: colors.textInverse, fontSize: 12, fontWeight: "bold" }}>
                    {item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <ListEmptyState
      icon="chatbubbles-outline"
      title={t("noMessages")}
      message={t("noMessagesSubtitle")}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      <BrandedAppHeader />

      <Text
        style={[
          rtlText,
          {
            fontSize: 20,
            fontWeight: "bold",
            color: colors.text,
            paddingHorizontal: BRAND_HEADER_HORIZONTAL_PAD,
            paddingTop: 16,
            paddingBottom: 8,
          },
        ]}
      >
        {t("messagesTitle")}
      </Text>

      {loading && conversations.length === 0 ? (
        <ListSkeleton rows={6} variant="row" />
      ) : (
        <FlashList
          data={sorted}
          keyExtractor={(item) => item.conversationId}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                marginHorizontal: BRAND_HEADER_HORIZONTAL_PAD,
              }}
            />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
