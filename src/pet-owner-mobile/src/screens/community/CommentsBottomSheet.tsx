import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActionSheetIOS,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { postsApi } from "../../api/client";
import type { CommentDto } from "../../types/api";
import {
  insertCommentTree,
  replaceTempCommentInTree,
  removeCommentFromTree,
  toggleLikeInTree,
  setLikeStateInTree,
  editCommentInTree,
  countSubtree,
  parseMentions,
} from "./commentTree";

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

interface ReplyTarget {
  commentId: string;
  topLevelId: string;
  userName: string;
}

interface Props {
  postId: string;
  postAuthorId: string;
  visible: boolean;
  onClose: () => void;
  onCommentCountChange: (delta: number) => void;
}

export function CommentsBottomSheet({
  postId,
  postAuthorId,
  visible,
  onClose,
  onCommentCountChange,
}: Props) {
  const { colors } = useTheme();
  const { t, rtlText, rtlRow, rtlInput, isRTL } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const styles = getStyles(colors);

  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await postsApi.getComments(postId);
      setComments(data);
    } catch {}
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    if (visible) {
      load();
    } else {
      setComments([]);
      setReplyTarget(null);
      setDraft("");
      setEditingId(null);
    }
  }, [visible, load]);

  // Focus input when reply mode activates
  useEffect(() => {
    if (replyTarget) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [replyTarget]);

  const totalCount = comments.reduce((n, c) => n + 1 + c.replies.length, 0);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const submit = async () => {
    const content = draft.trim();
    if (!content || submitting) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: CommentDto = {
      id: tempId,
      parentCommentId: replyTarget?.topLevelId ?? null,
      userId: me?.id ?? "",
      userName: me?.name ?? "",
      content,
      createdAt: new Date().toISOString(),
      editedAt: null,
      likeCount: 0,
      likedByMe: false,
      replies: [],
    };

    const savedReply = replyTarget;
    setComments((prev) => insertCommentTree(prev, optimistic));
    setDraft("");
    setReplyTarget(null);
    onCommentCountChange(1);
    setSubmitting(true);

    try {
      const real = await postsApi.addComment(postId, {
        content,
        parentCommentId: savedReply?.topLevelId ?? undefined,
      });
      setComments((prev) => replaceTempCommentInTree(prev, tempId, real));
    } catch {
      setComments((prev) => removeCommentFromTree(prev, tempId));
      onCommentCountChange(-1);
      setReplyTarget(savedReply);
      setDraft(content);
      Alert.alert(t("errorTitle"), t("commentError"));
    }
    setSubmitting(false);
  };

  // ── Like ────────────────────────────────────────────────────────────────────

  const toggleLike = async (commentId: string) => {
    setComments((prev) => toggleLikeInTree(prev, commentId));
    try {
      const r = await postsApi.toggleCommentLike(commentId);
      setComments((prev) => setLikeStateInTree(prev, commentId, r.liked, r.likeCount));
    } catch {
      setComments((prev) => toggleLikeInTree(prev, commentId));
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────

  const startEdit = (comment: CommentDto) => {
    setEditingId(comment.id);
    setEditDraft(comment.content);
  };

  const saveEdit = async (commentId: string) => {
    const content = editDraft.trim();
    if (!content) return;
    try {
      const r = await postsApi.editComment(commentId, content);
      setComments((prev) => editCommentInTree(prev, commentId, r.content, r.editedAt));
    } catch {
      Alert.alert(t("errorTitle"), t("commentError"));
    }
    setEditingId(null);
  };

  // ── Delete ───────────────────────────────────────────────────────────────────

  const deleteComment = (comment: CommentDto) => {
    Alert.alert("", t("confirmDeleteComment"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("deletePet"),
        style: "destructive",
        onPress: async () => {
          const delta = countSubtree(comments, comment.id);
          setComments((prev) => removeCommentFromTree(prev, comment.id));
          onCommentCountChange(-delta);
          try {
            await postsApi.deleteComment(comment.id);
          } catch {
            load();
            onCommentCountChange(delta);
          }
        },
      },
    ]);
  };

  // ── Long-press action (own comment) ─────────────────────────────────────────

  const handleLongPress = (comment: CommentDto) => {
    if (comment.userId !== me?.id) return;
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t("cancel"), t("editComment"), t("deletePet")],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
        },
        (idx) => {
          if (idx === 1) startEdit(comment);
          if (idx === 2) deleteComment(comment);
        },
      );
    } else {
      Alert.alert("", comment.content.slice(0, 60), [
        { text: t("cancel"), style: "cancel" },
        { text: t("editComment"), onPress: () => startEdit(comment) },
        { text: t("deletePet"), style: "destructive", onPress: () => deleteComment(comment) },
      ]);
    }
  };

  // ── Content renderer ────────────────────────────────────────────────────────

  const renderContent = (text: string) => {
    const segments = parseMentions(text);
    return (
      <Text>
        {segments.map((seg, i) =>
          seg.type === "mention" ? (
            <Text key={i} style={{ color: colors.text, fontWeight: "600" }}>
              {seg.value}
            </Text>
          ) : (
            <Text key={i} style={{ color: colors.textSecondary }}>
              {seg.value}
            </Text>
          ),
        )}
      </Text>
    );
  };

  // ── Comment row ─────────────────────────────────────────────────────────────

  const renderCommentRow = (comment: CommentDto, isReply = false) => {
    const isMine = comment.userId === me?.id;
    const isEditing = editingId === comment.id;

    return (
      <Pressable
        key={comment.id}
        onLongPress={() => handleLongPress(comment)}
        style={[styles.commentRow, isReply && styles.replyRow]}
      >
        {/* Avatar */}
        <View style={[styles.commentAvatar, isReply && styles.replyAvatar]}>
          <Text style={[styles.commentAvatarText, isReply && { fontSize: 9 }]}>
            {initials(comment.userName)}
          </Text>
        </View>

        {/* Bubble */}
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={[{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, flexWrap: "wrap" }]}>
            <Text style={[styles.commentAuthor, rtlText]}>{comment.userName}</Text>
            {comment.editedAt && (
              <Text style={styles.editedLabel}>· {t("edited")}</Text>
            )}
            <Text style={styles.commentTime}>{relativeTime(comment.createdAt)}</Text>
          </View>

          {/* Content or inline edit */}
          {isEditing ? (
            <View style={{ marginTop: 6, gap: 6 }}>
              <TextInput
                style={[styles.editInput, rtlInput]}
                value={editDraft}
                onChangeText={setEditDraft}
                multiline
                autoFocus
              />
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
                <Pressable onPress={() => setEditingId(null)}>
                  <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>{t("cancel")}</Text>
                </Pressable>
                <Pressable onPress={() => saveEdit(comment.id)} disabled={!editDraft.trim()}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={[styles.bubble]}>
              <Text style={[styles.commentContent, rtlText]}>{renderContent(comment.content)}</Text>
            </View>
          )}

          {/* Action row */}
          {!isEditing && (
            <View style={[styles.commentActions, rtlRow]}>
              <Pressable onPress={() => toggleLike(comment.id)} style={[styles.commentAction, rtlRow]}>
                <Ionicons
                  name={comment.likedByMe ? "heart" : "heart-outline"}
                  size={14}
                  color={comment.likedByMe ? "#e11d48" : colors.textMuted}
                />
                {comment.likeCount > 0 && (
                  <Text style={[styles.commentActionText, comment.likedByMe && { color: "#e11d48" }]}>
                    {comment.likeCount}
                  </Text>
                )}
              </Pressable>

              {!isReply && (
                <Pressable
                  onPress={() =>
                    setReplyTarget({
                      commentId: comment.id,
                      topLevelId: comment.id,
                      userName: comment.userName,
                    })
                  }
                  style={styles.commentAction}
                >
                  <Text style={styles.commentActionText}>{t("reply")}</Text>
                </Pressable>
              )}

              {isMine && (
                <>
                  <Pressable onPress={() => startEdit(comment)} style={styles.commentAction}>
                    <Text style={styles.commentActionText}>{t("editComment")}</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteComment(comment)} style={styles.commentAction}>
                    <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  // ── Flat list data (top-level + replies interleaved) ─────────────────────────

  type ListItem =
    | { kind: "comment"; comment: CommentDto; isReply: false }
    | { kind: "reply"; comment: CommentDto; isReply: true };

  const listData: ListItem[] = [];
  for (const c of comments) {
    listData.push({ kind: "comment", comment: c, isReply: false });
    for (const r of c.replies) {
      listData.push({ kind: "reply", comment: r, isReply: true });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBackdrop} onPress={onClose} />

        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {/* Drag handle + header */}
          <View style={styles.handle} />
          <View style={[styles.header, rtlRow]}>
            <Text style={[styles.headerTitle, rtlText]}>
              {t("commentsCountTitle")} ({totalCount})
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Comment list */}
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} style={{ flex: 1, alignSelf: "center" }} />
          ) : listData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>{t("noCommentsYet")}</Text>
            </View>
          ) : (
            <FlashList
              data={listData}
              keyExtractor={(item) => item.comment.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
              renderItem={({ item }) => renderCommentRow(item.comment, item.isReply)}
            />
          )}

          {/* Reply chip */}
          {replyTarget && (
            <View style={[styles.replyChip, rtlRow]}>
              <Text style={[styles.replyChipText, rtlText]} numberOfLines={1}>
                {t("replyingTo").replace("{{name}}", replyTarget.userName)}
              </Text>
              <Pressable onPress={() => setReplyTarget(null)} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          )}

          {/* Composer */}
          <View style={[styles.composer, rtlRow]}>
            <TextInput
              ref={inputRef}
              style={[styles.composerInput, rtlInput]}
              placeholder={t("writeComment")}
              placeholderTextColor={colors.textMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={1000}
              editable={!submitting}
            />
            <Pressable
              onPress={submit}
              disabled={!draft.trim() || submitting}
              style={[styles.sendBtn, (!draft.trim() || submitting) && { opacity: 0.4 }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Ionicons
                  name="send"
                  size={16}
                  color={colors.textInverse}
                  style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
                />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    overlayBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "92%",
      minHeight: 300,
      paddingBottom: 8,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      paddingHorizontal: 32,
    },
    commentRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 14,
    },
    replyRow: {
      marginStart: 36,
      marginTop: 10,
    },
    commentAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.text,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    replyAvatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.textMuted,
    },
    commentAvatarText: {
      color: colors.textInverse,
      fontSize: 11,
      fontWeight: "700",
    },
    commentAuthor: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    editedLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    commentTime: {
      fontSize: 11,
      color: colors.textMuted,
    },
    bubble: {
      backgroundColor: colors.surfaceTertiary,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 4,
    },
    commentContent: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    commentActions: {
      flexDirection: "row",
      gap: 14,
      marginTop: 4,
      paddingHorizontal: 2,
    },
    commentAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    commentActionText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "600",
    },
    editInput: {
      backgroundColor: colors.surfaceTertiary,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 40,
    },
    replyChip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 16,
      marginBottom: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      gap: 8,
    },
    replyChipText: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    composerInput: {
      flex: 1,
      backgroundColor: colors.surfaceTertiary,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 120,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.text,
      alignItems: "center",
      justifyContent: "center",
    },
  });
