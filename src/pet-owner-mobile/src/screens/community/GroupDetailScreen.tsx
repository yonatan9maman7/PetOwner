import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { communityApi } from "../../api/client";
import type {
  GroupPostDto,
  GroupPostCommentDto,
  CommunityGroupDto,
} from "../../types/api";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function GroupPostCard({
  post,
  currentUserId,
  isRTL,
  t,
}: {
  post: GroupPostDto;
  currentUserId: string | null;
  isRTL: boolean;
  t: (k: any) => string;
}) {
  const { colors } = useTheme();

  const [liked, setLiked] = useState(post.isLikedByCurrentUser);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<GroupPostCommentDto[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentsCount);

  const toggleLike = async () => {
    try {
      const res = await communityApi.toggleGroupPostLike(post.id);
      setLiked(res.isLikedByCurrentUser);
      setLikesCount(res.likesCount);
    } catch {}
  };

  const toggleComments = async () => {
    if (commentsOpen) {
      setCommentsOpen(false);
      return;
    }
    setCommentsOpen(true);
    setLoadingComments(true);
    try {
      setComments(await communityApi.getGroupPostComments(post.id));
    } catch {}
    setLoadingComments(false);
  };

  const submitComment = async () => {
    const content = commentText.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      const c = await communityApi.addGroupPostComment(post.id, content);
      setComments((prev) => [...prev, c]);
      setCommentText("");
      setCommentCount((n) => n + 1);
    } catch {}
    setSubmitting(false);
  };

  const row = { flexDirection: (isRTL ? "row-reverse" : "row") as any };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* Author */}
      <View style={{ ...row, alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.text,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.textInverse, fontSize: 13, fontWeight: "700" }}>
            {initials(post.authorName)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: colors.text,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {post.authorName}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            {relativeTime(post.createdAt)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text
        style={{
          fontSize: 15,
          color: colors.text,
          lineHeight: 22,
          marginTop: 12,
          textAlign: isRTL ? "right" : "left",
        }}
      >
        {post.content}
      </Text>

      {/* Actions */}
      <View
        style={{
          ...row,
          alignItems: "center",
          gap: 20,
          marginTop: 14,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
        }}
      >
        <Pressable
          style={{ ...row, alignItems: "center", gap: 6 }}
          onPress={toggleLike}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={20}
            color={liked ? "#e11d48" : colors.textSecondary}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: liked ? "#e11d48" : colors.textSecondary,
            }}
          >
            {likesCount}
          </Text>
        </Pressable>
        <Pressable
          style={{ ...row, alignItems: "center", gap: 6 }}
          onPress={toggleComments}
        >
          <Ionicons
            name={commentsOpen ? "chatbubble" : "chatbubble-outline"}
            size={18}
            color={colors.textSecondary}
          />
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}>
            {commentCount}
          </Text>
        </Pressable>
      </View>

      {/* Comments */}
      {commentsOpen && (
        <View
          style={{
            backgroundColor: colors.surfaceTertiary,
            borderRadius: 12,
            marginTop: 12,
            padding: 12,
          }}
        >
          {loadingComments ? (
            <ActivityIndicator
              size="small"
              color={colors.text}
              style={{ paddingVertical: 12 }}
            />
          ) : (
            comments.map((c) => (
              <View key={c.id} style={{ ...row, gap: 8, marginBottom: 10 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.textMuted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: colors.textInverse, fontSize: 10, fontWeight: "700" }}
                  >
                    {initials(c.authorName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ ...row, alignItems: "center", gap: 6 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: colors.text,
                        textAlign: isRTL ? "right" : "left",
                      }}
                    >
                      {c.authorName}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      {relativeTime(c.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      lineHeight: 18,
                      marginTop: 2,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {c.content}
                  </Text>
                </View>
              </View>
            ))
          )}
          <View style={{ ...row, alignItems: "center", gap: 8, marginTop: 8 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 8,
                fontSize: 13,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                textAlign: isRTL ? "right" : "left",
              }}
              placeholder={t("writeComment")}
              placeholderTextColor={colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              editable={!submitting}
            />
            <Pressable
              onPress={submitComment}
              disabled={!commentText.trim() || submitting}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.text,
                alignItems: "center",
                justifyContent: "center",
                opacity: !commentText.trim() || submitting ? 0.4 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Ionicons name="send" size={16} color={colors.textInverse} />
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export function GroupDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const group: CommunityGroupDto = route.params?.group;

  const [posts, setPosts] = useState<GroupPostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [posting, setPosting] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await communityApi.getGroupPosts(group.id));
    } catch {}
    setLoading(false);
  }, [group.id]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts]),
  );

  const handlePublish = async () => {
    const content = newPostContent.trim();
    if (!content || posting) return;
    setPosting(true);
    try {
      const post = await communityApi.createGroupPost(group.id, { content });
      setPosts((prev) => [post, ...prev]);
      setNewPostContent("");
      setComposerOpen(false);
    } catch {
      Alert.alert(t("errorTitle"), t("postError"));
    }
    setPosting(false);
  };

  const renderHeader = () => (
    <>
      {/* Group info card */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          marginHorizontal: 16,
          marginTop: 12,
          padding: 20,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            gap: 14,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: colors.surfaceSecondary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 26 }}>{group.icon || "👥"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {group.name}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 2,
                textAlign: isRTL ? "right" : "left",
              }}
              numberOfLines={2}
            >
              {group.description}
            </Text>
          </View>
        </View>
      </View>

      {/* Composer */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          marginHorizontal: 16,
          marginTop: 12,
          padding: 16,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        {composerOpen ? (
          <View>
            <TextInput
              style={{
                fontSize: 15,
                color: colors.text,
                minHeight: 80,
                textAlignVertical: "top",
                lineHeight: 22,
                textAlign: isRTL ? "right" : "left",
              }}
              placeholder={t("groupPostPlaceholder")}
              placeholderTextColor={colors.textMuted}
              multiline
              value={newPostContent}
              onChangeText={setNewPostContent}
              editable={!posting}
              autoFocus
            />
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 12,
                marginTop: 12,
              }}
            >
              <Pressable
                onPress={() => {
                  setComposerOpen(false);
                  setNewPostContent("");
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary }}
                >
                  {t("cancel")}
                </Text>
              </Pressable>
              <Pressable
                onPress={handlePublish}
                disabled={!newPostContent.trim() || posting}
                style={{
                  backgroundColor: colors.text,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 12,
                  minWidth: 90,
                  alignItems: "center",
                  opacity: !newPostContent.trim() || posting ? 0.5 : 1,
                }}
              >
                {posting ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text
                    style={{ color: colors.textInverse, fontSize: 14, fontWeight: "700" }}
                  >
                    {t("publishPost")}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setComposerOpen(true)}
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.text,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person" size={18} color={colors.textInverse} />
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 15,
                color: colors.textMuted,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("groupPostPlaceholder")}
            </Text>
          </Pressable>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          height: 56,
          paddingHorizontal: 20,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons
            name={isRTL ? "chevron-forward" : "chevron-back"}
            size={24}
            color={colors.text}
          />
        </Pressable>
        <Text
          style={{
            flex: 1,
            marginHorizontal: 12,
            fontSize: 17,
            fontWeight: "700",
            color: colors.text,
            textAlign: isRTL ? "right" : "left",
          }}
          numberOfLines={1}
        >
          {group.icon ? `${group.icon} ` : ""}
          {group.name}
        </Text>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View
              style={{
                alignItems: "center",
                paddingTop: 60,
                paddingHorizontal: 32,
              }}
            >
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.textMuted,
                  textAlign: "center",
                  marginTop: 12,
                }}
              >
                {t("noPostsYet")}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <GroupPostCard
              post={item}
              currentUserId={user?.id ?? null}
              isRTL={isRTL}
              t={t}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
