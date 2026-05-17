import { useState, useCallback, useRef, useEffect, useMemo, memo, type RefObject } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Modal,
  RefreshControl,
  Image,
  ScrollView,
  FlatList,
  type ListRenderItemInfo,
  KeyboardAvoidingView,
  type KeyboardAvoidingViewProps,
  Share,
  InteractionManager,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { FormFieldLabel } from "../../components/FormFieldLabel";
import { useBottomSafeInset } from "../../hooks/useBottomSafeInset";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import { useAuthStore } from "../../store/authStore";
import { usePetsStore } from "../../store/petsStore";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { CommunitySearchModal } from "./components/CommunitySearchModal";
import { CommunityGroupListCard } from "./components/CommunityGroupListCard";
import { useTheme } from "../../theme/ThemeContext";
import { AuthPlaceholder } from "../../components/AuthPlaceholder";
import { BrandedAppHeader } from "../../components/BrandedAppHeader";
import { DatePickerField } from "../../components/DatePickerField";
import { ListEmptyState, ScreenLoadingCenter } from "../../components/shared";
import { useFocusDefer, useFocusedRef } from "../../hooks/useFocusDefer";
import { TimePickerField } from "../../components/TimePickerField";
import { ImageLightbox } from "../../components/ImageLightbox";
import { MapViewWrapper, MarkerWrapper } from "../../components/MapViewWrapper";
import { CommentsBottomSheet } from "./CommentsBottomSheet";
import {
  postsApi,
  communityApi,
  filesApi,
  playdatesApi,
  palsApi,
  petsApi,
} from "../../api/client";
import type {
  PostDto,
  CreatePostDto,
  CommunityGroupDto,
  CommunityDashboardDto,
  CommunitySearchPostHitDto,
  PlaydateEventDto,
  LiveBeaconDto,
  PetDto,
  RsvpStatusValue,
} from "../../types/api";
import { pickImageWithSource } from "../../utils/imagePicker";
import { formatBreedForDisplay } from "../pets/addPetHelpers";
import { fetchNearbyDogParks, geocodeAddress } from "../../api/googlePlaces";
import { useKeyboardAvoidingState } from "../../hooks/useKeyboardAvoidingState";
import { formatCommunityRelativeTime } from "./utils/formatCommunity";
import {
  CelebrationConfettiBurst,
  type CelebrationConfettiBurstRef,
} from "../../components/CelebrationConfettiBurst";
import { getStyles, useCommunityStyles } from "./communityStyles";
import {
  PAGE_SIZE,
  MARK_FOUND_SOS_CELEBRATION_DELAY_MS,
  HE, EN, type CopyKey,
  type MainTab, type FeedFilter, type PostKind, type Visibility,
  type DogSizeSuitability, type EnergyLevel, type PostMeta, type DogPark,
  POST_TYPES, VISIBILITY_OPTIONS,
  initials, formatDateTime, formatDistanceKm, distanceKm,
  categoryToKind, postKindLabel, visibilityLabel, sizeLabel, energyLabel, ageLabel,
  activityLabel, isActiveSosLostPost, filterMatchesPost,
} from "./communityShared";
import { PlaydatesTab } from "./tabs/PlaydatesTab";
import { ParksTab } from "./tabs/ParksTab";
import { GroupsTab } from "./tabs/GroupsTab";
import { QATab } from "./tabs/QATab";
import { EventsTab } from "./tabs/EventsTab";
import { LostSosTab } from "./tabs/LostSosTab";

const PostCard = memo(function PostCard({
  post,
  meta,
  currentUserId,
  onToggleLike,
  onToggleHelpful,
  onToggleSave,
  onDelete,
  onHide,
  onReport,
  onBlock,
  onPlaydateComing,
  rtlText,
  rtlRow,
  isRTL,
  copy,
  isLikePending,
  isDeletePending,
  onSosResolved,
  celebrateMarkFoundBurst,
}: {
  post: PostDto;
  meta?: PostMeta;
  currentUserId: string | null;
  onToggleLike: (id: string) => void;
  onToggleHelpful: (id: string) => void;
  onToggleSave: (id: string) => void;
  onDelete: (id: string) => void;
  onHide: (id: string) => void;
  onReport: (id: string) => void;
  onBlock: (userId: string) => void;
  onPlaydateComing: (post: PostDto) => void;
  rtlText: object;
  rtlRow: object;
  isRTL: boolean;
  copy: (key: CopyKey) => string;
  isLikePending?: boolean;
  isDeletePending?: boolean;
  onSosResolved?: (postId: string, resolvedAtIso: string) => void;
  celebrateMarkFoundBurst?: () => void;
}) {
  const { colors } = useTheme();
  const { language, t } = useTranslation();
  const styles = useCommunityStyles();
  const markFound = usePetsStore((s) => s.markFound);
  const fetchPets = usePetsStore((s) => s.fetchPets);

  const isMine = currentUserId === post.userId;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sosResolving, setSosResolving] = useState(false);
  const kind = meta?.kind ?? categoryToKind(post.category);
  const showOwnerSosResolve =
    isMine &&
    isActiveSosLostPost(post, kind);

  const handleOwnerMarkFoundFromSos = () => {
    if (sosResolving) return;
    showGlobalAlertCompat(t("sosMarkFoundCloseReport"), `${t("markFound")}?`, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("markFoundBtn"),
        onPress: async () => {
          setSosResolving(true);
          try {
            celebrateMarkFoundBurst?.();
            await new Promise<void>((resolve) =>
              setTimeout(resolve, MARK_FOUND_SOS_CELEBRATION_DELAY_MS),
            );
            await fetchPets().catch(() => {});
            const petId =
              post.relatedPetId ??
              usePetsStore
                .getState()
                .pets.find((p) => p.communityPostId === post.id)?.id ??
              null;
            if (petId) {
              await markFound(petId);
            }
            await postsApi.resolveSos(post.id);
            onSosResolved?.(post.id, new Date().toISOString());
          } catch {
            showGlobalAlertCompat(t("errorTitle"), t("profileSaveError"));
          } finally {
            setSosResolving(false);
          }
        },
      },
    ]);
  };

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
                <Text style={styles.providerBadgeText}>{copy("provider")}</Text>
              </View>
            )}
            <View style={[styles.kindBadge, kind === "Lost & Found" && styles.sosBadge]}>
              <Text style={styles.kindBadgeText}>{postKindLabel(kind, isRTL)}</Text>
            </View>
          </View>
          <Text style={styles.timeText}>
            {formatCommunityRelativeTime(post.createdAt, language)}
            {meta?.location ? ` · ${meta.location}` : ""}
            {meta?.visibility ? ` · ${visibilityLabel(meta.visibility, isRTL)}` : ""}
          </Text>
        </View>
        {isMine ? (
          <Pressable
            disabled={isDeletePending}
            onPress={() =>
              showGlobalAlertCompat(copy("deletePost"), "", [
                { text: copy("cancel"), style: "cancel" },
                {
                  text: copy("delete"),
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
        ) : (
          <Pressable onPress={() => setMenuOpen((v) => !v)} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {menuOpen && (
        <View style={styles.menu}>
          <Pressable onPress={() => { setMenuOpen(false); onHide(post.id); }} style={styles.menuItem}>
            <Ionicons name="eye-off-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.menuText}>{copy("hidePost")}</Text>
          </Pressable>
          <Pressable onPress={() => { setMenuOpen(false); onReport(post.id); }} style={styles.menuItem}>
            <Ionicons name="flag-outline" size={16} color={colors.warning} />
            <Text style={styles.menuText}>{copy("reportPost")}</Text>
          </Pressable>
          <Pressable onPress={() => { setMenuOpen(false); onBlock(post.userId); }} style={styles.menuItem}>
            <Ionicons name="ban-outline" size={16} color={colors.danger} />
            <Text style={styles.menuText}>{copy("blockUser")}</Text>
          </Pressable>
        </View>
      )}

      {!!post.content && (
        <Text style={[styles.contentText, rtlText]}>{post.content}</Text>
      )}

      {meta?.dogName && (
        <View style={[styles.dogMiniCard, rtlRow]}>
          <View style={styles.dogAvatar}>
            <Ionicons name="paw" size={15} color={colors.textInverse} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dogName, rtlText]}>{meta.dogName}</Text>
            <Text style={[styles.dogSubtle, rtlText]}>{copy("localDogProfile")}</Text>
          </View>
          <Pressable
            onPress={() => showGlobalAlertCompat(copy("invite"), copy("inviteOpened"))}
            style={styles.smallOutlineBtn}
          >
            <Text style={styles.smallOutlineText}>{copy("invite")}</Text>
          </Pressable>
        </View>
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

      {showOwnerSosResolve ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("sosMarkFoundCloseReport")}
          onPress={handleOwnerMarkFoundFromSos}
          disabled={sosResolving}
          style={[
            styles.sosMarkFoundWrap,
            styles.sosMarkFoundFullBtn,
            { flexDirection: isRTL ? "row-reverse" : "row" },
            sosResolving ? styles.sosMarkFoundFullBtnDisabled : null,
          ]}
        >
          {sosResolving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={[styles.sosMarkFoundFullBtnText, rtlText]}>
                {t("sosMarkFoundCloseReport")}
              </Text>
            </>
          )}
        </Pressable>
      ) : null}

      {kind === "Playdate" && (
        <View style={[styles.playdateInline, rtlRow]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.inlineTitle, rtlText]}>{copy("communityPlaydate")}</Text>
            <Text style={[styles.inlineSub, rtlText]}>
              {meta?.location ?? copy("parks")} · {Math.max(1, post.likeCount)} {copy("interested")}
            </Text>
          </View>
          <Pressable onPress={() => onPlaydateComing(post)} style={styles.primarySmallBtn}>
            <Text style={styles.primarySmallText}>{copy("coming")}</Text>
          </Pressable>
        </View>
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
          <Text style={styles.actionText}>{copy("like")}</Text>
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
          <Text style={styles.actionText}>{copy("comment")}</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, rtlRow]} onPress={() => onToggleHelpful(post.id)}>
          <Ionicons
            name={post.markedHelpfulByMe ? "bulb" : "bulb-outline"}
            size={18}
            color={post.markedHelpfulByMe ? colors.text : colors.textSecondary}
          />
          <Text style={styles.actionText}>{post.helpfulCount}</Text>
          <Text style={styles.actionText}>{copy("helpful")}</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, rtlRow]} onPress={() => onToggleSave(post.id)}>
          <Ionicons
            name={post.savedByMe ? "bookmark" : "bookmark-outline"}
            size={18}
            color={post.savedByMe ? colors.text : colors.textSecondary}
          />
          <Text style={styles.actionText}>{copy("savePost")}</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, rtlRow]}
          onPress={() =>
            Share.share({
              message: post.content,
            }).catch(() => {})
          }
        >
          <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.actionText}>{copy("share")}</Text>
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
});


function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const styles = useCommunityStyles();
  const { rtlText } = useTranslation();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, rtlText]}>{title}</Text>
        <Text style={[styles.sectionSubtitle, rtlText]}>{subtitle}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.primarySmallBtn}>
          <Text style={styles.primarySmallText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CommunityScreen() {
  const isDeferredReady = useFocusDefer();
  const focusedRef = useFocusedRef();
  const sosMarkFoundConfettiRef = useRef<CelebrationConfettiBurstRef>(null);
  const burstMarkFoundCelebrate = useCallback(() => {
    sosMarkFoundConfettiRef.current?.burst();
  }, []);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hydrated = useAuthStore((s) => s.hydrated);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Admin";
  const { t, rtlText, rtlRow, rtlInput, isRTL } = useTranslation();
  const fetchStorePets = usePetsStore((s) => s.fetchPets);
  const styles = useCommunityStyles();
  const copy = useCallback((key: CopyKey) => (isRTL ? HE[key] : EN[key]), [isRTL]);
  const { behavior: keyboardAvoidBehavior } = useKeyboardAvoidingState();

  const [mainTab, setMainTab] = useState<MainTab>("feed");
  const [isSwappingSector, setIsSwappingSector] = useState(false);

  const [posts, setPosts] = useState<PostDto[]>([]);
  const [postMetaById, setPostMetaById] = useState<Record<string, PostMeta>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostType, setNewPostType] = useState<PostKind>("Cute moment");
  const [newPostLocation, setNewPostLocation] = useState("");
  const [newPostVisibility, setNewPostVisibility] = useState<Visibility>("Public");
  const [newPostTags, setNewPostTags] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FeedFilter>("Nearby");
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(() => new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(() => new Set());

  const [groups, setGroups] = useState<CommunityGroupDto[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");

  const [refreshing, setRefreshing] = useState(false);
  const [groupsRefreshing, setGroupsRefreshing] = useState(false);
  const composerInputRef = useRef<TextInput>(null);
  const likeLockRef = useRef<Set<string>>(new Set());
  const deleteLockRef = useRef<Set<string>>(new Set());
  const locationPermissionAsked = useRef(false);
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});
  const [deleteBusy, setDeleteBusy] = useState<Record<string, boolean>>({});

  const [pets, setPets] = useState<PetDto[]>([]);
  const [playdates, setPlaydates] = useState<PlaydateEventDto[]>([]);
  const [playdatesLoading, setPlaydatesLoading] = useState(false);
  const [playdateModalOpen, setPlaydateModalOpen] = useState(false);
  const [newPlaydateTitle, setNewPlaydateTitle] = useState("");
  const [newPlaydateDate, setNewPlaydateDate] = useState("");
  const [newPlaydateTime, setNewPlaydateTime] = useState("");
  const [newPlaydateLocation, setNewPlaydateLocation] = useState("");
  const [newPlaydateSize, setNewPlaydateSize] = useState<DogSizeSuitability>("All");
  const [newPlaydateAge, setNewPlaydateAge] = useState("All");
  const [newPlaydateEnergy, setNewPlaydateEnergy] = useState<EnergyLevel>("Medium");
  const [newPlaydateMax, setNewPlaydateMax] = useState("8");
  const [newPlaydateDescription, setNewPlaydateDescription] = useState("");
  const [newPlaydateApproval, setNewPlaydateApproval] = useState(false);
  const [creatingPlaydate, setCreatingPlaydate] = useState(false);

  const resetPlaydateForm = useCallback(() => {
    setNewPlaydateTitle("");
    setNewPlaydateDate("");
    setNewPlaydateTime("");
    setNewPlaydateLocation("");
    setNewPlaydateSize("All");
    setNewPlaydateAge("All");
    setNewPlaydateEnergy("Medium");
    setNewPlaydateMax("8");
    setNewPlaydateDescription("");
    setNewPlaydateApproval(false);
  }, []);

  const closePlaydateModal = useCallback(() => {
    resetPlaydateForm();
    setPlaydateModalOpen(false);
  }, [resetPlaydateForm]);

  const openPlaydateModal = useCallback(() => {
    resetPlaydateForm();
    openPlaydateModal();
  }, [resetPlaydateForm]);

  const [beacons, setBeacons] = useState<LiveBeaconDto[]>([]);
  const [beaconsLoading, setBeaconsLoading] = useState(false);
  const [myBeaconId, setMyBeaconId] = useState<string | null>(null);
  const [parks, setParks] = useState<DogPark[]>([]);
  const [parksLoading, setParksLoading] = useState(false);
  const [parksUserLocation, setParksUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [checkingInPark, setCheckingInPark] = useState<DogPark | null>(null);
  const [selectedPark, setSelectedPark] = useState<DogPark | null>(null);
  const [parkCheckins, setParkCheckins] = useState<Record<string, boolean>>({});
  const [dogProfilePet, setDogProfilePet] = useState<PetDto | null>(null);
  const [invitedPetIds, setInvitedPetIds] = useState<Set<string>>(() => new Set());
  const [followedPetIds, setFollowedPetIds] = useState<Set<string>>(() => new Set());
  const [answerPost, setAnswerPost] = useState<PostDto | null>(null);
  const [playdateCommentsOpenFor, setPlaydateCommentsOpenFor] = useState<PlaydateEventDto | null>(null);
  const [playdateCommentText, setPlaydateCommentText] = useState("");
  const [communitySearchOpen, setCommunitySearchOpen] = useState(false);
  const [communitySearchQuery, setCommunitySearchQuery] = useState("");
  const [communityDashboard, setCommunityDashboard] = useState<CommunityDashboardDto | null>(null);
  const [searchRemoteLoading, setSearchRemoteLoading] = useState(false);
  const [searchRemote, setSearchRemote] = useState<{
    posts: CommunitySearchPostHitDto[];
    groups: CommunityGroupDto[];
  } | null>(null);

  useEffect(() => {
    if (!composerOpen) return;
    const id = setTimeout(() => composerInputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [composerOpen]);

  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? pets[0] ?? null;
  const appRowDirection = rowDirectionForAppLayout(isRTL);
  const bottomContentPadding = 16 + insets.bottom;

  const loadDashboard = useCallback(async () => {
    if (!focusedRef.current) return;
    try {
      const data = await communityApi.getDashboard();
      if (!focusedRef.current) return;
      setCommunityDashboard(data);
    } catch {
      if (focusedRef.current) setCommunityDashboard(null);
    }
  }, [focusedRef]);

  useEffect(() => {
    if (!hydrated || !isLoggedIn) return;
    const task = InteractionManager.runAfterInteractions(() => {
      if (focusedRef.current) void loadDashboard();
    });
    return () => {
      task.cancel?.();
    };
  }, [hydrated, isLoggedIn, loadDashboard, focusedRef]);

  const loadFeed = useCallback(
    async (p: number, replace: boolean) => {
      if (!focusedRef.current) return;
      if (replace) setLoading(true);
      else setIsFetchingNextPage(true);
      setFeedError(false);
      try {
        const data = await postsApi.getFeed(p, PAGE_SIZE, { ranked: true });
        if (!focusedRef.current) return;
        setPosts((prev) => (replace ? data : [...prev, ...data]));
        setHasMore(data.length >= PAGE_SIZE);
        setPage(p);
      } catch {
        if (!focusedRef.current) return;
        setFeedError(true);
      } finally {
        if (focusedRef.current) {
          setLoading(false);
          setIsFetchingNextPage(false);
        }
      }
    },
    [focusedRef],
  );

  useFocusEffect(
    useCallback(() => {
      const focusPostId = route.params?.focusPostId as string | undefined;
      if (!focusPostId) return undefined;
      let cancelled = false;
      (async () => {
        try {
          const post = await postsApi.getPost(focusPostId);
          if (cancelled) return;
          setMainTab("lostSos");
          setAnswerPost(post);
        } catch {
          if (!cancelled) setMainTab("lostSos");
        } finally {
          if (!cancelled) {
            navigation.setParams({ focusPostId: undefined });
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [navigation, route.params?.focusPostId]),
  );

  const onRefreshFeed = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFeed(1, true), loadPets(), loadPlaydates(), loadDashboard()]);
    setRefreshing(false);
  }, [loadFeed, loadDashboard]);

  const loadGroups = useCallback(async () => {
    if (!focusedRef.current) return;
    setGroupsLoading(true);
    try {
      const data = await communityApi.getGroups();
      if (!focusedRef.current) return;
      setGroups(data);
    } catch {
      /* error toast from global API interceptor */
    } finally {
      if (focusedRef.current) setGroupsLoading(false);
    }
  }, [focusedRef]);

  const loadPets = useCallback(async () => {
    if (!focusedRef.current) return;
    try {
      const cachedPets = usePetsStore.getState().pets;
      if (cachedPets.length > 0) {
        setPets(cachedPets);
        setSelectedPetId((current) => current ?? cachedPets[0]?.id ?? null);
      }
      await fetchStorePets();
      if (!focusedRef.current) return;
      const currentStorePets = usePetsStore.getState().pets;
      const data = currentStorePets.length > 0 ? currentStorePets : await petsApi.getMyPets();
      if (!focusedRef.current) return;
      setPets(data);
      setSelectedPetId((current) => current ?? data[0]?.id ?? null);
    } catch {}
  }, [fetchStorePets, focusedRef]);

  const loadPlaydates = useCallback(async () => {
    if (!focusedRef.current) return;
    setPlaydatesLoading(true);
    try {
      const data = await playdatesApi.list();
      if (!focusedRef.current) return;
      setPlaydates(data);
    } catch {
      if (!focusedRef.current) return;
      setPlaydates([]);
    } finally {
      if (focusedRef.current) setPlaydatesLoading(false);
    }
  }, [focusedRef]);

  const loadBeacons = useCallback(async () => {
    if (!focusedRef.current) return;
    setBeaconsLoading(true);
    try {
      const data = await palsApi.getActiveBeacons();
      if (!focusedRef.current) return;
      setBeacons(data);
    } catch {
      if (!focusedRef.current) return;
      setBeacons([]);
    } finally {
      if (focusedRef.current) setBeaconsLoading(false);
    }
  }, [focusedRef]);

  const loadDogParks = useCallback(async () => {
    if (!focusedRef.current) return;
    setParksLoading(true);
    try {
      let latitude = 32.0853;
      let longitude = 34.7818;
      try {
        let status: string;
        if (!locationPermissionAsked.current) {
          const result = await Location.requestForegroundPermissionsAsync();
          status = result.status;
          locationPermissionAsked.current = true;
        } else {
          const result = await Location.getForegroundPermissionsAsync();
          status = result.status;
        }
        if (!focusedRef.current) return;
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          if (!focusedRef.current) return;
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } catch {
        // Keep Tel Aviv fallback when location is unavailable.
      }
      if (!focusedRef.current) return;
      setParksUserLocation({ latitude, longitude });
      const nearby = await fetchNearbyDogParks({
        latitude,
        longitude,
        language: isRTL ? "he" : "en",
        radiusMeters: 8000,
      });
      if (!focusedRef.current) return;
      if (nearby.length === 0) {
        setParks([]);
        return;
      }
      const mapped = nearby.slice(0, 12).map<DogPark>((park, index) => {
        const km = distanceKm(latitude, longitude, park.latitude, park.longitude);
        return {
          id: park.placeId || `park-${index}`,
          placeId: park.placeId,
          name: park.name,
          address: park.address,
          latitude: park.latitude,
          longitude: park.longitude,
          distance: formatDistanceKm(km, isRTL ? "he" : "en"),
          rating: park.rating > 0 ? park.rating : 4.2,
          activity: km < 2 ? "High" : km < 4 ? "Medium" : "Low",
          amenities: [copy("parks"), copy("checkIn")],
          activeDogs: Math.max(0, Math.round((park.userRatingsTotal || 4) / 12)),
          upcomingPlaydates: Math.max(0, Math.round((park.userRatingsTotal || 3) / 25)),
          recentPosts: Math.max(1, Math.round((park.userRatingsTotal || 8) / 10)),
          peakHours: "17:00-20:00",
        };
      });
      setParks(mapped);
    } catch {
      if (!focusedRef.current) return;
      setParks([]);
    } finally {
      if (focusedRef.current) setParksLoading(false);
    }
  }, [copy, isRTL, focusedRef]);

  const onRefreshGroups = useCallback(async () => {
    setGroupsRefreshing(true);
    try {
      const data = await communityApi.getGroups();
      if (!focusedRef.current) return;
      setGroups(data);
    } catch {
      /* error toast from global API interceptor */
    } finally {
      if (focusedRef.current) setGroupsRefreshing(false);
    }
  }, [focusedRef]);

  const mainTabRef = useRef(mainTab);
  mainTabRef.current = mainTab;

  useFocusEffect(
    useCallback(() => {
      if (!hydrated || !isLoggedIn) return undefined;
      const task = InteractionManager.runAfterInteractions(() => {
        if (!focusedRef.current) return;
        loadPets();
        void loadDashboard();
        const tab = mainTabRef.current;
        if (tab === "feed" || tab === "qa" || tab === "lostSos") void loadFeed(1, true);
        if (tab === "groups") void loadGroups();
        if (tab === "playdates" || tab === "events") void loadPlaydates();
        if (tab === "parks") {
          void loadBeacons();
          void loadDogParks();
        }
      });
      return () => {
        task.cancel?.();
      };
    }, [
      hydrated,
      isLoggedIn,
      focusedRef,
      loadFeed,
      loadDashboard,
      loadGroups,
      loadPets,
      loadPlaydates,
      loadBeacons,
      loadDogParks,
    ]),
  );

  useEffect(() => {
    const q = communitySearchQuery.trim();
    if (!communitySearchOpen || q.length < 2) {
      setSearchRemote(null);
      setSearchRemoteLoading(false);
      return;
    }
    let active = true;
    const handle = setTimeout(() => {
      void (async () => {
        setSearchRemoteLoading(true);
        try {
          const data = await communityApi.search(q);
          if (active) setSearchRemote(data);
        } catch {
          if (active) setSearchRemote(null);
        } finally {
          if (active) setSearchRemoteLoading(false);
        }
      })();
    }, 380);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [communitySearchQuery, communitySearchOpen]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (hiddenPostIds.has(post.id) || blockedUserIds.has(post.userId)) return false;
      const meta = postMetaById[post.id];
      if (!filterMatchesPost(activeFilter, post, meta)) return false;
      if (!q) return true;
      return `${post.userName} ${post.content} ${meta?.location ?? ""} ${meta?.dogName ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [posts, hiddenPostIds, blockedUserIds, postMetaById, activeFilter, search]);

  const questionPosts = useMemo(
    () =>
      posts.filter((post) => {
        const meta = postMetaById[post.id];
        return filterMatchesPost("Questions", post, meta) || /\?$/.test(post.content.trim());
      }),
    [posts, postMetaById],
  );

  const searchPostsForModal = useMemo(() => {
    const fromHits = (searchRemote?.posts ?? []).map<PostDto>((h) => ({
      id: h.id,
      userId: "",
      userName: h.name,
      content: h.content,
      likeCount: 0,
      commentCount: 0,
      helpfulCount: 0,
      likedByMe: false,
      markedHelpfulByMe: false,
      savedByMe: false,
      createdAt: h.createdAt,
      authorRole: "Owner",
      authorIsApprovedProvider: false,
    }));
    const seen = new Set<string>();
    const out: PostDto[] = [];
    for (const p of fromHits) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    for (const p of posts) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [searchRemote, posts]);

  const searchGroupsForModal = useMemo(() => {
    const remote = searchRemote?.groups ?? [];
    const seen = new Set(remote.map((g) => g.id));
    return [...remote, ...groups.filter((g) => !seen.has(g.id))];
  }, [searchRemote, groups]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => `${g.name} ${g.description ?? ""}`.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const sosFeedPosts = useMemo(
    () =>
      posts.filter((p) => {
        const c = (p.category ?? "").toLowerCase();
        return c.includes("sos") || c.includes("lost");
      }),
    [posts],
  );

  const activeDogsNearbyCount = useMemo(
    () => beacons.reduce((n, b) => n + Math.max(1, b.pets?.length ?? 0), 0),
    [beacons],
  );

  const activeParksNearbyCount = useMemo(
    () =>
      parks.filter(
        (p) =>
          (p.upcomingPlaydates ?? 0) > 0 ||
          p.activity === "High" ||
          !!parkCheckins[p.id],
      ).length,
    [parks, parkCheckins],
  );

  const upcomingMeetupsPreview = useMemo(() => {
    return [...playdates]
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
      .slice(0, 5);
  }, [playdates]);

  const dashboardActiveDogs = communityDashboard?.activeDogsNearby ?? activeDogsNearbyCount;
  const dashboardOpenQuestions = communityDashboard?.openQuestions ?? questionPosts.length;
  const dashboardActiveParks = communityDashboard?.activeDogParks ?? activeParksNearbyCount;
  const dashboardSos = communityDashboard?.sosAlerts ?? sosFeedPosts.length;

  const upcomingEventsCount = useMemo(
    () => playdates.filter((e) => new Date(e.scheduledFor).getTime() > Date.now()).length,
    [playdates],
  );

  const handlePublish = async () => {
    const content = newPostContent.trim();
    if ((!content && !pickedImageUri) || posting) {
      showGlobalAlertCompat(copy("postNeedsContent"), copy("postNeedsContentDesc"));
      return;
    }
    if (newPostType === "Lost & Found" && !newPostLocation.trim()) {
      showGlobalAlertCompat(copy("locationRecommended"), copy("locationRecommendedDesc"));
    }
    if (newPostType === "Playdate") {
      showGlobalAlertCompat(copy("tip"), copy("playdateTip"));
    }
    setPosting(true);
    try {
      let imageUrl: string | undefined;
      if (pickedImageUri) {
        setUploadingImage(true);
        const up = await filesApi.uploadImage(pickedImageUri, "posts");
        imageUrl = up.url;
        setUploadingImage(false);
      }
      const category =
        newPostType === "Lost & Found"
          ? "lost_and_found"
          : newPostType === "Question"
            ? "question"
            : newPostType === "Recommendation"
              ? "recommendation"
              : newPostType === "Playdate"
                ? "playdate"
                : newPostType === "Event"
                  ? "event"
                  : undefined;

      let latitude: number | undefined;
      let longitude: number | undefined;
      if (category === "lost_and_found" && newPostLocation.trim()) {
        const geo = await geocodeAddress({
          query: newPostLocation.trim(),
          language: isRTL ? "he" : "en",
        });
        if (geo) {
          latitude = geo.latitude;
          longitude = geo.longitude;
        }
      }

      const tagsCsv =
        newPostTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .join(",") || undefined;

      const payload: CreatePostDto = {
        content: content.trim() || (pickedImageUri ? " " : ""),
        imageUrl,
        latitude,
        longitude,
        city: newPostLocation.trim() || undefined,
        category,
        relatedPetId: selectedPet?.id,
        tagsCsv,
      };
      if (category === "lost_and_found") {
        payload.sosNotifyRadiusKm = 5;
        payload.dogName = selectedPet?.name;
      }

      const post = await postsApi.create(payload);
      setPosts((prev) => [post, ...prev]);
      setPostMetaById((prev) => ({
        ...prev,
        [post.id]: {
          kind: newPostType,
          location: newPostLocation.trim() || undefined,
          dogName: selectedPet?.name,
          visibility: newPostVisibility,
          tags: newPostTags.split(",").map((tag) => tag.trim()).filter(Boolean),
        },
      }));
      setNewPostContent("");
      setPickedImageUri(null);
      setNewPostLocation("");
      setNewPostTags("");
      setComposerOpen(false);
      showGlobalAlertCompat(copy("posted"), copy("postedDesc"));
    } catch {
      const id = `local-post-${Date.now()}`;
      const localPost: PostDto = {
        id,
        userId: user?.id ?? "local-user",
        userName: user?.name ?? (isRTL ? "אני" : "You"),
        content,
        imageUrl: pickedImageUri ?? undefined,
        likeCount: 0,
        commentCount: 0,
        helpfulCount: 0,
        markedHelpfulByMe: false,
        savedByMe: false,
        likedByMe: false,
        createdAt: new Date().toISOString(),
        authorRole: user?.role ?? "Owner",
        authorIsApprovedProvider: false,
        category: newPostType,
      };
      setPosts((prev) => [localPost, ...prev]);
      setPostMetaById((prev) => ({
        ...prev,
        [id]: {
          kind: newPostType,
          location: newPostLocation.trim() || undefined,
          dogName: selectedPet?.name,
          visibility: newPostVisibility,
          tags: newPostTags.split(",").map((tag) => tag.trim()).filter(Boolean),
          isDemo: true,
        },
      }));
      setNewPostContent("");
      setPickedImageUri(null);
      setComposerOpen(false);
      showGlobalAlertCompat(copy("savedLocal"), copy("savedLocalPost"));
    } finally {
      setUploadingImage(false);
      setPosting(false);
    }
  };

  const handlePickPostImage = async () => {
    if (posting || uploadingImage) return;
    const uri = await pickImageWithSource({
      labels: {
        camera: t("takePhoto"),
        gallery: t("chooseFromLibrary"),
        cancel: t("cancel"),
      },
      pickerOptions: {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      },
      permissionDeniedAlert: {
        title: t("errorTitle"),
        message: t("triagePhotoPermissionDenied"),
      },
    });
    if (!uri) return;
    setPickedImageUri(uri);
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
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                likedByMe: !p.likedByMe,
                likeCount: Math.max(0, p.likeCount + (p.likedByMe ? -1 : 1)),
              }
            : p,
        ),
      );
    } finally {
      likeLockRef.current.delete(id);
      setLikeBusy((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    }
  }, []);

  const handleToggleHelpful = useCallback(async (id: string) => {
    const demo = id.startsWith("demo-") || id.startsWith("local-");
    if (demo) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                markedHelpfulByMe: !p.markedHelpfulByMe,
                helpfulCount: Math.max(0, p.helpfulCount + (p.markedHelpfulByMe ? -1 : 1)),
              }
            : p,
        ),
      );
      return;
    }
    try {
      const r = await postsApi.toggleHelpful(id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, markedHelpfulByMe: r.marked, helpfulCount: r.helpfulCount } : p,
        ),
      );
    } catch {
      /* error toast from global API interceptor */
    }
  }, []);

  const handleToggleSave = useCallback(async (id: string) => {
    const demo = id.startsWith("demo-") || id.startsWith("local-");
    if (demo) {
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, savedByMe: !p.savedByMe } : p)));
      return;
    }
    try {
      const r = await postsApi.toggleSave(id);
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, savedByMe: r.saved } : p)));
    } catch {
      /* error toast from global API interceptor */
    }
  }, []);

  const handleReportPost = useCallback(
    async (id: string) => {
      if (!id.startsWith("demo-") && !id.startsWith("local-")) {
        try {
          await postsApi.reportPost(id);
        } catch {
          /* error toast from global API interceptor */
        }
      }
      showGlobalAlertCompat(copy("reportReceived"), copy("reportReceivedDesc"));
    },
    [copy],
  );

  const handleDelete = useCallback(async (id: string) => {
    if (deleteLockRef.current.has(id)) return;
    deleteLockRef.current.add(id);
    setDeleteBusy((p) => ({ ...p, [id]: true }));
    try {
      await postsApi.deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* error toast from global API interceptor */
    } finally {
      deleteLockRef.current.delete(id);
      setDeleteBusy((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    }
  }, []);

  const handleHidePost = useCallback(
    (id: string) => {
      setHiddenPostIds((prev) => new Set(prev).add(id));
      showGlobalAlertCompat(copy("postHidden"), copy("postHiddenDesc"));
    },
    [copy],
  );

  const handleBlockUser = useCallback(
    (userId: string) => {
      setBlockedUserIds((prev) => new Set(prev).add(userId));
      showGlobalAlertCompat(copy("userBlocked"), copy("userBlockedDesc"));
    },
    [copy],
  );

  const handlePlaydateComing = useCallback(
    (post: PostDto) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, likeCount: p.likeCount + 1, likedByMe: true } : p,
        ),
      );
      showGlobalAlertCompat(copy("youAreComing"), copy("youAreComingDesc"));
    },
    [copy],
  );

  const handleSosResolved = useCallback((postId: string, resolvedAtIso: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, sosResolvedAt: resolvedAtIso } : p,
      ),
    );
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && !isFetchingNextPage && hasMore) loadFeed(page + 1, false);
  }, [loading, isFetchingNextPage, hasMore, loadFeed, page]);

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
      showGlobalAlertCompat("", t("groupCreated"));
    } catch {
      showGlobalAlertCompat(t("errorTitle"), t("postError"));
    }
    setCreatingGroup(false);
  };

  const handleCreatePlaydate = async () => {
    const title = newPlaydateTitle.trim();
    const location = newPlaydateLocation.trim();
    if (!title || !newPlaydateDate.trim() || !newPlaydateTime.trim() || !location) {
      showGlobalAlertCompat(copy("missingDetails"), copy("missingDetailsDesc"));
      return;
    }
    const scheduledFor = new Date(`${newPlaydateDate.trim()}T${newPlaydateTime.trim()}:00`);
    if (Number.isNaN(scheduledFor.getTime())) {
      showGlobalAlertCompat(copy("invalidDate"), copy("invalidDateDesc"));
      return;
    }
    if (scheduledFor.getTime() <= Date.now()) {
      showGlobalAlertCompat(copy("futureTime"), copy("futureTimeDesc"));
      return;
    }
    setCreatingPlaydate(true);
    try {
      const geocoded = await geocodeAddress({
        query: location,
        language: isRTL ? "he" : "en",
      });
      const latitude = geocoded?.latitude ?? 32.0853;
      const longitude = geocoded?.longitude ?? 34.7818;
      const city = geocoded?.components.city ?? (isRTL ? "תל אביב" : "Tel Aviv");
      const created = await playdatesApi.create({
        title,
        description:
          [
            newPlaydateDescription.trim(),
            `${copy("sizeFit")}: ${sizeLabel(newPlaydateSize, isRTL)}`,
            `${copy("ageFit")}: ${ageLabel(newPlaydateAge, isRTL)}`,
            `${copy("energyLevel")}: ${energyLabel(newPlaydateEnergy, isRTL)}`,
            newPlaydateApproval ? copy("requiresApproval") : copy("nearby"),
          ]
            .filter(Boolean)
            .join("\n"),
        locationName: location,
        latitude,
        longitude,
        city,
        scheduledFor: scheduledFor.toISOString(),
        allowedSpecies: ["DOG"],
        maxPets: Number.parseInt(newPlaydateMax, 10) || undefined,
      });
      setPlaydates((prev) => [created, ...prev]);
      closePlaydateModal();
      showGlobalAlertCompat(copy("playdateCreated"), copy("playdateCreatedDesc"));
    } catch {
      const local: PlaydateEventDto = {
        id: `local-playdate-${Date.now()}`,
        hostUserId: user?.id ?? "local-user",
        hostUserName: user?.name ?? (isRTL ? "אני" : "You"),
        title,
        description: newPlaydateDescription.trim() || null,
        locationName: location,
        latitude: 32.0853,
        longitude: 34.7818,
        city: isRTL ? "תל אביב" : "Tel Aviv",
        scheduledFor: scheduledFor.toISOString(),
        endsAt: null,
        allowedSpecies: ["DOG"],
        maxPets: Number.parseInt(newPlaydateMax, 10) || null,
        goingCount: 1,
        maybeCount: 0,
        myRsvpStatus: "Going",
        myRsvpPetId: selectedPet?.id ?? null,
        distanceKm: null,
        isCancelled: false,
      };
      setPlaydates((prev) => [local, ...prev]);
      closePlaydateModal();
      showGlobalAlertCompat(copy("savedLocal"), copy("playdateSavedLocal"));
    } finally {
      setCreatingPlaydate(false);
    }
  };

  const handleRsvp = async (event: PlaydateEventDto, status: RsvpStatusValue) => {
    const previous = event.myRsvpStatus;
    setPlaydates((prev) =>
      prev.map((p) =>
        p.id === event.id
          ? {
              ...p,
              myRsvpStatus: status,
              goingCount:
                status === "Going" && previous !== "Going"
                  ? p.goingCount + 1
                  : status !== "Going" && previous === "Going"
                    ? Math.max(0, p.goingCount - 1)
                    : p.goingCount,
              maybeCount:
                status === "Maybe" && previous !== "Maybe"
                  ? p.maybeCount + 1
                  : status !== "Maybe" && previous === "Maybe"
                    ? Math.max(0, p.maybeCount - 1)
                    : p.maybeCount,
            }
          : p,
      ),
    );
    try {
      await playdatesApi.rsvp(event.id, { status, petId: selectedPet?.id });
      showGlobalAlertCompat(copy("eventUpdated"), status === "Going" ? copy("going") : status === "Maybe" ? copy("maybe") : copy("notGoing"));
    } catch {
      showGlobalAlertCompat(copy("savedLocal"), copy("eventUpdatedDesc"));
    }
  };

  const handleParkCheckIn = async (park: DogPark) => {
    setCheckingInPark(park);
    try {
      let communityOk = false;
      try {
        await communityApi.startParkCheckIn({
          placeId: park.placeId ?? park.id,
          placeName: park.name,
          latitude: park.latitude,
          longitude: park.longitude,
          petId: selectedPet?.id,
          durationMinutes: 75,
        });
        communityOk = true;
      } catch {
        /* server park check-in failed — still try live beacon */
      }

      let beacon: LiveBeaconDto | null = null;
      try {
        beacon = await palsApi.startBeacon({
          placeName: park.name,
          latitude: park.latitude,
          longitude: park.longitude,
          city: isRTL ? "תל אביב" : "Tel Aviv",
          durationMinutes: 60,
          petIds: selectedPet ? [selectedPet.id] : pets.map((p) => p.id),
          species: "DOG",
        });
      } catch {
        /* e.g. network — community check-in may still have succeeded */
      }

      setParkCheckins((prev) => ({ ...prev, [park.id]: true }));

      if (beacon) {
        setMyBeaconId(beacon.id);
        setBeacons((prev) => [beacon, ...prev]);
        showGlobalAlertCompat(copy("checkedIn"), copy("checkedInDesc"));
      } else if (communityOk) {
        setMyBeaconId(`park:${park.id}`);
        showGlobalAlertCompat(copy("checkedIn"), copy("checkedInDesc"));
      } else {
        setMyBeaconId(`local-beacon-${park.id}`);
        showGlobalAlertCompat(copy("checkedInLocal"), copy("checkedInLocalDesc"));
      }
    } finally {
      setCheckingInPark(null);
    }
  };

  const handleRemoveBeacon = async () => {
    if (!myBeaconId) return;
    const id = myBeaconId;
    setMyBeaconId(null);
    setParkCheckins({});
    try {
      const isPalsBeaconGuid =
        !id.startsWith("local-") &&
        !id.startsWith("park:") &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isPalsBeaconGuid) await palsApi.endBeacon(id);
      try {
        await communityApi.endParkCheckIn();
      } catch {
        /* ignore */
      }
      await loadBeacons();
    } catch {
      showGlobalAlertCompat(copy("checkInRemoved"), "");
    }
  };

  const handleJoinGroup = useCallback(
    async (item: CommunityGroupDto) => {
      const previousJoined = item.joinedByMe ?? false;
      const previousCount = item.memberCount ?? 0;
      const nextJoined = !previousJoined;
      setGroups((prev) =>
        prev.map((g) =>
          g.id === item.id
            ? {
                ...g,
                joinedByMe: nextJoined,
                memberCount: nextJoined ? previousCount + 1 : Math.max(0, previousCount - 1),
              }
            : g,
        ),
      );
      try {
        const res = nextJoined
          ? await communityApi.joinGroup(item.id)
          : await communityApi.leaveGroup(item.id);
        setGroups((prev) =>
          prev.map((g) =>
            g.id === item.id ? { ...g, joinedByMe: res.joined, memberCount: res.memberCount } : g,
          ),
        );
        showGlobalAlertCompat(copy("groupUpdated"), copy("groupUpdatedDesc"));
      } catch {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === item.id
              ? { ...g, joinedByMe: previousJoined, memberCount: previousCount }
              : g,
          ),
        );
        showGlobalAlertCompat(copy("savedLocal"), copy("groupUpdatedDesc"));
      }
    },
    [copy],
  );

  /** Navigate first — no awaits or heavy work before `navigate` (keeps taps responsive). */
  const openGroupDetail = useCallback(
    (group: CommunityGroupDto) => {
      navigation.navigate("GroupDetail", { group });
    },
    [navigation],
  );

  const renderGroupCard = useCallback(
    ({ item }: ListRenderItemInfo<CommunityGroupDto>) => (
      <CommunityGroupListCard
        item={item}
        isRTL={isRTL}
        postsCountSuffix={t("postsCount")}
        joinedLabel={copy("joined")}
        joinLabel={copy("joinGroup")}
        onOpenDetail={openGroupDetail}
        onToggleJoin={handleJoinGroup}
      />
    ),
    [isRTL, t, copy, openGroupDetail, handleJoinGroup],
  );

  const handleJoinEvent = async (event: PlaydateEventDto) => {
    const previous = event.myRsvpStatus;
    const nextStatus: RsvpStatusValue = previous === "Going" ? "NotGoing" : "Going";
    setPlaydates((prev) =>
      prev.map((p) =>
        p.id === event.id
          ? {
              ...p,
              myRsvpStatus: nextStatus,
              goingCount:
                nextStatus === "Going" && previous !== "Going"
                  ? p.goingCount + 1
                  : nextStatus !== "Going" && previous === "Going"
                    ? Math.max(0, p.goingCount - 1)
                    : p.goingCount,
            }
          : p,
      ),
    );
    try {
      await playdatesApi.rsvp(event.id, { status: nextStatus, petId: selectedPet?.id });
      showGlobalAlertCompat(copy("eventUpdated"), copy("eventUpdatedDesc"));
    } catch {
      setPlaydates((prev) =>
        prev.map((p) =>
          p.id === event.id
            ? {
                ...p,
                myRsvpStatus: previous,
                goingCount:
                  nextStatus === "Going" && previous !== "Going"
                    ? Math.max(0, p.goingCount - 1)
                    : nextStatus !== "Going" && previous === "Going"
                      ? p.goingCount + 1
                      : p.goingCount,
              }
            : p,
        ),
      );
      showGlobalAlertCompat(copy("savedLocal"), copy("eventUpdatedDesc"));
    }
  };

  const handleInvitePet = (pet: PetDto) => {
    setInvitedPetIds((prev) => new Set(prev).add(pet.id));
    showGlobalAlertCompat(copy("invite"), copy("inviteOpened"));
  };

  const handleFollowPet = (pet: PetDto) => {
    setFollowedPetIds((prev) => {
      const next = new Set(prev);
      if (next.has(pet.id)) next.delete(pet.id);
      else next.add(pet.id);
      return next;
    });
    showGlobalAlertCompat(copy("following"), copy("followingDesc"));
  };

  const renderFeedItem = useCallback(
    ({ item }: ListRenderItemInfo<PostDto>) => (
      <PostCard
        post={item}
        meta={postMetaById[item.id]}
        currentUserId={user?.id ?? null}
        onToggleLike={handleToggleLike}
        onToggleHelpful={handleToggleHelpful}
        onToggleSave={handleToggleSave}
        onDelete={handleDelete}
        onHide={handleHidePost}
        onReport={handleReportPost}
        onBlock={handleBlockUser}
        onPlaydateComing={handlePlaydateComing}
        onSosResolved={handleSosResolved}
        celebrateMarkFoundBurst={burstMarkFoundCelebrate}
        rtlText={rtlText}
        rtlRow={rtlRow}
        isRTL={isRTL}
        copy={copy}
        isLikePending={!!likeBusy[item.id]}
        isDeletePending={!!deleteBusy[item.id]}
      />
    ),
    [
      postMetaById,
      user,
      handleToggleLike,
      handleToggleHelpful,
      handleToggleSave,
      handleDelete,
      handleHidePost,
      handleReportPost,
      handleBlockUser,
      handlePlaydateComing,
      handleSosResolved,
      burstMarkFoundCelebrate,
      rtlText,
      rtlRow,
      isRTL,
      copy,
      likeBusy,
      deleteBusy,
    ],
  );

  const renderTopTabs = () => {
    const meetupCount =
      upcomingMeetupsPreview.length > 0
        ? upcomingMeetupsPreview.length
        : communityDashboard?.upcomingMeetups ?? 0;

    const tabBadge = (tab: MainTab): { value: number; alert?: boolean } | null => {
      switch (tab) {
        case "feed":
          return dashboardActiveDogs > 0 ? { value: dashboardActiveDogs } : null;
        case "playdates":
          return meetupCount > 0 ? { value: meetupCount } : null;
        case "parks":
          return dashboardActiveParks > 0 ? { value: dashboardActiveParks } : null;
        case "groups":
          return groups.length > 0 ? { value: groups.length } : null;
        case "qa":
          return dashboardOpenQuestions > 0 ? { value: dashboardOpenQuestions } : null;
        case "events":
          return upcomingEventsCount > 0 ? { value: upcomingEventsCount } : null;
        case "lostSos":
          return dashboardSos > 0 ? { value: dashboardSos, alert: true } : null;
        default:
          return null;
      }
    };

    const formatBadge = (n: number) => (n > 99 ? "99+" : String(n));

    return (
      <View style={{ flexGrow: 0, flexShrink: 0 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 6 }}>
          <Pressable
            onPress={() => setCommunitySearchOpen(true)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t("cm_search_title")}
            style={{
              width: "100%",
              flexDirection: appRowDirection,
              alignItems: "center",
              gap: 10,
              backgroundColor: colors.surfaceSecondary,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.borderLight,
            }}
          >
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <Text
              style={[{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: "600", color: colors.textMuted }, rtlText]}
              numberOfLines={1}
            >
              {t("cm_search_placeholder")}
            </Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.categoryTabsScroll, { flexGrow: 0, flexShrink: 0 }]}
          contentContainerStyle={[
            styles.topTabsContent,
            { flexDirection: appRowDirection },
          ]}
        >
          {(["feed", "playdates", "parks", "groups", "qa", "events", "lostSos"] as MainTab[]).map((tab) => {
            const active = mainTab === tab;
            const label =
              tab === "feed"
                ? t("cm_tab_feed")
                : tab === "playdates"
                  ? t("cm_tab_meetups")
                  : tab === "parks"
                    ? t("cm_tab_parks")
                    : tab === "groups"
                      ? t("cm_tab_groups")
                      : tab === "qa"
                        ? t("cm_tab_qa")
                        : tab === "events"
                          ? t("cm_tab_events")
                          : t("cm_tab_lost_sos");
            const icon =
              tab === "feed"
                ? "newspaper-outline"
                : tab === "playdates"
                  ? "calendar-outline"
                  : tab === "parks"
                    ? "location-outline"
                    : tab === "groups"
                      ? "people-outline"
                      : tab === "qa"
                        ? "help-circle-outline"
                        : tab === "events"
                          ? "sparkles-outline"
                          : "warning-outline";
            const badge = tabBadge(tab);
            return (
              <Pressable
                key={tab}
                onPress={() => {
                  const switching = tab !== mainTabRef.current;
                  setMainTab(tab);
                  if (switching) setIsSwappingSector(true);
                  InteractionManager.runAfterInteractions(() => {
                    if (switching) setIsSwappingSector(false);
                    if (!focusedRef.current) return;
                    if (tab === "groups" && groups.length === 0) void loadGroups();
                    if (tab === "playdates" || tab === "events") void loadPlaydates();
                    if (tab === "parks") {
                      void loadBeacons();
                      void loadDogParks();
                    }
                    if (tab === "feed" || tab === "qa" || tab === "lostSos") {
                      if (posts.length === 0) void loadFeed(1, true);
                    }
                  });
                }}
                style={styles.topTab}
              >
                <View style={styles.topTabCircleWrap}>
                  <View style={[styles.topTabCircle, active ? styles.topTabCircleActive : styles.topTabCircleInactive]}>
                    <Ionicons
                      name={icon as any}
                      size={28}
                      color={active ? colors.textInverse : colors.text}
                    />
                  </View>
                  {badge ? (
                    <View
                      style={[
                        styles.topTabBadge,
                        isRTL ? { left: -2 } : { right: -2 },
                        {
                          borderColor: active ? "rgba(255,255,255,0.92)" : colors.surface,
                          minWidth: badge.value > 99 ? 26 : 18,
                        },
                        badge.alert ? styles.topTabBadgeAlert : { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.topTabBadgeText, { color: colors.textInverse }]} numberOfLines={1}>
                        {formatBadge(badge.value)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.topTabText, active ? styles.topTabTextActive : undefined]} numberOfLines={2}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  /** Stable per-post renderer for the LostSos tab (passed as render prop to avoid circular deps). */
  const renderLostSosSingleCard = useCallback(
    (post: PostDto) => (
      <PostCard
        key={post.id}
        post={post}
        meta={postMetaById[post.id]}
        currentUserId={user?.id ?? null}
        onToggleLike={handleToggleLike}
        onToggleHelpful={handleToggleHelpful}
        onToggleSave={handleToggleSave}
        onDelete={handleDelete}
        onHide={handleHidePost}
        onReport={handleReportPost}
        onBlock={handleBlockUser}
        onPlaydateComing={handlePlaydateComing}
        onSosResolved={handleSosResolved}
        celebrateMarkFoundBurst={burstMarkFoundCelebrate}
        rtlText={rtlText}
        rtlRow={rtlRow}
        isRTL={isRTL}
        copy={copy}
        isLikePending={!!likeBusy[post.id]}
        isDeletePending={!!deleteBusy[post.id]}
      />
    ),
    [
      postMetaById, user, handleToggleLike, handleToggleHelpful, handleToggleSave,
      handleDelete, handleHidePost, handleReportPost, handleBlockUser, handlePlaydateComing,
      handleSosResolved, burstMarkFoundCelebrate, rtlText, rtlRow, isRTL, copy, likeBusy, deleteBusy,
    ],
  );

  const topTabsElement = useMemo(
    () => renderTopTabs(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      mainTab,
      dashboardActiveDogs,
      dashboardActiveParks,
      dashboardOpenQuestions,
      dashboardSos,
      upcomingMeetupsPreview.length,
      upcomingEventsCount,
      groups.length,
      t,
      isRTL,
      appRowDirection,
      colors,
      styles,
      posts.length,
    ],
  );

  /** Stable memoized FlatList header element — only recomputed when its data changes. */
  const feedHeaderElement = useMemo(
    () => (
      <>
        <View style={[styles.searchCard, { flexDirection: appRowDirection }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, rtlInput]}
            value={search}
            onChangeText={setSearch}
            placeholder={copy("search")}
            placeholderTextColor={colors.textMuted}
          />
        </View>
        {feedError && (
          <View style={styles.demoBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.primary} />
            <Text style={[styles.demoBannerText, rtlText]}>
              {copy("apiFallback")}
            </Text>
          </View>
        )}
        <View style={styles.card}>
          <View style={[styles.quickActions, rtlRow]}>
            <Pressable onPress={() => setComposerOpen(true)} style={[styles.quickActionPrimary, rtlRow]}>
              <Ionicons name="create-outline" size={18} color={colors.textInverse} />
              <Text style={styles.quickActionPrimaryText}>{copy("createPost")}</Text>
            </Pressable>
            <Pressable onPress={() => openPlaydateModal()} style={[styles.quickActionSecondary, rtlRow]}>
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
              <Text style={styles.quickActionSecondaryText}>{copy("createPlaydate")}</Text>
            </Pressable>
          </View>
        </View>
        {pets.length > 0 && (
          <View style={styles.card}>
            <Text style={[styles.sectionCardTitle, rtlText]}>{copy("myDogs")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.dogProfileRail, { flexDirection: appRowDirection }]}
            >
              {pets.map((pet) => (
                <Pressable key={pet.id} onPress={() => setDogProfilePet(pet)} style={styles.dogProfileCard}>
                  <View style={styles.dogProfileAvatar}>
                    {pet.imageUrl ? (
                      <Image source={{ uri: pet.imageUrl }} style={StyleSheet.absoluteFill} />
                    ) : (
                      <Ionicons name="paw" size={22} color={colors.textInverse} />
                    )}
                  </View>
                  <Text style={[styles.dogProfileName, rtlText]} numberOfLines={2}>{pet.name}</Text>
                  <Text style={[styles.dogProfileSub, rtlText]} numberOfLines={2}>
                    {pet.breed ? formatBreedForDisplay(pet.breed, t) : copy("dog")} · {pet.age}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        {pets.length === 0 && (
          <View style={styles.card}>
            <Text style={[styles.sectionCardTitle, rtlText]}>{copy("myDogs")}</Text>
            <Text style={[styles.emptyInline, rtlText]}>{copy("noPets")}</Text>
          </View>
        )}
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, feedError, appRowDirection, styles, colors, rtlText, rtlRow, rtlInput, copy, pets, t],
  );

  /** Stable FlatList footer renderer — only recomputed when pagination state changes. */
  const renderFeedFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <ActivityIndicator
          size="small"
          color={colors.text}
          style={{ paddingVertical: 20 }}
        />
      );
    }
    return <View style={{ height: bottomContentPadding }} />;
  }, [isFetchingNextPage, colors.text, bottomContentPadding]);

  if (!hydrated || !isDeferredReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
        <BrandedAppHeader style={{ paddingVertical: 6 }} />
        <ScreenLoadingCenter title={`${t("communityTitle")}…`} />
      </SafeAreaView>
    );
  }

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

  const renderFeedEmpty = () =>
    !loading ? (
      <ListEmptyState
        icon="newspaper-outline"
        title={t("noPostsYet")}
        message={t("noPostsSubtitle")}
      />
    ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, marginTop: 0 }} edges={["top"]}>
      <BrandedAppHeader style={{ paddingVertical: 6 }} />
      <View style={{ flex: 1, backgroundColor: colors.surface, overflow: "hidden" }}>
        {topTabsElement}

        {isSwappingSector ? (
          <ScreenLoadingCenter spinnerSize={60} />
        ) : mainTab === "feed" ? (
          loading && posts.length === 0 ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: bottomContentPadding }}
              scrollEnabled={false}
            >
              {feedHeaderElement}
              <ScreenLoadingCenter spinnerSize={60} fill={false} style={{ paddingTop: 40 }} />
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              <FlatList
                style={{ flex: 1 }}
                data={filteredPosts}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={feedHeaderElement}
                ListEmptyComponent={renderFeedEmpty}
                ListFooterComponent={renderFeedFooter}
                contentContainerStyle={{ paddingBottom: bottomContentPadding, flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={7}
                removeClippedSubviews
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefreshFeed}
                    tintColor={colors.text}
                    colors={[colors.text]}
                  />
                }
                renderItem={renderFeedItem}
              />
            </View>
          )
        ) : mainTab === "lostSos" ? (
          <LostSosTab
            sosFeedPosts={sosFeedPosts}
            loading={loading}
            refreshing={refreshing}
            postMetaById={postMetaById}
            currentUserId={user?.id ?? null}
            likeBusy={likeBusy}
            deleteBusy={deleteBusy}
            bottomContentPadding={bottomContentPadding}
            onRefresh={onRefreshFeed}
            onToggleLike={handleToggleLike}
            onToggleHelpful={handleToggleHelpful}
            onToggleSave={handleToggleSave}
            onDelete={handleDelete}
            onHide={handleHidePost}
            onReport={handleReportPost}
            onBlock={handleBlockUser}
            onPlaydateComing={handlePlaydateComing}
            onSosResolved={handleSosResolved}
            burstMarkFoundCelebrate={burstMarkFoundCelebrate}
            renderPostCard={renderLostSosSingleCard}
            copy={copy}
            t={t}
          />
        ) : mainTab === "playdates" ? (
          <PlaydatesTab
            playdates={playdates}
            playdatesLoading={playdatesLoading}
            bottomContentPadding={bottomContentPadding}
            selectedPet={selectedPet}
            onRefresh={loadPlaydates}
            onCreatePlaydate={() => openPlaydateModal()}
            onRsvp={handleRsvp}
            onOpenComments={setPlaydateCommentsOpenFor}
            copy={copy}
          />
        ) : mainTab === "parks" ? (
          <ParksTab
            parks={parks}
            parksLoading={parksLoading}
            beacons={beacons}
            beaconsLoading={beaconsLoading}
            myBeaconId={myBeaconId}
            parkCheckins={parkCheckins}
            checkingInPark={checkingInPark}
            bottomContentPadding={bottomContentPadding}
            onRefresh={async () => {
              await Promise.all([loadBeacons(), loadDogParks()]);
            }}
            onCheckIn={handleParkCheckIn}
            onRemoveBeacon={handleRemoveBeacon}
            onViewPark={setSelectedPark}
            onCreatePlaydateAtPark={(parkName) => {
              setNewPlaydateLocation(parkName);
              openPlaydateModal();
            }}
            copy={copy}
          />
        ) : mainTab === "groups" ? (
          <GroupsTab
            filteredGroups={filteredGroups}
            groupsLoading={groupsLoading}
            groupsRefreshing={groupsRefreshing}
            groupSearch={groupSearch}
            isAdmin={isAdmin}
            bottomContentPadding={bottomContentPadding}
            insets={insets}
            onRefresh={onRefreshGroups}
            onSetGroupSearch={setGroupSearch}
            onOpenCreateModal={() => setCreateModalOpen(true)}
            renderGroupCard={renderGroupCard}
            copy={copy}
            t={t}
          />
        ) : mainTab === "qa" ? (
          <QATab
            questionPosts={questionPosts}
            refreshing={refreshing}
            bottomContentPadding={bottomContentPadding}
            onRefresh={onRefreshFeed}
            onAskQuestion={() => {
              setNewPostType("Question");
              setComposerOpen(true);
            }}
            onAnswer={setAnswerPost}
            onToggleLike={handleToggleLike}
            copy={copy}
            t={t}
          />
        ) : (
          <EventsTab
            playdates={playdates}
            playdatesLoading={playdatesLoading}
            bottomContentPadding={bottomContentPadding}
            onRefresh={loadPlaydates}
            onCreatePlaydate={() => openPlaydateModal()}
            onJoinEvent={handleJoinEvent}
            copy={copy}
          />
        )}
      </View>

      {communitySearchOpen && (
        <CommunitySearchModal
          visible
          onClose={() => {
            setCommunitySearchOpen(false);
            setCommunitySearchQuery("");
          }}
          t={t}
          rtlText={rtlText}
          rtlInput={rtlInput}
          rowDirection={rowDirectionForAppLayout(isRTL)}
          query={communitySearchQuery}
          onQueryChange={setCommunitySearchQuery}
          posts={searchPostsForModal}
          groups={searchGroupsForModal}
          meetups={playdates}
          parks={parks.map((p) => ({ id: p.id, name: p.name }))}
          loading={searchRemoteLoading}
        />
      )}

      {composerOpen && (
        <CreatePostModal
          visible
          onClose={() => {
            setComposerOpen(false);
            setNewPostContent("");
            setPickedImageUri(null);
          }}
          colors={colors}
          styles={styles}
          rtlInput={rtlInput}
          isRTL={isRTL}
          copy={copy}
          content={newPostContent}
          setContent={setNewPostContent}
          postType={newPostType}
          setPostType={setNewPostType}
          location={newPostLocation}
          setLocation={setNewPostLocation}
          visibility={newPostVisibility}
          setVisibility={setNewPostVisibility}
          tags={newPostTags}
          setTags={setNewPostTags}
          pets={pets}
          selectedPetId={selectedPetId}
          setSelectedPetId={setSelectedPetId}
          pickedImageUri={pickedImageUri}
          setPickedImageUri={setPickedImageUri}
          handlePickPostImage={handlePickPostImage}
          handlePublish={handlePublish}
          posting={posting}
          uploadingImage={uploadingImage}
          inputRef={composerInputRef}
          keyboardAvoidBehavior={keyboardAvoidBehavior}
        />
      )}

      {playdateModalOpen && (
      <CreatePlaydateModal
        visible
        onClose={closePlaydateModal}
        colors={colors}
        styles={styles}
        rtlInput={rtlInput}
        isRTL={isRTL}
        copy={copy}
        pets={pets}
        selectedPetId={selectedPetId}
        setSelectedPetId={setSelectedPetId}
        title={newPlaydateTitle}
        setTitle={setNewPlaydateTitle}
        date={newPlaydateDate}
        setDate={setNewPlaydateDate}
        time={newPlaydateTime}
        setTime={setNewPlaydateTime}
        location={newPlaydateLocation}
        setLocation={setNewPlaydateLocation}
        size={newPlaydateSize}
        setSize={setNewPlaydateSize}
        age={newPlaydateAge}
        setAge={setNewPlaydateAge}
        energy={newPlaydateEnergy}
        setEnergy={setNewPlaydateEnergy}
        maxParticipants={newPlaydateMax}
        setMaxParticipants={setNewPlaydateMax}
        description={newPlaydateDescription}
        setDescription={setNewPlaydateDescription}
        requiresApproval={newPlaydateApproval}
        setRequiresApproval={setNewPlaydateApproval}
        creating={creatingPlaydate}
        onCreate={handleCreatePlaydate}
        keyboardAvoidBehavior={keyboardAvoidBehavior}
        rowDirection={appRowDirection}
      />
      )}

      {selectedPark && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedPark(null)}
        >
          <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdropFill} onPress={() => setSelectedPark(null)} />
            <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />
              <Text style={[styles.modalTitle, rtlText]}>{selectedPark.name}</Text>
              <Text style={[styles.sectionCardSub, rtlText]}>
                {selectedPark.distance} · {selectedPark.rating.toFixed(1)} {copy("rating")} · {copy("peak")} {selectedPark.peakHours}
              </Text>
              <View style={styles.mapPlaceholder}>
                <MapViewWrapper
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: selectedPark.latitude,
                    longitude: selectedPark.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  pointerEvents="none"
                >
                  <MarkerWrapper
                    coordinate={{
                      latitude: selectedPark.latitude,
                      longitude: selectedPark.longitude,
                    }}
                    title={selectedPark.name}
                    description={selectedPark.address ?? copy("parkLocation")}
                  />
                </MapViewWrapper>
              </View>
              <View style={[styles.metaWrap, { flexDirection: appRowDirection }]}>
                {selectedPark.amenities.map((amenity) => (
                  <Text key={amenity} style={styles.metaPill}>{amenity}</Text>
                ))}
              </View>
              <Text style={[styles.contentText, rtlText]}>
                {selectedPark.activeDogs} {copy("activeDogsNow")}, {selectedPark.upcomingPlaydates} {copy("upcomingPlaydates")}, {selectedPark.recentPosts} {copy("recentPosts")}.
              </Text>
              <View style={[styles.actionBar, rtlRow]}>
                <Pressable
                  onPress={() => {
                    setNewPlaydateLocation(selectedPark.name);
                    setSelectedPark(null);
                    openPlaydateModal();
                  }}
                  style={styles.primarySmallBtn}
                >
                  <Text style={styles.primarySmallText}>{copy("createPlaydate")}</Text>
                </Pressable>
                <Pressable onPress={() => handleParkCheckIn(selectedPark)} style={styles.smallOutlineBtn}>
                  <Text style={styles.smallOutlineText}>{copy("checkIn")}</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Modal>
      )}

      {dogProfilePet && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setDogProfilePet(null)}
        >
          <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdropFill} onPress={() => setDogProfilePet(null)} />
            <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />
              <View style={styles.largeDogAvatar}>
                {dogProfilePet.imageUrl ? (
                  <Image source={{ uri: dogProfilePet.imageUrl }} style={StyleSheet.absoluteFill} />
                ) : (
                  <Ionicons name="paw" size={34} color={colors.textInverse} />
                )}
              </View>
              <Text style={[styles.modalTitle, { textAlign: "center" }]}>{dogProfilePet.name}</Text>
              <Text style={[styles.sectionCardSub, { textAlign: "center" }]}>
                {dogProfilePet.breed ? formatBreedForDisplay(dogProfilePet.breed, t) : copy("dog")} · {dogProfilePet.age}
              </Text>
              <View style={[styles.metaWrap, { justifyContent: "center" }]}>
                <Text style={styles.metaPill}>{copy("localDogProfile")}</Text>
                <Text style={styles.metaPill}>{copy("energyLevel")}: {energyLabel("Medium", isRTL)}</Text>
                <Text style={styles.metaPill}>{copy("parks")}</Text>
              </View>
              <View style={[styles.actionBar, { justifyContent: "center" }]}>
                <Pressable
                  onPress={() => handleInvitePet(dogProfilePet)}
                  style={invitedPetIds.has(dogProfilePet.id) ? styles.smallOutlineBtn : styles.primarySmallBtn}
                >
                  <Text style={invitedPetIds.has(dogProfilePet.id) ? styles.smallOutlineText : styles.primarySmallText}>
                    {invitedPetIds.has(dogProfilePet.id) ? copy("invited") : copy("invite")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleFollowPet(dogProfilePet)}
                  style={followedPetIds.has(dogProfilePet.id) ? styles.primarySmallBtn : styles.smallOutlineBtn}
                >
                  <Text style={followedPetIds.has(dogProfilePet.id) ? styles.primarySmallText : styles.smallOutlineText}>
                    {followedPetIds.has(dogProfilePet.id) ? copy("followed") : copy("follow")}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Modal>
      )}

      {playdateCommentsOpenFor && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setPlaydateCommentsOpenFor(null)}
        >
          <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdropFill} onPress={() => setPlaydateCommentsOpenFor(null)} />
            <KeyboardAvoidingView behavior={keyboardAvoidBehavior} style={styles.keyboardSheet}>
              <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
                <View style={styles.handle} />
                <Text style={[styles.modalTitle, rtlText]}>{copy("playdateComments")}</Text>
                <Text style={[styles.emptyInline, rtlText]}>
                  {copy("commentsHint")}
                </Text>
                <TextInput
                  value={playdateCommentText}
                  onChangeText={setPlaydateCommentText}
                  placeholder={copy("writeComment")}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, rtlInput]}
                />
                <Pressable
                  onPress={async () => {
                    const content = playdateCommentText.trim();
                    if (!content || !playdateCommentsOpenFor) return;
                    try {
                      await playdatesApi.addComment(playdateCommentsOpenFor.id, content);
                      showGlobalAlertCompat(copy("commentAdded"), copy("commentAddedDesc"));
                    } catch {
                      showGlobalAlertCompat(copy("commentLocal"), copy("commentLocalDesc"));
                    }
                    setPlaydateCommentText("");
                    setPlaydateCommentsOpenFor(null);
                  }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>{copy("postComment")}</Text>
                </Pressable>
              </Pressable>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}

      <CommentsBottomSheet
        visible={!!answerPost}
        onClose={() => setAnswerPost(null)}
        postId={answerPost?.id ?? ""}
        postAuthorId={answerPost?.userId ?? ""}
        onCommentCountChange={(delta) => {
          if (!answerPost) return;
          setPosts((prev) =>
            prev.map((post) =>
              post.id === answerPost.id
                ? { ...post, commentCount: Math.max(0, post.commentCount + delta) }
                : post,
            ),
          );
          setAnswerPost((post) =>
            post
              ? { ...post, commentCount: Math.max(0, post.commentCount + delta) }
              : post,
          );
        }}
      />

      {/* Create Group Modal (Admin only) */}
      {createModalOpen && (
      <Modal
        visible
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
      )}

      <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
        <CelebrationConfettiBurst ref={sosMarkFoundConfettiRef} />
      </View>
    </SafeAreaView>
  );
}

function CreatePostModal({
  visible,
  onClose,
  colors,
  styles,
  rtlInput,
  isRTL,
  copy,
  content,
  setContent,
  postType,
  setPostType,
  location,
  setLocation,
  visibility,
  setVisibility,
  tags,
  setTags,
  pets,
  selectedPetId,
  setSelectedPetId,
  pickedImageUri,
  setPickedImageUri,
  handlePickPostImage,
  handlePublish,
  posting,
  uploadingImage,
  inputRef,
  keyboardAvoidBehavior,
}: {
  visible: boolean;
  onClose: () => void;
  keyboardAvoidBehavior: KeyboardAvoidingViewProps["behavior"];
  colors: any;
  styles: ReturnType<typeof getStyles>;
  rtlInput: object;
  isRTL: boolean;
  copy: (key: CopyKey) => string;
  content: string;
  setContent: (value: string) => void;
  postType: PostKind;
  setPostType: (value: PostKind) => void;
  location: string;
  setLocation: (value: string) => void;
  visibility: Visibility;
  setVisibility: (value: Visibility) => void;
  tags: string;
  setTags: (value: string) => void;
  pets: PetDto[];
  selectedPetId: string | null;
  setSelectedPetId: (value: string | null) => void;
  pickedImageUri: string | null;
  setPickedImageUri: (value: string | null) => void;
  handlePickPostImage: () => void;
  handlePublish: () => void;
  posting: boolean;
  uploadingImage: boolean;
  inputRef: RefObject<TextInput | null>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdropFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={keyboardAvoidBehavior} style={styles.keyboardSheet}>
          <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { textAlign: isRTL ? "right" : "left" }]}>{copy("createPostTitle")}</Text>
            <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{copy("postType")}</Text>
              <View style={styles.modalChipWrap}>
                {POST_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setPostType(type)}
                    style={[styles.modalChip, postType === type && styles.modalChipActive]}
                  >
                    <Text style={[styles.modalChipText, postType === type && styles.modalChipTextActive]}>{postKindLabel(type, isRTL)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{copy("dog")}</Text>
              <View style={styles.modalChipWrap}>
                {pets.length === 0 ? (
                  <Text style={styles.emptyInline}>{copy("noPets")}</Text>
                ) : pets.map((pet) => (
                  <Pressable
                    key={pet.id}
                    onPress={() => setSelectedPetId(pet.id)}
                    style={[styles.modalChip, selectedPetId === pet.id && styles.modalChipActive]}
                  >
                    <Text style={[styles.modalChipText, selectedPetId === pet.id && styles.modalChipTextActive]}>{pet.name}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                ref={inputRef}
                style={[styles.input, styles.textArea, rtlInput]}
                placeholder={copy("whatHappening")}
                placeholderTextColor={colors.textMuted}
                multiline
                value={content}
                onChangeText={setContent}
                editable={!posting && !uploadingImage}
              />
              <TextInput
                style={[styles.input, rtlInput]}
                placeholder={copy("locationOrPark")}
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />
              <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{copy("visibility")}</Text>
              <View style={styles.modalChipWrap}>
                {VISIBILITY_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setVisibility(option)}
                    style={[styles.modalChip, visibility === option && styles.modalChipActive]}
                  >
                    <Text style={[styles.modalChipText, visibility === option && styles.modalChipTextActive]}>{visibilityLabel(option, isRTL)}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={[styles.input, rtlInput]}
                placeholder={copy("tags")}
                placeholderTextColor={colors.textMuted}
                value={tags}
                onChangeText={setTags}
              />
              <View style={styles.mediaRow}>
                <Pressable disabled={posting || uploadingImage} onPress={handlePickPostImage} style={styles.smallOutlineBtn}>
                  <Text style={styles.smallOutlineText}>{copy("addMedia")}</Text>
                </Pressable>
              </View>
              {pickedImageUri && (
                <View style={{ marginTop: 10 }}>
                  <Image source={{ uri: pickedImageUri }} style={styles.composerThumbnail} resizeMode="cover" />
                  <Pressable onPress={() => setPickedImageUri(null)} style={styles.thumbnailRemoveBtn}>
                    <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.9)" />
                  </Pressable>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable onPress={onClose} style={styles.composerCancel}>
                <Text style={styles.composerCancelText}>{copy("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={handlePublish}
                disabled={posting || uploadingImage}
                style={[styles.publishBtn, (posting || uploadingImage) && { opacity: 0.5 }]}
              >
                {posting || uploadingImage ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.publishText}>{copy("publishPost")}</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const PLAYDATE_SIZE_OPTIONS: DogSizeSuitability[] = ["Small", "Medium", "Large", "All"];
const PLAYDATE_AGE_OPTIONS = ["Puppies", "Adults", "Seniors", "All"] as const;
const PLAYDATE_ENERGY_OPTIONS: EnergyLevel[] = ["Calm", "Medium", "High"];

/** In RTL, reverse chip order so defaults like "All" sit on the logical start (right). */
function playdateChipOrder<T>(options: readonly T[], rtl: boolean): T[] {
  return rtl ? [...options].reverse() : [...options];
}

function CreatePlaydateModal({
  visible,
  onClose,
  colors,
  styles,
  rtlInput,
  isRTL,
  copy,
  pets,
  selectedPetId,
  setSelectedPetId,
  title,
  setTitle,
  date,
  setDate,
  time,
  setTime,
  location,
  setLocation,
  size,
  setSize,
  age,
  setAge,
  energy,
  setEnergy,
  maxParticipants,
  setMaxParticipants,
  description,
  setDescription,
  requiresApproval,
  setRequiresApproval,
  creating,
  onCreate,
  keyboardAvoidBehavior,
  rowDirection,
}: {
  visible: boolean;
  onClose: () => void;
  keyboardAvoidBehavior: KeyboardAvoidingViewProps["behavior"];
  colors: any;
  styles: ReturnType<typeof getStyles>;
  rtlInput: object;
  isRTL: boolean;
  rowDirection: "row" | "row-reverse";
  copy: (key: CopyKey) => string;
  pets: PetDto[];
  selectedPetId: string | null;
  setSelectedPetId: (value: string | null) => void;
  title: string;
  setTitle: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  time: string;
  setTime: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  size: DogSizeSuitability;
  setSize: (value: DogSizeSuitability) => void;
  age: string;
  setAge: (value: string) => void;
  energy: EnergyLevel;
  setEnergy: (value: EnergyLevel) => void;
  maxParticipants: string;
  setMaxParticipants: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  requiresApproval: boolean;
  setRequiresApproval: (value: boolean) => void;
  creating: boolean;
  onCreate: () => void;
}) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, useBottomSafeInset());
  const labelWrapStyle = {
    alignSelf: "stretch" as const,
    alignItems: (isRTL ? "flex-end" : "flex-start") as "flex-end" | "flex-start",
  };
  const chipWrapStyle = [styles.modalChipWrap, { flexDirection: rowDirection }];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdropFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={keyboardAvoidBehavior} style={styles.keyboardSheet}>
          <Pressable style={[styles.detailSheet, { paddingHorizontal: 0 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={{ paddingHorizontal: 20, alignSelf: "stretch" }}>
              <Text style={[styles.modalTitle, { textAlign: isRTL ? "right" : "left", alignSelf: "stretch" }]}>{copy("createPlaydateTitle")}</Text>
              <Text style={[styles.modalFormSubtitle, { textAlign: isRTL ? "right" : "left", alignSelf: "stretch" }]}>{copy("createPlaydateSubtitle")}</Text>
            </View>
            <ScrollView
              style={{ maxHeight: 520 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 14 + bottomInset }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <View style={labelWrapStyle}>
                <FormFieldLabel text={copy("titleField")} isRTL={isRTL} isRequired variant="modal" style={{ marginTop: 4, alignSelf: "stretch" }} />
              </View>
              <TextInput style={[styles.input, rtlInput]} placeholder={copy("titleField")} placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
              <View style={labelWrapStyle}>
                <FormFieldLabel text={copy("dog")} isRTL={isRTL} isRequired variant="modal" style={{ alignSelf: "stretch" }} />
              </View>
              <View style={chipWrapStyle}>
                {pets.map((pet) => (
                  <Pressable key={pet.id} onPress={() => setSelectedPetId(pet.id)} style={[styles.modalChip, selectedPetId === pet.id && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, selectedPetId === pet.id && styles.modalChipTextActive]}>{pet.name}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.twoCol, { flexDirection: rowDirection }]}>
                <View style={styles.colInput}>
                  <View style={labelWrapStyle}>
                    <FormFieldLabel text={copy("dateLabel")} isRTL={isRTL} isRequired variant="modal" style={{ alignSelf: "stretch" }} />
                  </View>
                  <DatePickerField
                    value={date}
                    onChange={setDate}
                    placeholder={copy("dateField")}
                    isRTL={isRTL}
                    minimumDate={new Date()}
                  />
                </View>
                <View style={styles.colInput}>
                  <View style={labelWrapStyle}>
                    <FormFieldLabel text={copy("timeLabel")} isRTL={isRTL} isRequired variant="modal" style={{ alignSelf: "stretch" }} />
                  </View>
                  <TimePickerField
                    value={time}
                    onChange={setTime}
                    placeholder={copy("timeField")}
                    isRTL={isRTL}
                  />
                </View>
              </View>
              <View style={labelWrapStyle}>
                <FormFieldLabel text={copy("locationOrPark")} isRTL={isRTL} isRequired variant="modal" style={{ alignSelf: "stretch" }} />
              </View>
              <TextInput style={[styles.input, rtlInput]} placeholder={copy("locationOrPark")} placeholderTextColor={colors.textMuted} value={location} onChangeText={setLocation} />
              <View style={labelWrapStyle}>
                <FormFieldLabel text={copy("sizeFit")} isRTL={isRTL} variant="modal" style={{ alignSelf: "stretch" }} />
              </View>
              <View style={chipWrapStyle}>
                {playdateChipOrder(PLAYDATE_SIZE_OPTIONS, isRTL).map((option) => (
                  <Pressable key={option} onPress={() => setSize(option)} style={[styles.modalChip, size === option && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, size === option && styles.modalChipTextActive]}>{sizeLabel(option, isRTL)}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={labelWrapStyle}>
                <FormFieldLabel text={copy("ageFit")} isRTL={isRTL} variant="modal" style={{ alignSelf: "stretch" }} />
              </View>
              <View style={chipWrapStyle}>
                {playdateChipOrder(PLAYDATE_AGE_OPTIONS, isRTL).map((option) => (
                  <Pressable key={option} onPress={() => setAge(option)} style={[styles.modalChip, age === option && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, age === option && styles.modalChipTextActive]}>{ageLabel(option, isRTL)}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={labelWrapStyle}>
                <FormFieldLabel text={copy("energyLevel")} isRTL={isRTL} variant="modal" style={{ alignSelf: "stretch" }} />
              </View>
              <View style={chipWrapStyle}>
                {playdateChipOrder(PLAYDATE_ENERGY_OPTIONS, isRTL).map((option) => (
                  <Pressable key={option} onPress={() => setEnergy(option)} style={[styles.modalChip, energy === option && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, energy === option && styles.modalChipTextActive]}>{energyLabel(option, isRTL)}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput style={[styles.input, rtlInput]} placeholder={copy("maxParticipants")} placeholderTextColor={colors.textMuted} value={maxParticipants} onChangeText={setMaxParticipants} keyboardType="number-pad" />
              <TextInput style={[styles.input, styles.textArea, rtlInput]} placeholder={copy("description")} placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline />
              <Pressable
                onPress={() => setRequiresApproval(!requiresApproval)}
                style={[styles.checkRow, { flexDirection: rowDirection, alignSelf: isRTL ? "flex-end" : "flex-start" }]}
              >
                <Ionicons name={requiresApproval ? "checkbox" : "square-outline"} size={20} color={colors.text} />
                <Text style={[styles.checkText, { textAlign: isRTL ? "right" : "left" }]}>{copy("requiresApproval")}</Text>
              </Pressable>
              <View style={[styles.modalActions, { flexDirection: rowDirection, marginTop: 18 }]}>
                <Pressable onPress={onClose} style={styles.composerCancel}>
                  <Text style={styles.composerCancelText}>{copy("cancel")}</Text>
                </Pressable>
                <Pressable onPress={onCreate} disabled={creating} style={[styles.publishBtn, creating && { opacity: 0.5 }]}>
                  {creating ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={styles.publishText}>{copy("createPlaydate")}</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}
