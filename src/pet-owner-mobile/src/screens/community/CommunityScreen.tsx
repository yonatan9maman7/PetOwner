import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  RefreshControl,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { AuthPlaceholder } from "../../components/AuthPlaceholder";
import { BrandedAppHeader } from "../../components/BrandedAppHeader";
import { ListSkeleton, ListEmptyState } from "../../components/shared";
import { ImageLightbox } from "../../components/ImageLightbox";
import { CommentsBottomSheet } from "./CommentsBottomSheet";
import { postsApi, communityApi, filesApi } from "../../api/client";
import { PalsScreen } from "./pals/PalsScreen";
import type { PostDto, CommunityGroupDto } from "../../types/api";

const PAGE_SIZE = 20;

type MainTab = "feed" | "pals" | "groups";
type Channel = "global" | "lost_and_found";

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

/* ═══════════════════ PostCard (Feed) ═══════════════════ */

function PostCard({
  post,
  currentUserId,
  onToggleLike,
  onDelete,
  rtlText,
  rtlRow,
  t,
  isLikePending,
  isDeletePending,
}: {
  post: PostDto;
  currentUserId: string | null;
  onToggleLike: (id: string) => void;
  onDelete: (id: string) => void;
  rtlText: object;
  rtlRow: object;
  rtlInput?: object;
  t: (k: any) => string;
  isLikePending?: boolean;
  isDeletePending?: boolean;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const isMine = currentUserId === post.userId;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount);

  return (
    <View style={styles.card}>
      <View style={[styles.cardRow, rtlRow]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(post.userName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={[styles.authorRow, rtlRow]}>
            <Text style={[styles.authorName, rtlText]}>{post.userName}</Text>
            {post.authorIsApprovedProvider && (
              <View style={styles.providerBadge}>
                <Ionicons name="shield-checkmark" size={10} color={colors.textInverse} />
                <Text style={styles.providerBadgeText}>Provider</Text>
              </View>
            )}
            {post.category === "lost_and_found" && (
              <View style={styles.sosBadge}>
                <Text style={styles.sosBadgeText}>{t("sosCategory")}</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>{relativeTime(post.createdAt)}</Text>
        </View>
        {isMine && (
          <Pressable
            disabled={isDeletePending}
            onPress={() =>
              Alert.alert(t("deletePostConfirm"), "", [
                { text: t("cancel"), style: "cancel" },
                {
                  text: t("deletePet"),
                  style: "destructive",
                  onPress: () => onDelete(post.id),
                },
              ])
            }
            hitSlop={8}
            style={{ opacity: isDeletePending ? 0.45 : 1 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {!!post.content && (
        <Text style={[styles.contentText, rtlText]}>{post.content}</Text>
      )}

      {post.imageUrl && (
        <>
          <Pressable onPress={() => setLightboxOpen(true)}>
            <Image
              source={{ uri: post.imageUrl }}
              style={styles.postImage}
              resizeMode="cover"
            />
          </Pressable>
          <ImageLightbox
            visible={lightboxOpen}
            imageUrl={post.imageUrl}
            onClose={() => setLightboxOpen(false)}
          />
        </>
      )}

      <View style={[styles.actionBar, rtlRow]}>
        <Pressable
          style={[styles.actionBtn, rtlRow, { opacity: isLikePending ? 0.5 : 1 }]}
          onPress={() => onToggleLike(post.id)}
          disabled={isLikePending}
        >
          <Ionicons
            name={post.likedByMe ? "heart" : "heart-outline"}
            size={20}
            color={post.likedByMe ? "#e11d48" : colors.textSecondary}
          />
          <Text
            style={[
              styles.actionText,
              post.likedByMe && { color: "#e11d48" },
            ]}
          >
            {post.likeCount}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, rtlRow]}
          onPress={() => setSheetOpen(true)}
        >
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={styles.actionText}>{localCommentCount}</Text>
        </Pressable>
      </View>

      <CommentsBottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        postId={post.id}
        postAuthorId={post.userId}
        onCommentCountChange={(delta) => {
          setLocalCommentCount((n) => Math.max(0, n + delta));
        }}
      />
    </View>
  );
}

/* ═══════════════════ Main Screen ═══════════════════ */

export function CommunityScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Admin";
  const { t, rtlText, rtlRow, rtlInput, rtlStyle, isRTL } = useTranslation();
  const styles = getStyles(colors);

  const [mainTab, setMainTab] = useState<MainTab>("feed");

  /* ── Feed state ── */
  const [channel, setChannel] = useState<Channel>("global");
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const channelRef = useRef(channel);
  channelRef.current = channel;

  /* ── Groups state ── */
  const [groups, setGroups] = useState<CommunityGroupDto[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [groupsRefreshing, setGroupsRefreshing] = useState(false);
  const composerInputRef = useRef<TextInput>(null);
  const likeLockRef = useRef<Set<string>>(new Set());
  const deleteLockRef = useRef<Set<string>>(new Set());
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});
  const [deleteBusy, setDeleteBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!composerOpen) return;
    const id = setTimeout(() => composerInputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [composerOpen]);

  /* ── Feed logic ── */
  const loadFeed = useCallback(
    async (p: number, cat: Channel, replace: boolean) => {
      if (replace) setLoading(true);
      try {
        const category =
          cat === "lost_and_found" ? "lost_and_found" : undefined;
        const data = await postsApi.getFeed(p, PAGE_SIZE, category);
        setPosts((prev) => (replace ? data : [...prev, ...data]));
        setHasMore(data.length >= PAGE_SIZE);
        setPage(p);
      } catch (error) {
        if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
          Alert.alert(t("genericErrorTitle"), t("genericErrorDesc"));
        }
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const onRefreshFeed = useCallback(async () => {
    setRefreshing(true);
    await loadFeed(1, channelRef.current, true);
    setRefreshing(false);
  }, [loadFeed]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      setGroups(await communityApi.getGroups());
    } catch (error) {
      if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
        Alert.alert(t("genericErrorTitle"), t("genericErrorDesc"));
      }
    } finally {
      setGroupsLoading(false);
    }
  }, [t]);

  const onRefreshGroups = useCallback(async () => {
    setGroupsRefreshing(true);
    try {
      setGroups(await communityApi.getGroups());
    } catch (error) {
      if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
        Alert.alert(t("genericErrorTitle"), t("genericErrorDesc"));
      }
    } finally {
      setGroupsRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn) return;
      if (mainTab === "feed") loadFeed(1, channelRef.current, true);
      else if (mainTab === "groups") loadGroups();
    }, [isLoggedIn, mainTab, loadFeed, loadGroups]),
  );

  const switchChannel = (ch: Channel) => {
    setChannel(ch);
    loadFeed(1, ch, true);
  };

  const handlePublish = async () => {
    const content = newPostContent.trim();
    if ((!content && !pickedImageUri) || posting) return;
    setPosting(true);
    try {
      let imageUrl: string | undefined;
      if (pickedImageUri) {
        setUploadingImage(true);
        const up = await filesApi.uploadImage(pickedImageUri, "posts");
        imageUrl = up.url;
        setUploadingImage(false);
      }
      const post = await postsApi.create({
        content,
        imageUrl,
        category:
          channel === "lost_and_found" ? "lost_and_found" : undefined,
      } as any);
      setPosts((prev) => [post, ...prev]);
      setNewPostContent("");
      setPickedImageUri(null);
      setComposerOpen(false);
    } catch {
      Alert.alert(t("errorTitle"), t("postError"));
    } finally {
      setUploadingImage(false);
      setPosting(false);
    }
  };

  const handleToggleLike = useCallback(async (id: string) => {
    if (likeLockRef.current.has(id)) return;
    likeLockRef.current.add(id);
    setLikeBusy((p) => ({ ...p, [id]: true }));
    try {
      const result = await postsApi.toggleLike(id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, likedByMe: result.liked, likeCount: result.likeCount }
            : p,
        ),
      );
    } catch (error) {
      if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
        Alert.alert(t("genericErrorTitle"), t("genericErrorDesc"));
      }
    } finally {
      likeLockRef.current.delete(id);
      setLikeBusy((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    }
  }, [t]);

  const handleDelete = useCallback(async (id: string) => {
    if (deleteLockRef.current.has(id)) return;
    deleteLockRef.current.add(id);
    setDeleteBusy((p) => ({ ...p, [id]: true }));
    try {
      await postsApi.deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
        Alert.alert(t("genericErrorTitle"), t("genericErrorDesc"));
      }
    } finally {
      deleteLockRef.current.delete(id);
      setDeleteBusy((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    }
  }, [t]);

  const loadMore = () => {
    if (!loading && hasMore) loadFeed(page + 1, channel, false);
  };

  /* ── Groups logic ── */
  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const g = await communityApi.createGroup({
        name,
        description: newGroupDesc.trim() || undefined,
        icon: newGroupIcon.trim() || undefined,
      });
      setGroups((prev) => [g, ...prev]);
      setCreateModalOpen(false);
      setNewGroupName("");
      setNewGroupDesc("");
      setNewGroupIcon("");
      Alert.alert("", t("groupCreated"));
    } catch {
      Alert.alert(t("errorTitle"), "Failed to create group");
    }
    setCreatingGroup(false);
  };

  /* ── Auth guard ── */
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, marginTop: -8 }} edges={["top"]}>
        <AuthPlaceholder
          title={t("communityTitle")}
          subtitle={t("communitySubtitle")}
          icon="people-outline"
        />
      </SafeAreaView>
    );
  }

  /* ── Top-level tab pills ── */
  const renderTopTabs = () => (
    <View
      style={{
        flexDirection: rowDirectionForAppLayout(isRTL),
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 6,
        gap: 10,
      }}
    >
      {(["feed", "pals", "groups"] as MainTab[]).map((tab) => {
        const active = mainTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => setMainTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
              backgroundColor: active ? colors.text : colors.surface,
              borderWidth: active ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: active ? colors.textInverse : colors.textSecondary,
              }}
            >
              {tab === "feed" ? t("globalFeed") : tab === "pals" ? t("palsTab") : t("groupsTab")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  /* ══════════ Feed Tab Content ══════════ */
  const renderFeedHeader = () => (
    <>
      {renderTopTabs()}

      {/* Channel sub-pills */}
      <View
        style={[
          styles.pillsRow,
          { flexDirection: rowDirectionForAppLayout(isRTL) },
        ]}
      >
        {(["global", "lost_and_found"] as Channel[]).map((ch) => {
          const active = channel === ch;
          return (
            <Pressable
              key={ch}
              onPress={() => switchChannel(ch)}
              style={[
                styles.pill,
                active ? styles.pillActive : styles.pillInactive,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  active ? styles.pillTextActive : styles.pillTextInactive,
                ]}
              >
                {ch === "global" ? t("globalFeed") : t("lostAndFound")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Composer */}
      <View style={styles.card}>
        {composerOpen ? (
          <View>
            <TextInput
              ref={composerInputRef}
              style={[styles.composerInput, rtlInput]}
              placeholder={t("postContent")}
              placeholderTextColor={colors.textMuted}
              multiline
              value={newPostContent}
              onChangeText={setNewPostContent}
              editable={!posting && !uploadingImage}
            />

            {/* Image picker row */}
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                gap: 8,
                marginTop: 10,
              }}
            >
              <Pressable
                disabled={posting || uploadingImage}
                onPress={async () => {
                  const perm = await ImagePicker.requestCameraPermissionsAsync();
                  if (!perm.granted) return;
                  const r = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });
                  if (!r.canceled) setPickedImageUri(r.assets[0].uri);
                }}
                style={styles.pickerIconBtn}
              >
                <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                disabled={posting || uploadingImage}
                onPress={async () => {
                  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (!perm.granted) return;
                  const r = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });
                  if (!r.canceled) setPickedImageUri(r.assets[0].uri);
                }}
                style={styles.pickerIconBtn}
              >
                <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Image thumbnail preview */}
            {pickedImageUri && (
              <View style={{ marginTop: 10 }}>
                <Image
                  source={{ uri: pickedImageUri }}
                  style={styles.composerThumbnail}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => setPickedImageUri(null)}
                  style={styles.thumbnailRemoveBtn}
                >
                  <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.9)" />
                </Pressable>
              </View>
            )}

            <View
              style={[
                styles.composerActions,
                { flexDirection: rowDirectionForAppLayout(isRTL) },
              ]}
            >
              <Pressable
                onPress={() => {
                  setComposerOpen(false);
                  setNewPostContent("");
                  setPickedImageUri(null);
                }}
                style={styles.composerCancel}
              >
                <Text style={styles.composerCancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={handlePublish}
                disabled={(!newPostContent.trim() && !pickedImageUri) || posting || uploadingImage}
                style={[
                  styles.publishBtn,
                  ((!newPostContent.trim() && !pickedImageUri) || posting || uploadingImage) && { opacity: 0.5 },
                ]}
              >
                {posting || uploadingImage ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.publishText}>{t("publishPost")}</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setComposerOpen(true)}
            style={[styles.composerClosed, rtlRow]}
          >
            <View style={styles.composerAvatar}>
              <Ionicons name="person" size={18} color={colors.textInverse} />
            </View>
            <Text style={[styles.composerPlaceholder, rtlText]}>
              {t("postContent")}
            </Text>
          </Pressable>
        )}
      </View>
    </>
  );

  const renderFeedEmpty = () =>
    !loading ? (
      <ListEmptyState
        icon="newspaper-outline"
        title={t("noPostsYet")}
        message={t("noPostsSubtitle")}
      />
    ) : null;

  const renderFeedFooter = () => {
    if (loading && posts.length > 0) {
      return (
        <ActivityIndicator
          size="small"
          color={colors.text}
          style={{ paddingVertical: 20 }}
        />
      );
    }
    if (hasMore && !loading) {
      return (
        <Pressable onPress={loadMore} style={styles.loadMoreBtn}>
          <Text style={styles.loadMoreText}>{t("loadMore")}</Text>
        </Pressable>
      );
    }
    return <View style={{ height: 120 }} />;
  };

  /* ══════════ Groups Tab Content ══════════ */
  const renderGroupsHeader = () => <>{renderTopTabs()}</>;

  const renderGroupCard = ({ item }: { item: CommunityGroupDto }) => (
    <Pressable
      onPress={() => navigation.navigate("GroupDetail", { group: item })}
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
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          gap: 14,
        }}
      >
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            backgroundColor: colors.surfaceSecondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 24 }}>{item.icon || "👥"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              textAlign: isRTL ? "right" : "left",
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.description ? (
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 2,
                textAlign: isRTL ? "right" : "left",
              }}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              gap: 6,
              marginTop: 6,
            }}
          >
            <Ionicons name="chatbubbles-outline" size={14} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>
              {item.postCount} {t("postsCount")}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() =>
            navigation.navigate("GroupDetail", { group: item })
          }
          style={{
            backgroundColor: colors.text,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: colors.textInverse, fontSize: 13, fontWeight: "700" }}>
            {t("joinGroup")}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );

  const renderGroupsEmpty = () =>
    !groupsLoading ? (
      <ListEmptyState
        icon="people-outline"
        title={t("noGroups")}
        message={t("noGroupsSubtitle")}
      />
    ) : null;

  /* ══════════ Render ══════════ */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      <BrandedAppHeader />

      {mainTab === "pals" ? (
        <>
          {renderTopTabs()}
          <PalsScreen />
        </>
      ) : mainTab === "feed" ? (        loading && posts.length === 0 ? (
          <>
            {renderFeedHeader()}
            <ListSkeleton rows={4} variant="card" />
          </>
        ) : (
          <View style={{ flex: 1 }}>
            {renderFeedHeader()}
            <FlashList
              style={{ flex: 1 }}
              data={posts}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={renderFeedEmpty}
              ListFooterComponent={renderFeedFooter}
              contentContainerStyle={{ paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefreshFeed}
                  tintColor={colors.text}
                  colors={[colors.text]}
                />
              }
              renderItem={({ item }) => (
                <PostCard
                  post={item}
                  currentUserId={user?.id ?? null}
                  onToggleLike={handleToggleLike}
                  onDelete={handleDelete}
                  rtlText={rtlText}
                  rtlRow={rtlRow}
                  rtlInput={rtlInput}
                  t={t}
                  isLikePending={!!likeBusy[item.id]}
                  isDeletePending={!!deleteBusy[item.id]}
                />
              )}
            />
          </View>
        )
      ) : groupsLoading && groups.length === 0 ? (
        <View style={{ flex: 1 }}>
          {renderGroupsHeader()}
          <ListSkeleton rows={5} variant="card" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Tabs stay outside FlashList so taps always reach them (header-inside-list caused stuck touches). */}
          {renderGroupsHeader()}
          <FlashList
            style={{ flex: 1 }}
            data={groups}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderGroupsEmpty}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={
              <RefreshControl
                refreshing={groupsRefreshing}
                onRefresh={onRefreshGroups}
                tintColor={colors.text}
                colors={[colors.text]}
              />
            }
            renderItem={renderGroupCard}
          />
        </View>
      )}

      {/* Admin-only: Create Group FAB */}
      {mainTab === "groups" && isAdmin && (        <Pressable
          onPress={() => setCreateModalOpen(true)}
          style={{
            position: "absolute",
            bottom: 100,
            right: isRTL ? undefined : 20,
            left: isRTL ? 20 : undefined,
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.text,
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderRadius: 16,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
          <Text style={{ color: colors.textInverse, fontSize: 14, fontWeight: "700" }}>
            {t("createGroup")}
          </Text>
        </Pressable>
      )}

      {/* Create Group Modal (Admin only) */}
      <Modal
        visible={createModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setCreateModalOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderRadius: 24,
              padding: 24,
              width: "85%",
              maxWidth: 380,
              gap: 16,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.25,
              shadowRadius: 32,
              elevation: 24,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("createGroup")}
            </Text>

            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: 6,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("groupName")} *
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.surfaceTertiary,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: colors.text,
                  textAlign: isRTL ? "right" : "left",
                }}
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder={t("groupName")}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: 6,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("groupDescription")}
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.surfaceTertiary,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: colors.text,
                  minHeight: 70,
                  textAlignVertical: "top",
                  textAlign: isRTL ? "right" : "left",
                }}
                value={newGroupDesc}
                onChangeText={setNewGroupDesc}
                placeholder={t("groupDescription")}
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>

            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: 6,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("groupIcon")}
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.surfaceTertiary,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 24,
                  textAlign: "center",
                  width: 64,
                }}
                value={newGroupIcon}
                onChangeText={(v) => setNewGroupIcon(v.slice(0, 2))}
                placeholder="👥"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 4,
              }}
            >
              <Pressable
                onPress={() => setCreateModalOpen(false)}
                style={{ paddingHorizontal: 18, paddingVertical: 12 }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.textSecondary,
                  }}
                >
                  {t("cancel")}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCreateGroup}
                disabled={!newGroupName.trim() || creatingGroup}
                style={{
                  backgroundColor: colors.text,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: !newGroupName.trim() || creatingGroup ? 0.5 : 1,
                }}
              >
                {creatingGroup ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text
                    style={{ color: colors.textInverse, fontSize: 15, fontWeight: "700" }}
                  >
                    {t("createGroup")}
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    pillsRow: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
      gap: 10,
    },
    pill: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    pillActive: { backgroundColor: colors.text },
    pillInactive: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillText: { fontSize: 14, fontWeight: "600" },
    pillTextActive: { color: colors.textInverse },
    pillTextInactive: { color: colors.textSecondary },
    card: {
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
    },
    cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.text,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: colors.textInverse, fontSize: 14, fontWeight: "700" },
    authorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },
    authorName: { fontSize: 15, fontWeight: "700", color: colors.text },
    providerBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: colors.text,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    providerBadgeText: { color: colors.textInverse, fontSize: 10, fontWeight: "700" },
    sosBadge: {
      backgroundColor: "#dc2626",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    sosBadgeText: { color: colors.textInverse, fontSize: 10, fontWeight: "700" },
    timeText: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    contentText: { fontSize: 15, color: colors.text, lineHeight: 22, marginTop: 12 },
    postImage: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 12,
      marginTop: 12,
      backgroundColor: colors.surfaceSecondary,
    },
    composerThumbnail: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary,
    },
    thumbnailRemoveBtn: {
      position: "absolute",
      top: 8,
      right: 8,
    },
    pickerIconBtn: {
      padding: 6,
    },
    imagePlaceholder: {
      height: 180,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
    },
    actionBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 20,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    actionText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    commentSection: {
      backgroundColor: colors.surfaceTertiary,
      borderRadius: 12,
      marginTop: 12,
      padding: 12,
    },
    commentItem: { flexDirection: "row", gap: 8, marginBottom: 10 },
    commentAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.textMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    commentAvatarText: { color: colors.textInverse, fontSize: 10, fontWeight: "700" },
    commentHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    commentAuthor: { fontSize: 13, fontWeight: "700", color: colors.text },
    commentTime: { fontSize: 11, color: colors.textMuted },
    commentContent: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginTop: 2,
    },
    commentInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    commentInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    commentSendBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.text,
      alignItems: "center",
      justifyContent: "center",
    },
    composerClosed: { flexDirection: "row", alignItems: "center", gap: 12 },
    composerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.text,
      alignItems: "center",
      justifyContent: "center",
    },
    composerPlaceholder: { flex: 1, fontSize: 15, color: colors.textMuted },
    composerInput: {
      fontSize: 15,
      color: colors.text,
      minHeight: 80,
      textAlignVertical: "top",
      lineHeight: 22,
    },
    composerActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 12,
      marginTop: 12,
    },
    composerCancel: { paddingHorizontal: 16, paddingVertical: 10 },
    composerCancelText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    publishBtn: {
      backgroundColor: colors.text,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      minWidth: 90,
      alignItems: "center",
    },
    publishText: { color: colors.textInverse, fontSize: 14, fontWeight: "700" },
    emptyContainer: {
      alignItems: "center",
      paddingTop: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 6,
    },
    loadMoreBtn: {
      alignSelf: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: 28,
      paddingVertical: 12,
      borderRadius: 24,
      marginVertical: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadMoreText: { fontSize: 14, fontWeight: "600", color: colors.text },
    loadingCenter: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });
