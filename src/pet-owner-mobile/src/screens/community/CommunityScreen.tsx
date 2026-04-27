import { useState, useCallback, useRef, useEffect, useMemo, type RefObject } from "react";
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
  KeyboardAvoidingView,
  Platform,
  Share,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
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
  CommunityGroupDto,
  PlaydateEventDto,
  LiveBeaconDto,
  PetDto,
  RsvpStatusValue,
} from "../../types/api";
import { pickImageWithSource } from "../../utils/imagePicker";

const PAGE_SIZE = 20;

type MainTab = "feed" | "playdates" | "parks" | "groups" | "qa" | "events";
type FeedFilter =
  | "Nearby"
  | "Playdates"
  | "Questions"
  | "Recommendations"
  | "Dog Parks"
  | "Lost & Found"
  | "Events";
type PostKind =
  | "Cute moment"
  | "Question"
  | "Recommendation"
  | "Playdate"
  | "Warning"
  | "Lost & Found"
  | "Event";
type Visibility = "Public" | "Nearby only" | "Friends only" | "Group only";
type DogSizeSuitability = "Small" | "Medium" | "Large" | "All";
type EnergyLevel = "Calm" | "Medium" | "High";

interface PostMeta {
  kind: PostKind;
  location?: string;
  dogName?: string;
  visibility?: Visibility;
  tags?: string[];
  isDemo?: boolean;
}

interface DogPark {
  id: string;
  name: string;
  distance: string;
  rating: number;
  activity: "Low" | "Medium" | "High";
  amenities: string[];
  activeDogs: number;
  upcomingPlaydates: number;
  recentPosts: number;
  peakHours: string;
}

interface LocalEvent {
  id: string;
  name: string;
  organizer: string;
  dateTime: string;
  location: string;
  price: string;
  spotsLeft: number;
  description: string;
  attendingDogs: number;
  joined: boolean;
}

const FEED_FILTERS: FeedFilter[] = [
  "Nearby",
  "Playdates",
  "Questions",
  "Recommendations",
  "Dog Parks",
  "Lost & Found",
  "Events",
];

const POST_TYPES: PostKind[] = [
  "Cute moment",
  "Question",
  "Recommendation",
  "Playdate",
  "Warning",
  "Lost & Found",
  "Event",
];

const VISIBILITY_OPTIONS: Visibility[] = [
  "Public",
  "Nearby only",
  "Friends only",
  "Group only",
];

const demoPostMeta: Record<string, PostMeta> = {
  "demo-post-1": {
    kind: "Playdate",
    location: "Park Hayarkon",
    dogName: "Mika",
    visibility: "Nearby only",
    tags: ["evening", "friendly"],
    isDemo: true,
  },
  "demo-post-2": {
    kind: "Question",
    location: "Tel Aviv",
    dogName: "Bamba",
    visibility: "Public",
    tags: ["training"],
    isDemo: true,
  },
  "demo-post-3": {
    kind: "Recommendation",
    location: "Dubnov Park",
    visibility: "Public",
    tags: ["dog-park"],
    isDemo: true,
  },
  "demo-post-4": {
    kind: "Playdate",
    location: "Gan Meir",
    dogName: "Luna",
    visibility: "Nearby only",
    tags: ["small-dogs"],
    isDemo: true,
  },
  "demo-post-5": {
    kind: "Lost & Found",
    location: "Dizengoff Center",
    visibility: "Public",
    tags: ["lost-dog"],
    isDemo: true,
  },
};

const DEMO_POSTS: PostDto[] = [
  {
    id: "demo-post-1",
    userId: "demo-user-mika",
    userName: "Mika and Noa",
    content: "Mika is looking for friends to play with today at Park Hayarkon at 18:30.",
    likeCount: 18,
    commentCount: 4,
    likedByMe: false,
    createdAt: new Date(Date.now() - 22 * 60_000).toISOString(),
    authorRole: "Owner",
    authorIsApprovedProvider: false,
    category: "playdate",
  },
  {
    id: "demo-post-2",
    userId: "demo-user-bamba",
    userName: "Amit Cohen",
    content: "Does anyone know a good trainer for an energetic Labrador?",
    likeCount: 9,
    commentCount: 7,
    likedByMe: false,
    createdAt: new Date(Date.now() - 75 * 60_000).toISOString(),
    authorRole: "Owner",
    authorIsApprovedProvider: false,
    category: "question",
  },
  {
    id: "demo-post-3",
    userId: "demo-user-park",
    userName: "Dubnov Dog Crew",
    content: "Dog park update: the water fountain at Dubnov Park is working again.",
    likeCount: 31,
    commentCount: 3,
    likedByMe: true,
    createdAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    authorRole: "Owner",
    authorIsApprovedProvider: false,
    category: "recommendation",
  },
  {
    id: "demo-post-4",
    userId: "demo-user-luna",
    userName: "Luna Meetup",
    content: "Looking for small dogs meetup this Friday.",
    likeCount: 14,
    commentCount: 5,
    likedByMe: false,
    createdAt: new Date(Date.now() - 8 * 60 * 60_000).toISOString(),
    authorRole: "Owner",
    authorIsApprovedProvider: false,
    category: "playdate",
  },
  {
    id: "demo-post-5",
    userId: "demo-user-lost",
    userName: "Community Alert",
    content: "Lost dog notice near Dizengoff Center. Brown mixed breed, red collar.",
    likeCount: 42,
    commentCount: 11,
    likedByMe: false,
    createdAt: new Date(Date.now() - 26 * 60 * 60_000).toISOString(),
    authorRole: "Owner",
    authorIsApprovedProvider: false,
    category: "lost_and_found",
  },
];

const DEMO_PARKS: DogPark[] = [
  {
    id: "park-hayarkon",
    name: "Park Hayarkon Dog Run",
    distance: "1.2 km",
    rating: 4.8,
    activity: "High",
    amenities: ["Water fountain", "Shade", "Fence", "Small dog area"],
    activeDogs: 8,
    upcomingPlaydates: 2,
    recentPosts: 6,
    peakHours: "17:30-20:00",
  },
  {
    id: "dubnov",
    name: "Dubnov Park",
    distance: "2.4 km",
    rating: 4.5,
    activity: "Medium",
    amenities: ["Water fountain", "Lighting", "Fence"],
    activeDogs: 4,
    upcomingPlaydates: 1,
    recentPosts: 3,
    peakHours: "18:00-19:30",
  },
  {
    id: "gan-meir",
    name: "Gan Meir Small Dogs",
    distance: "3.1 km",
    rating: 4.6,
    activity: "Low",
    amenities: ["Shade", "Small dog area", "Fence"],
    activeDogs: 2,
    upcomingPlaydates: 1,
    recentPosts: 2,
    peakHours: "16:00-18:00",
  },
];

const DEMO_EVENTS: LocalEvent[] = [
  {
    id: "event-puppy-social",
    name: "Puppy Socialization Meetup",
    organizer: "PawSquare hosts",
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60_000).toISOString(),
    location: "Park Hayarkon",
    price: "Free",
    spotsLeft: 7,
    description: "Gentle social time for puppies with short guided play breaks.",
    attendingDogs: 11,
    joined: false,
  },
  {
    id: "event-photo-day",
    name: "Dog Photography Day",
    organizer: "Tel Aviv Dog Owners",
    dateTime: new Date(Date.now() + 6 * 24 * 60 * 60_000).toISOString(),
    location: "Dubnov Park",
    price: "Paid",
    spotsLeft: 5,
    description: "Mini photo sessions and a relaxed park meetup.",
    attendingDogs: 9,
    joined: false,
  },
  {
    id: "event-adoption",
    name: "Adoption Day",
    organizer: "Local Rescue Volunteers",
    dateTime: new Date(Date.now() + 9 * 24 * 60 * 60_000).toISOString(),
    location: "Gan Meir",
    price: "Free",
    spotsLeft: 20,
    description: "Meet adoptable dogs and get advice from foster families.",
    attendingDogs: 18,
    joined: false,
  },
];

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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function categoryToKind(category?: string): PostKind {
  switch ((category ?? "").toLowerCase()) {
    case "question":
    case "questions":
      return "Question";
    case "recommendation":
    case "recommendations":
      return "Recommendation";
    case "playdate":
    case "playdates":
      return "Playdate";
    case "lost_and_found":
    case "lost & found":
      return "Lost & Found";
    case "event":
    case "events":
      return "Event";
    case "warning":
      return "Warning";
    default:
      return "Cute moment";
  }
}

function filterMatchesPost(filter: FeedFilter, post: PostDto, meta?: PostMeta): boolean {
  const kind = meta?.kind ?? categoryToKind(post.category);
  if (filter === "Nearby") return true;
  if (filter === "Dog Parks") {
    return /park|fountain|dog run/i.test(`${post.content} ${meta?.location ?? ""}`);
  }
  if (filter === "Questions") return kind === "Question";
  if (filter === "Recommendations") return kind === "Recommendation";
  if (filter === "Lost & Found") return kind === "Lost & Found";
  if (filter === "Playdates") return kind === "Playdate";
  if (filter === "Events") return kind === "Event";
  return true;
}

function useCommunityStyles() {
  const { colors } = useTheme();
  return useMemo(() => getStyles(colors), [colors]);
}

function PostCard({
  post,
  meta,
  currentUserId,
  onToggleLike,
  onDelete,
  onHide,
  onReport,
  onBlock,
  onPlaydateComing,
  rtlText,
  rtlRow,
  isLikePending,
  isDeletePending,
}: {
  post: PostDto;
  meta?: PostMeta;
  currentUserId: string | null;
  onToggleLike: (id: string) => void;
  onDelete: (id: string) => void;
  onHide: (id: string) => void;
  onReport: (id: string) => void;
  onBlock: (userId: string) => void;
  onPlaydateComing: (post: PostDto) => void;
  rtlText: object;
  rtlRow: object;
  isLikePending?: boolean;
  isDeletePending?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useCommunityStyles();

  const isMine = currentUserId === post.userId;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const kind = meta?.kind ?? categoryToKind(post.category);

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
            <View style={[styles.kindBadge, kind === "Lost & Found" && styles.sosBadge]}>
              <Text style={styles.kindBadgeText}>{kind}</Text>
            </View>
          </View>
          <Text style={styles.timeText}>
            {relativeTime(post.createdAt)}
            {meta?.location ? ` · ${meta.location}` : ""}
            {meta?.visibility ? ` · ${meta.visibility}` : ""}
          </Text>
        </View>
        {isMine ? (
          <Pressable
            disabled={isDeletePending}
            onPress={() =>
              showGlobalAlertCompat("Delete post?", "", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
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
            <Text style={styles.menuText}>Hide post</Text>
          </Pressable>
          <Pressable onPress={() => { setMenuOpen(false); onReport(post.id); }} style={styles.menuItem}>
            <Ionicons name="flag-outline" size={16} color={colors.warning} />
            <Text style={styles.menuText}>Report post</Text>
          </Pressable>
          <Pressable onPress={() => { setMenuOpen(false); onBlock(post.userId); }} style={styles.menuItem}>
            <Ionicons name="ban-outline" size={16} color={colors.danger} />
            <Text style={styles.menuText}>Block user</Text>
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
            <Text style={[styles.dogSubtle, rtlText]}>Friendly local dog profile</Text>
          </View>
          <Pressable
            onPress={() => showGlobalAlertCompat("Invite sent", `Invite to play with ${meta.dogName} opened.`)}
            style={styles.smallOutlineBtn}
          >
            <Text style={styles.smallOutlineText}>Invite</Text>
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

      {kind === "Playdate" && (
        <View style={[styles.playdateInline, rtlRow]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.inlineTitle, rtlText]}>Community playdate</Text>
            <Text style={[styles.inlineSub, rtlText]}>
              {meta?.location ?? "Local dog park"} · {Math.max(1, post.likeCount)} interested
            </Text>
          </View>
          <Pressable onPress={() => onPlaydateComing(post)} style={styles.primarySmallBtn}>
            <Text style={styles.primarySmallText}>I'm coming</Text>
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
        <Pressable
          style={[styles.actionBtn, rtlRow]}
          onPress={() =>
            Share.share({
              message: post.content,
            }).catch(() => {})
          }
        >
          <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.actionText}>Share</Text>
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

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const styles = useCommunityStyles();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CommunityScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Admin";
  const { t, rtlText, rtlRow, rtlInput, isRTL } = useTranslation();
  const styles = useCommunityStyles();

  const [mainTab, setMainTab] = useState<MainTab>("feed");

  const [posts, setPosts] = useState<PostDto[]>([]);
  const [postMetaById, setPostMetaById] = useState<Record<string, PostMeta>>(demoPostMeta);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [feedIsDemo, setFeedIsDemo] = useState(false);
  const [hasMore, setHasMore] = useState(false);
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
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(() => new Set());
  const [groupSearch, setGroupSearch] = useState("");

  const [refreshing, setRefreshing] = useState(false);
  const [groupsRefreshing, setGroupsRefreshing] = useState(false);
  const composerInputRef = useRef<TextInput>(null);
  const likeLockRef = useRef<Set<string>>(new Set());
  const deleteLockRef = useRef<Set<string>>(new Set());
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

  const [beacons, setBeacons] = useState<LiveBeaconDto[]>([]);
  const [beaconsLoading, setBeaconsLoading] = useState(false);
  const [myBeaconId, setMyBeaconId] = useState<string | null>(null);
  const [checkingInPark, setCheckingInPark] = useState<DogPark | null>(null);
  const [selectedPark, setSelectedPark] = useState<DogPark | null>(null);
  const [parkCheckins, setParkCheckins] = useState<Record<string, boolean>>({});

  const [events, setEvents] = useState<LocalEvent[]>(DEMO_EVENTS);
  const [dogProfilePet, setDogProfilePet] = useState<PetDto | null>(null);
  const [playdateCommentsOpenFor, setPlaydateCommentsOpenFor] = useState<PlaydateEventDto | null>(null);
  const [playdateCommentText, setPlaydateCommentText] = useState("");

  useEffect(() => {
    if (!composerOpen) return;
    const id = setTimeout(() => composerInputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [composerOpen]);

  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? pets[0] ?? null;
  const appRowDirection = rowDirectionForAppLayout(isRTL);

  const loadFeed = useCallback(
    async (p: number, replace: boolean) => {
      if (replace) setLoading(true);
      setFeedError(false);
      try {
        const data = await postsApi.getFeed(p, PAGE_SIZE);
        const nextPosts = data.length > 0 ? data : DEMO_POSTS;
        setPosts((prev) => (replace ? nextPosts : [...prev, ...nextPosts]));
        setFeedIsDemo(data.length === 0);
        setHasMore(data.length >= PAGE_SIZE);
        setPage(p);
      } catch {
        setFeedError(true);
        if (replace) {
          setPosts(DEMO_POSTS);
          setFeedIsDemo(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const onRefreshFeed = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFeed(1, true), loadPets(), loadPlaydates(), loadBeacons()]);
    setRefreshing(false);
  }, [loadFeed]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      setGroups(await communityApi.getGroups());
    } catch {
      /* error toast from global API interceptor */
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const loadPets = useCallback(async () => {
    try {
      const data = await petsApi.getMyPets();
      setPets(data);
      setSelectedPetId((current) => current ?? data[0]?.id ?? null);
    } catch {}
  }, []);

  const loadPlaydates = useCallback(async () => {
    setPlaydatesLoading(true);
    try {
      setPlaydates(await playdatesApi.list());
    } catch {
      setPlaydates([]);
    } finally {
      setPlaydatesLoading(false);
    }
  }, []);

  const loadBeacons = useCallback(async () => {
    setBeaconsLoading(true);
    try {
      setBeacons(await palsApi.getActiveBeacons());
    } catch {
      setBeacons([]);
    } finally {
      setBeaconsLoading(false);
    }
  }, []);

  const onRefreshGroups = useCallback(async () => {
    setGroupsRefreshing(true);
    try {
      setGroups(await communityApi.getGroups());
    } catch {
      /* error toast from global API interceptor */
    } finally {
      setGroupsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn) return;
      loadPets();
      if (mainTab === "feed" || mainTab === "qa") loadFeed(1, true);
      if (mainTab === "groups") loadGroups();
      if (mainTab === "playdates" || mainTab === "events") loadPlaydates();
      if (mainTab === "parks") loadBeacons();
    }, [isLoggedIn, mainTab, loadFeed, loadGroups, loadPets, loadPlaydates, loadBeacons]),
  );

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

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => `${g.name} ${g.description ?? ""}`.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const handlePublish = async () => {
    const content = newPostContent.trim();
    if ((!content && !pickedImageUri) || posting) {
      showGlobalAlertCompat("Post needs content", "Write something or attach an image before publishing.");
      return;
    }
    if (newPostType === "Lost & Found" && !newPostLocation.trim()) {
      showGlobalAlertCompat("Location recommended", "Lost & Found posts work best with an approximate area.");
    }
    if (newPostType === "Playdate") {
      showGlobalAlertCompat("Tip", "For full RSVP details, use Create Playdate too.");
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
      const post = await postsApi.create({
        content,
        imageUrl,
        city: newPostLocation.trim() || undefined,
        category,
      } as any);
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
      showGlobalAlertCompat("Posted", "Your post is live in the community.");
    } catch {
      const id = `local-post-${Date.now()}`;
      const localPost: PostDto = {
        id,
        userId: user?.id ?? "local-user",
        userName: user?.name ?? "You",
        content,
        imageUrl: pickedImageUri ?? undefined,
        likeCount: 0,
        commentCount: 0,
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
      showGlobalAlertCompat("Saved locally", "The API was unavailable, so this post is visible in this session.");
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

  const loadMore = () => {
    if (!loading && hasMore) loadFeed(page + 1, false);
  };

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
      showGlobalAlertCompat(t("errorTitle"), "Failed to create group");
    }
    setCreatingGroup(false);
  };

  const handleCreatePlaydate = async () => {
    const title = newPlaydateTitle.trim();
    const location = newPlaydateLocation.trim();
    if (!title || !newPlaydateDate.trim() || !newPlaydateTime.trim() || !location) {
      showGlobalAlertCompat("Missing details", "Title, date, time and location are required.");
      return;
    }
    const scheduledFor = new Date(`${newPlaydateDate.trim()}T${newPlaydateTime.trim()}:00`);
    if (Number.isNaN(scheduledFor.getTime())) {
      showGlobalAlertCompat("Invalid date", "Use date as YYYY-MM-DD and time as HH:mm.");
      return;
    }
    if (scheduledFor.getTime() <= Date.now()) {
      showGlobalAlertCompat("Choose a future time", "Playdates cannot be created in the past.");
      return;
    }
    setCreatingPlaydate(true);
    try {
      const created = await playdatesApi.create({
        title,
        description:
          [
            newPlaydateDescription.trim(),
            `Size: ${newPlaydateSize}`,
            `Age: ${newPlaydateAge}`,
            `Energy: ${newPlaydateEnergy}`,
            newPlaydateApproval ? "Join mode: Requires organizer approval" : "Join mode: Open to everyone",
          ]
            .filter(Boolean)
            .join("\n"),
        locationName: location,
        // TODO: Replace this approximate Tel Aviv fallback with a geocoded dog-park picker when backend/location support is available.
        latitude: 32.0853,
        longitude: 34.7818,
        city: "Tel Aviv",
        scheduledFor: scheduledFor.toISOString(),
        allowedSpecies: ["DOG"],
        maxPets: Number.parseInt(newPlaydateMax, 10) || undefined,
      });
      setPlaydates((prev) => [created, ...prev]);
      setPlaydateModalOpen(false);
      setNewPlaydateTitle("");
      setNewPlaydateLocation("");
      setNewPlaydateDescription("");
      showGlobalAlertCompat("Playdate created", "Dog owners can RSVP now.");
    } catch {
      const local: PlaydateEventDto = {
        id: `local-playdate-${Date.now()}`,
        hostUserId: user?.id ?? "local-user",
        hostUserName: user?.name ?? "You",
        title,
        description: newPlaydateDescription.trim() || null,
        locationName: location,
        latitude: 32.0853,
        longitude: 34.7818,
        city: "Tel Aviv",
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
      setPlaydateModalOpen(false);
      showGlobalAlertCompat("Saved locally", "The API was unavailable, so this playdate is visible in this session.");
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
      showGlobalAlertCompat("RSVP updated", `Marked as ${status}.`);
    } catch {
      showGlobalAlertCompat("RSVP saved locally", "The API was unavailable, so this update is local for now.");
    }
  };

  const handleParkCheckIn = async (park: DogPark) => {
    setCheckingInPark(park);
    try {
      const beacon = await palsApi.startBeacon({
        placeName: park.name,
        latitude: 32.0853,
        longitude: 34.7818,
        city: "Tel Aviv",
        durationMinutes: 60,
        petIds: selectedPet ? [selectedPet.id] : pets.map((p) => p.id),
        species: "DOG",
      });
      setMyBeaconId(beacon.id);
      setBeacons((prev) => [beacon, ...prev]);
      setParkCheckins((prev) => ({ ...prev, [park.id]: true }));
      showGlobalAlertCompat("Checked in", "You checked in with your dog.");
    } catch {
      setMyBeaconId(`local-beacon-${park.id}`);
      setParkCheckins((prev) => ({ ...prev, [park.id]: true }));
      showGlobalAlertCompat("Checked in locally", "Beacon API was unavailable, so this check-in is local.");
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
      if (!id.startsWith("local-")) await palsApi.endBeacon(id);
      await loadBeacons();
    } catch {
      showGlobalAlertCompat("Check-in removed", "Your local check-in was removed.");
    }
  };

  const handleJoinGroup = (groupId: string) => {
    // TODO: Wire to a backend join/leave group endpoint when it exists.
    setJoinedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
    showGlobalAlertCompat("Group updated", "Membership is reflected locally until backend join support is added.");
  };

  const handleJoinEvent = (eventId: string) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              joined: !event.joined,
              attendingDogs: Math.max(0, event.attendingDogs + (event.joined ? -1 : 1)),
              spotsLeft: Math.max(0, event.spotsLeft + (event.joined ? 1 : -1)),
            }
          : event,
      ),
    );
    showGlobalAlertCompat("Event updated", "Your event RSVP is saved locally.");
  };

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

  const renderTopTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.topTabsContent,
        { flexDirection: appRowDirection },
      ]}
    >
      {(["feed", "playdates", "parks", "groups", "qa", "events"] as MainTab[]).map((tab) => {
        const active = mainTab === tab;
        const label =
          tab === "feed"
            ? "Feed"
            : tab === "playdates"
              ? "Playdates"
              : tab === "parks"
                ? "Dog Parks"
                : tab === "groups"
                  ? "Groups"
                  : tab === "qa"
                    ? "Q&A"
                    : "Events";
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
                    : "sparkles-outline";
        return (
          <Pressable
            key={tab}
            onPress={() => setMainTab(tab)}
            style={[styles.topTab, active ? styles.topTabActive : styles.topTabInactive]}
          >
            <Ionicons name={icon as any} size={15} color={active ? colors.textInverse : colors.textSecondary} />
            <Text style={[styles.topTabText, active && styles.topTabTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderHero = () => (
    <View style={styles.hero}>
      <View style={[styles.heroRow, rtlRow]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, rtlText]}>PawSquare</Text>
          <Text style={[styles.heroSubtitle, rtlText]}>Your local dog community</Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="paw" size={26} color={colors.textInverse} />
        </View>
      </View>
      <Text style={[styles.privacyNote, rtlText]}>
        Exact location is only shared when you choose to join or create a playdate.
      </Text>
    </View>
  );

  const renderFeedHeader = () => (
    <>
      {renderTopTabs()}
      {renderHero()}
      <View style={styles.searchCard}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, rtlInput]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search posts, parks, dogs"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterContent, { flexDirection: appRowDirection }]}
      >
        {FEED_FILTERS.map((filter) => (
          <Chip
            key={filter}
            label={filter}
            active={activeFilter === filter}
            onPress={() => setActiveFilter(filter)}
          />
        ))}
      </ScrollView>
      {feedIsDemo && (
        <View style={styles.demoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.demoBannerText, rtlText]}>
            Showing demo community activity until real posts are available.
          </Text>
        </View>
      )}
      {feedError && (
        <View style={styles.demoBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.primary} />
          <Text style={[styles.demoBannerText, rtlText]}>
            Feed API is unavailable, so fallback posts are shown for this session.
          </Text>
        </View>
      )}
      <View style={styles.card}>
        <View style={[styles.quickActions, rtlRow]}>
          <Pressable onPress={() => setComposerOpen(true)} style={[styles.quickActionPrimary, rtlRow]}>
            <Ionicons name="create-outline" size={18} color={colors.textInverse} />
            <Text style={styles.quickActionPrimaryText}>Create Post</Text>
          </Pressable>
          <Pressable onPress={() => setPlaydateModalOpen(true)} style={[styles.quickActionSecondary, rtlRow]}>
            <Ionicons name="calendar-outline" size={18} color={colors.text} />
            <Text style={styles.quickActionSecondaryText}>Create Playdate</Text>
          </Pressable>
        </View>
      </View>
      {pets.length > 0 && (
        <View style={styles.card}>
          <Text style={[styles.sectionCardTitle, rtlText]}>Your dog profiles</Text>
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
                <Text style={styles.dogProfileName} numberOfLines={1}>{pet.name}</Text>
                <Text style={styles.dogProfileSub} numberOfLines={1}>{pet.breed ?? "Dog"} · age {pet.age}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
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

  const renderGroupCard = ({ item }: { item: CommunityGroupDto }) => {
    const joined = joinedGroups.has(item.id);
    return (
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
          onPress={(e) => {
            e.stopPropagation();
            handleJoinGroup(item.id);
          }}
          style={{
            backgroundColor: joined ? colors.successLight : colors.text,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: joined ? 1 : 0,
            borderColor: colors.success,
          }}
        >
          <Text style={{ color: joined ? colors.success : colors.textInverse, fontSize: 13, fontWeight: "700" }}>
            {joined ? "Joined" : t("joinGroup")}
          </Text>
        </Pressable>
      </View>
    </Pressable>
    );
  };

  const renderGroupsEmpty = () =>
    !groupsLoading ? (
      <ListEmptyState
        icon="people-outline"
        title={t("noGroups")}
        message={t("noGroupsSubtitle")}
      />
    ) : null;

  const renderPlaydateCard = (event: PlaydateEventDto) => (
    <View key={event.id} style={styles.card}>
      <View style={[styles.cardRow, rtlRow]}>
        <View style={styles.iconBubble}>
          <Ionicons name="calendar" size={19} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionCardTitle, rtlText]}>{event.title}</Text>
          <Text style={[styles.sectionCardSub, rtlText]}>
            {event.hostUserName} · {formatDateTime(event.scheduledFor)}
          </Text>
        </View>
      </View>
      <Text style={[styles.contentText, rtlText]}>
        {event.description || "Open dog playdate for friendly local dogs."}
      </Text>
      <View style={[styles.metaWrap, { flexDirection: appRowDirection }]}>
        <Text style={styles.metaPill}>{event.locationName}</Text>
        <Text style={styles.metaPill}>All sizes</Text>
        <Text style={styles.metaPill}>{event.goingCount} going</Text>
        {event.maxPets ? <Text style={styles.metaPill}>Max {event.maxPets}</Text> : null}
      </View>
      <View style={[styles.actionBar, rtlRow]}>
        {(["Going", "Maybe", "NotGoing"] as RsvpStatusValue[]).map((status) => {
          const active = event.myRsvpStatus === status;
          return (
            <Pressable
              key={status}
              onPress={() => handleRsvp(event, status)}
              style={[styles.rsvpButton, active && styles.rsvpButtonActive]}
            >
              <Text style={[styles.rsvpText, active && styles.rsvpTextActive]}>
                {status === "NotGoing" ? "Not going" : status}
              </Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setPlaydateCommentsOpenFor(event)} style={[styles.actionBtn, rtlRow]}>
          <Ionicons name="chatbubble-outline" size={17} color={colors.textSecondary} />
          <Text style={styles.actionText}>Comments</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderPlaydates = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={playdatesLoading} onRefresh={loadPlaydates} tintColor={colors.text} colors={[colors.text]} />}
      contentContainerStyle={{ paddingBottom: 130 }}
    >
      {renderTopTabs()}
      <SectionHeader
        title="Dog Playdates"
        subtitle="Coordinate local meetups and RSVP with your dog."
        actionLabel="Create Playdate"
        onAction={() => setPlaydateModalOpen(true)}
      />
      {playdatesLoading && playdates.length === 0 ? (
        <ListSkeleton rows={3} variant="card" />
      ) : playdates.length > 0 ? (
        playdates.map(renderPlaydateCard)
      ) : (
        <ListEmptyState
          icon="calendar-outline"
          title="No playdates yet"
          message="Create the first meetup for dogs nearby."
        />
      )}
    </ScrollView>
  );

  const renderParks = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={beaconsLoading} onRefresh={loadBeacons} tintColor={colors.text} colors={[colors.text]} />}
      contentContainerStyle={{ paddingBottom: 130 }}
    >
      {renderTopTabs()}
      <SectionHeader
        title="Dog Parks / Live Nearby"
        subtitle="See live check-ins and discover friendly park activity."
        actionLabel={myBeaconId ? "Remove Check-in" : "I am here"}
        onAction={myBeaconId ? handleRemoveBeacon : () => handleParkCheckIn(DEMO_PARKS[0])}
      />
      <View style={styles.card}>
        <Text style={[styles.sectionCardTitle, rtlText]}>Active now</Text>
        {beacons.length > 0 ? (
          beacons.slice(0, 3).map((beacon) => (
            <Pressable
              key={beacon.id}
              onPress={() => navigation.navigate("LiveBeaconDetail", { beaconId: beacon.id })}
              style={[styles.liveBeaconRow, rtlRow]}
            >
              <View style={styles.liveDot} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.authorName, rtlText]}>{beacon.hostUserName}</Text>
                <Text style={[styles.sectionCardSub, rtlText]}>
                  {beacon.placeName} · active now
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))
        ) : (
          <Text style={[styles.emptyInline, rtlText]}>
            No live beacons yet. Check in to let nearby dog owners know you are around.
          </Text>
        )}
      </View>
      {DEMO_PARKS.map((park) => {
        const checkedIn = !!parkCheckins[park.id];
        return (
          <View key={park.id} style={styles.card}>
            <View style={[styles.cardRow, rtlRow]}>
              <View style={styles.iconBubble}>
                <Ionicons name="leaf-outline" size={19} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionCardTitle, rtlText]}>{park.name}</Text>
                <Text style={[styles.sectionCardSub, rtlText]}>
                  {park.distance} · {park.rating.toFixed(1)} rating · {park.activity} activity
                </Text>
              </View>
            </View>
            <View style={[styles.metaWrap, { flexDirection: appRowDirection }]}>
              {park.amenities.map((amenity) => (
                <Text key={amenity} style={styles.metaPill}>{amenity}</Text>
              ))}
            </View>
            <Text style={[styles.sectionCardSub, rtlText]}>
              {park.activeDogs + (checkedIn ? 1 : 0)} active dogs now · {park.upcomingPlaydates} upcoming playdates · {park.recentPosts} recent posts
            </Text>
            <View style={[styles.actionBar, rtlRow]}>
              <Pressable
                onPress={() => (checkedIn ? handleRemoveBeacon() : handleParkCheckIn(park))}
                disabled={checkingInPark?.id === park.id}
                style={[styles.primarySmallBtn, checkingInPark?.id === park.id && { opacity: 0.6 }]}
              >
                <Text style={styles.primarySmallText}>
                  {checkedIn ? "Remove check-in" : "Check in"}
                </Text>
              </Pressable>
              <Pressable onPress={() => setSelectedPark(park)} style={styles.smallOutlineBtn}>
                <Text style={styles.smallOutlineText}>View park</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setNewPlaydateLocation(park.name);
                  setPlaydateModalOpen(true);
                }}
                style={styles.smallOutlineBtn}
              >
                <Text style={styles.smallOutlineText}>Create playdate</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderGroups = () => (
    <View style={{ flex: 1 }}>
      {renderTopTabs()}
      <SectionHeader
        title="Community Groups"
        subtitle="Find local interests, advice, breed groups and support circles."
        actionLabel={isAdmin ? "Create Group" : undefined}
        onAction={isAdmin ? () => setCreateModalOpen(true) : undefined}
      />
      <View style={styles.searchCard}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, rtlInput]}
          value={groupSearch}
          onChangeText={setGroupSearch}
          placeholder="Search groups"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      {groupsLoading && groups.length === 0 ? (
        <ListSkeleton rows={5} variant="card" />
      ) : (
        <FlatList
          data={filteredGroups}
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
      )}
    </View>
  );

  const renderQuestions = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshFeed} tintColor={colors.text} colors={[colors.text]} />}
      contentContainerStyle={{ paddingBottom: 130 }}
    >
      {renderTopTabs()}
      <SectionHeader
        title="Q&A / Recommendations"
        subtitle="Ask local dog owners for trainers, sitters, food and behavior advice."
        actionLabel="Ask Question"
        onAction={() => {
          setNewPostType("Question");
          setComposerOpen(true);
        }}
      />
      {(questionPosts.length > 0 ? questionPosts : DEMO_POSTS.filter((p) => p.category === "question")).map((post) => (
        <View key={post.id} style={styles.card}>
          <Text style={[styles.sectionCardTitle, rtlText]}>{post.content}</Text>
          <Text style={[styles.sectionCardSub, rtlText]}>
            Asked by {post.userName} · {post.commentCount} answers
          </Text>
          <View style={[styles.metaWrap, { flexDirection: appRowDirection }]}>
            <Text style={styles.metaPill}>Training</Text>
            <Text style={styles.metaPill}>Best answer pending</Text>
            <Text style={styles.metaPill}>Helpful {post.likeCount}</Text>
          </View>
          <View style={[styles.actionBar, rtlRow]}>
            <Pressable onPress={() => showGlobalAlertCompat("Answer", "Use the comments button on the feed post to answer.")}
              style={styles.primarySmallBtn}>
              <Text style={styles.primarySmallText}>Answer</Text>
            </Pressable>
            <Pressable onPress={() => handleToggleLike(post.id)} style={styles.smallOutlineBtn}>
              <Text style={styles.smallOutlineText}>Helpful</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderEvents = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={playdatesLoading} onRefresh={loadPlaydates} tintColor={colors.text} colors={[colors.text]} />}
      contentContainerStyle={{ paddingBottom: 130 }}
    >
      {renderTopTabs()}
      <SectionHeader
        title="Events / Local Activities"
        subtitle="Weekend walks, puppy socials, adoption days and workshops."
        actionLabel="Create Playdate"
        onAction={() => setPlaydateModalOpen(true)}
      />
      {events.map((event) => (
        <View key={event.id} style={styles.card}>
          <View style={[styles.cardRow, rtlRow]}>
            <View style={styles.iconBubble}>
              <Ionicons name="sparkles-outline" size={19} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionCardTitle, rtlText]}>{event.name}</Text>
              <Text style={[styles.sectionCardSub, rtlText]}>
                {event.organizer} · {formatDateTime(event.dateTime)}
              </Text>
            </View>
          </View>
          <Text style={[styles.contentText, rtlText]}>{event.description}</Text>
          <View style={[styles.metaWrap, { flexDirection: appRowDirection }]}>
            <Text style={styles.metaPill}>{event.location}</Text>
            <Text style={styles.metaPill}>{event.price}</Text>
            <Text style={styles.metaPill}>{event.spotsLeft} spots left</Text>
            <Text style={styles.metaPill}>{event.attendingDogs} dogs attending</Text>
          </View>
          <Pressable onPress={() => handleJoinEvent(event.id)} style={event.joined ? styles.smallOutlineBtn : styles.primarySmallBtn}>
            <Text style={event.joined ? styles.smallOutlineText : styles.primarySmallText}>
              {event.joined ? "Joined" : "Join event"}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );

  const SectionHeader = ({
    title,
    subtitle,
    actionLabel,
    onAction,
  }: {
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      <BrandedAppHeader />

      {mainTab === "feed" ? (        loading && posts.length === 0 ? (
          <>
            {renderFeedHeader()}
            <ListSkeleton rows={4} variant="card" />
          </>
        ) : (
          <View style={{ flex: 1 }}>
            {renderFeedHeader()}
            <FlatList
              style={{ flex: 1 }}
              data={filteredPosts}
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
                  meta={postMetaById[item.id]}
                  currentUserId={user?.id ?? null}
                  onToggleLike={handleToggleLike}
                  onDelete={handleDelete}
                  onHide={(id) => {
                    setHiddenPostIds((prev) => new Set(prev).add(id));
                    showGlobalAlertCompat("Post hidden", "This post was hidden from your feed.");
                  }}
                  onReport={() => showGlobalAlertCompat("Report received", "Thanks for helping keep PawSquare safe.")}
                  onBlock={(userId) => {
                    setBlockedUserIds((prev) => new Set(prev).add(userId));
                    showGlobalAlertCompat("User blocked", "Posts from this user are hidden locally.");
                  }}
                  onPlaydateComing={(post) => {
                    setPosts((prev) =>
                      prev.map((p) =>
                        p.id === post.id ? { ...p, likeCount: p.likeCount + 1, likedByMe: true } : p,
                      ),
                    );
                    showGlobalAlertCompat("You're coming", "Marked your interest for this playdate post.");
                  }}
                  rtlText={rtlText}
                  rtlRow={rtlRow}
                  isLikePending={!!likeBusy[item.id]}
                  isDeletePending={!!deleteBusy[item.id]}
                />
              )}
            />
          </View>
        )
      ) : mainTab === "playdates" ? (
        renderPlaydates()
      ) : mainTab === "parks" ? (
        renderParks()
      ) : mainTab === "groups" ? (
        renderGroups()
      ) : mainTab === "qa" ? (
        renderQuestions()
      ) : (
        renderEvents()
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

      <CreatePostModal
        visible={composerOpen}
        onClose={() => {
          setComposerOpen(false);
          setNewPostContent("");
          setPickedImageUri(null);
        }}
        colors={colors}
        styles={styles}
        rtlInput={rtlInput}
        isRTL={isRTL}
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
      />

      <CreatePlaydateModal
        visible={playdateModalOpen}
        onClose={() => setPlaydateModalOpen(false)}
        colors={colors}
        styles={styles}
        rtlInput={rtlInput}
        isRTL={isRTL}
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
      />

      <Modal
        visible={!!selectedPark}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPark(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedPark(null)}>
          <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
            {selectedPark && (
              <>
                <View style={styles.handle} />
                <Text style={[styles.modalTitle, rtlText]}>{selectedPark.name}</Text>
                <Text style={[styles.sectionCardSub, rtlText]}>
                  {selectedPark.distance} · {selectedPark.rating.toFixed(1)} rating · peak {selectedPark.peakHours}
                </Text>
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="map-outline" size={42} color={colors.textMuted} />
                  <Text style={styles.emptyInline}>Approximate park location</Text>
                </View>
                <View style={[styles.metaWrap, { flexDirection: appRowDirection }]}>
                  {selectedPark.amenities.map((amenity) => (
                    <Text key={amenity} style={styles.metaPill}>{amenity}</Text>
                  ))}
                </View>
                <Text style={[styles.contentText, rtlText]}>
                  {selectedPark.activeDogs} active dogs now, {selectedPark.upcomingPlaydates} upcoming playdates and {selectedPark.recentPosts} recent posts.
                </Text>
                <View style={[styles.actionBar, rtlRow]}>
                  <Pressable
                    onPress={() => {
                      setNewPlaydateLocation(selectedPark.name);
                      setSelectedPark(null);
                      setPlaydateModalOpen(true);
                    }}
                    style={styles.primarySmallBtn}
                  >
                    <Text style={styles.primarySmallText}>Create playdate</Text>
                  </Pressable>
                  <Pressable onPress={() => handleParkCheckIn(selectedPark)} style={styles.smallOutlineBtn}>
                    <Text style={styles.smallOutlineText}>Check in</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!dogProfilePet}
        transparent
        animationType="slide"
        onRequestClose={() => setDogProfilePet(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDogProfilePet(null)}>
          <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
            {dogProfilePet && (
              <>
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
                  {dogProfilePet.breed ?? "Dog"} · age {dogProfilePet.age}
                </Text>
                <View style={[styles.metaWrap, { justifyContent: "center" }]}>
                  <Text style={styles.metaPill}>Friendly</Text>
                  <Text style={styles.metaPill}>Medium energy</Text>
                  <Text style={styles.metaPill}>Favorite parks</Text>
                </View>
                <View style={[styles.actionBar, { justifyContent: "center" }]}>
                  <Pressable onPress={() => showGlobalAlertCompat("Invite", `Invite to play with ${dogProfilePet.name} opened.`)} style={styles.primarySmallBtn}>
                    <Text style={styles.primarySmallText}>Invite to play</Text>
                  </Pressable>
                  <Pressable onPress={() => showGlobalAlertCompat("Following", `You follow ${dogProfilePet.name} locally.`)} style={styles.smallOutlineBtn}>
                    <Text style={styles.smallOutlineText}>Follow</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!playdateCommentsOpenFor}
        transparent
        animationType="slide"
        onRequestClose={() => setPlaydateCommentsOpenFor(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPlaydateCommentsOpenFor(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardSheet}>
            <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />
              <Text style={[styles.modalTitle, rtlText]}>Playdate comments</Text>
              <Text style={[styles.emptyInline, rtlText]}>
                Comments are loaded in the event detail screen. Add a quick comment here for this session.
              </Text>
              <TextInput
                value={playdateCommentText}
                onChangeText={setPlaydateCommentText}
                placeholder="Write a comment"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, rtlInput]}
              />
              <Pressable
                onPress={async () => {
                  const content = playdateCommentText.trim();
                  if (!content || !playdateCommentsOpenFor) return;
                  try {
                    await playdatesApi.addComment(playdateCommentsOpenFor.id, content);
                    showGlobalAlertCompat("Comment added", "Your comment was posted.");
                  } catch {
                    showGlobalAlertCompat("Comment saved locally", "The API was unavailable, so this is local for now.");
                  }
                  setPlaydateCommentText("");
                  setPlaydateCommentsOpenFor(null);
                }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Post comment</Text>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

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

function CreatePostModal({
  visible,
  onClose,
  colors,
  styles,
  rtlInput,
  isRTL,
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
}: {
  visible: boolean;
  onClose: () => void;
  colors: any;
  styles: ReturnType<typeof getStyles>;
  rtlInput: object;
  isRTL: boolean;
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
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardSheet}>
          <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { textAlign: isRTL ? "right" : "left" }]}>Create Post</Text>
            <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Post type</Text>
              <View style={styles.modalChipWrap}>
                {POST_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setPostType(type)}
                    style={[styles.modalChip, postType === type && styles.modalChipActive]}
                  >
                    <Text style={[styles.modalChipText, postType === type && styles.modalChipTextActive]}>{type}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Dog</Text>
              <View style={styles.modalChipWrap}>
                {pets.length === 0 ? (
                  <Text style={styles.emptyInline}>No pets found yet.</Text>
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
                placeholder="What is happening in your dog community?"
                placeholderTextColor={colors.textMuted}
                multiline
                value={content}
                onChangeText={setContent}
                editable={!posting && !uploadingImage}
              />
              <TextInput
                style={[styles.input, rtlInput]}
                placeholder="Location or dog park"
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />
              <Text style={styles.label}>Visibility</Text>
              <View style={styles.modalChipWrap}>
                {VISIBILITY_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setVisibility(option)}
                    style={[styles.modalChip, visibility === option && styles.modalChipActive]}
                  >
                    <Text style={[styles.modalChipText, visibility === option && styles.modalChipTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={[styles.input, rtlInput]}
                placeholder="Tags, comma separated"
                placeholderTextColor={colors.textMuted}
                value={tags}
                onChangeText={setTags}
              />
              <View style={styles.mediaRow}>
                <Pressable disabled={posting || uploadingImage} onPress={handlePickPostImage} style={styles.smallOutlineBtn}>
                  <Text style={styles.smallOutlineText}>Add image/video placeholder</Text>
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
                <Text style={styles.composerCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handlePublish}
                disabled={posting || uploadingImage}
                style={[styles.publishBtn, (posting || uploadingImage) && { opacity: 0.5 }]}
              >
                {posting || uploadingImage ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.publishText}>Post to Community</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function CreatePlaydateModal({
  visible,
  onClose,
  colors,
  styles,
  rtlInput,
  isRTL,
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
}: {
  visible: boolean;
  onClose: () => void;
  colors: any;
  styles: ReturnType<typeof getStyles>;
  rtlInput: object;
  isRTL: boolean;
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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardSheet}>
          <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { textAlign: isRTL ? "right" : "left" }]}>Create Playdate</Text>
            <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
              <TextInput style={[styles.input, rtlInput]} placeholder="Title" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
              <Text style={styles.label}>Dog</Text>
              <View style={styles.modalChipWrap}>
                {pets.map((pet) => (
                  <Pressable key={pet.id} onPress={() => setSelectedPetId(pet.id)} style={[styles.modalChip, selectedPetId === pet.id && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, selectedPetId === pet.id && styles.modalChipTextActive]}>{pet.name}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.twoCol}>
                <TextInput style={[styles.input, styles.colInput, rtlInput]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} value={date} onChangeText={setDate} />
                <TextInput style={[styles.input, styles.colInput, rtlInput]} placeholder="HH:mm" placeholderTextColor={colors.textMuted} value={time} onChangeText={setTime} />
              </View>
              <TextInput style={[styles.input, rtlInput]} placeholder="Location / dog park" placeholderTextColor={colors.textMuted} value={location} onChangeText={setLocation} />
              <Text style={styles.label}>Dog size suitability</Text>
              <View style={styles.modalChipWrap}>
                {(["Small", "Medium", "Large", "All"] as DogSizeSuitability[]).map((option) => (
                  <Pressable key={option} onPress={() => setSize(option)} style={[styles.modalChip, size === option && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, size === option && styles.modalChipTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Dog age suitability</Text>
              <View style={styles.modalChipWrap}>
                {["Puppies", "Adults", "Seniors", "All"].map((option) => (
                  <Pressable key={option} onPress={() => setAge(option)} style={[styles.modalChip, age === option && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, age === option && styles.modalChipTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Energy level</Text>
              <View style={styles.modalChipWrap}>
                {(["Calm", "Medium", "High"] as EnergyLevel[]).map((option) => (
                  <Pressable key={option} onPress={() => setEnergy(option)} style={[styles.modalChip, energy === option && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, energy === option && styles.modalChipTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput style={[styles.input, rtlInput]} placeholder="Max participants" placeholderTextColor={colors.textMuted} value={maxParticipants} onChangeText={setMaxParticipants} keyboardType="number-pad" />
              <TextInput style={[styles.input, styles.textArea, rtlInput]} placeholder="Description" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline />
              <Pressable onPress={() => setRequiresApproval(!requiresApproval)} style={styles.checkRow}>
                <Ionicons name={requiresApproval ? "checkbox" : "square-outline"} size={20} color={colors.text} />
                <Text style={styles.checkText}>Requires organizer approval</Text>
              </Pressable>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable onPress={onClose} style={styles.composerCancel}>
                <Text style={styles.composerCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onCreate} disabled={creating} style={[styles.publishBtn, creating && { opacity: 0.5 }]}>
                {creating ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={styles.publishText}>Create Playdate</Text>}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    topTabsContent: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
      gap: 8,
    },
    topTab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      borderWidth: 1,
    },
    topTabActive: {
      backgroundColor: colors.text,
      borderColor: colors.text,
    },
    topTabInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    topTabText: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.textSecondary,
    },
    topTabTextActive: {
      color: colors.textInverse,
    },
    hero: {
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: 24,
      padding: 18,
      backgroundColor: colors.text,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.16,
      shadowRadius: 22,
      elevation: 7,
    },
    heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    heroTitle: { color: colors.textInverse, fontSize: 28, fontWeight: "900" },
    heroSubtitle: { color: "rgba(255,255,255,0.82)", fontSize: 14, marginTop: 3 },
    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    privacyNote: {
      color: "rgba(255,255,255,0.72)",
      fontSize: 12,
      marginTop: 14,
      lineHeight: 17,
    },
    searchCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    filterContent: {
      paddingHorizontal: 16,
      paddingTop: 10,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
    },
    chipActive: { backgroundColor: colors.text, borderColor: colors.text },
    chipInactive: { backgroundColor: colors.surface, borderColor: colors.border },
    chipText: { fontSize: 12, fontWeight: "800" },
    chipTextActive: { color: colors.textInverse },
    chipTextInactive: { color: colors.textSecondary },
    demoBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 10,
      padding: 10,
      borderRadius: 14,
      backgroundColor: colors.primaryLight,
    },
    demoBannerText: { flex: 1, color: colors.primary, fontSize: 12, fontWeight: "700" },
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
    kindBadge: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
    },
    kindBadgeText: { color: colors.text, fontSize: 10, fontWeight: "800" },
    timeText: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    contentText: { fontSize: 15, color: colors.text, lineHeight: 22, marginTop: 12 },
    dogMiniCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 10,
      borderRadius: 14,
      backgroundColor: colors.surfaceTertiary,
      marginTop: 12,
    },
    dogAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.text,
      alignItems: "center",
      justifyContent: "center",
    },
    dogName: { color: colors.text, fontSize: 14, fontWeight: "800" },
    dogSubtle: { color: colors.textMuted, fontSize: 12 },
    dogProfileRail: {
      gap: 10,
      paddingTop: 12,
    },
    dogProfileCard: {
      width: 116,
      padding: 12,
      borderRadius: 18,
      backgroundColor: colors.surfaceTertiary,
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignItems: "center",
    },
    dogProfileAvatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      overflow: "hidden",
      backgroundColor: colors.text,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    dogProfileName: { color: colors.text, fontSize: 14, fontWeight: "900" },
    dogProfileSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
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
    playdateInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.primaryLight,
      marginTop: 12,
    },
    inlineTitle: { fontSize: 14, fontWeight: "900", color: colors.text },
    inlineSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    menu: {
      alignSelf: "flex-end",
      marginTop: 10,
      borderRadius: 14,
      backgroundColor: colors.surfaceTertiary,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    menuText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
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
    quickActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    quickActionPrimary: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.text,
      paddingVertical: 13,
      borderRadius: 14,
    },
    quickActionPrimaryText: { color: colors.textInverse, fontSize: 14, fontWeight: "900" },
    quickActionSecondary: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primaryLight,
      paddingVertical: 13,
      borderRadius: 14,
    },
    quickActionSecondaryText: { color: colors.text, fontSize: 14, fontWeight: "900" },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 4,
    },
    sectionTitle: { color: colors.text, fontSize: 22, fontWeight: "900" },
    sectionSubtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
    sectionCardTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
    sectionCardSub: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
    iconBubble: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    metaWrap: {
      flexDirection: "row",
      gap: 7,
      flexWrap: "wrap",
      marginTop: 12,
    },
    metaPill: {
      overflow: "hidden",
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    primarySmallBtn: {
      backgroundColor: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 12,
      alignSelf: "flex-start",
    },
    primarySmallText: { color: colors.textInverse, fontSize: 12, fontWeight: "900" },
    smallOutlineBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 12,
      alignSelf: "flex-start",
    },
    smallOutlineText: { color: colors.text, fontSize: 12, fontWeight: "800" },
    rsvpButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
    },
    rsvpButtonActive: { backgroundColor: colors.text },
    rsvpText: { color: colors.textSecondary, fontSize: 12, fontWeight: "800" },
    rsvpTextActive: { color: colors.textInverse },
    liveBeaconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingTop: 12,
    },
    liveDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.success,
    },
    emptyInline: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 10 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    keyboardSheet: { flex: 1, justifyContent: "flex-end" },
    detailSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      padding: 20,
      paddingBottom: 34,
      maxHeight: "88%",
    },
    handle: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 16,
    },
    modalTitle: { color: colors.text, fontSize: 22, fontWeight: "900", marginBottom: 12 },
    label: { color: colors.textSecondary, fontSize: 13, fontWeight: "800", marginTop: 12, marginBottom: 8 },
    input: {
      backgroundColor: colors.surfaceTertiary,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
      marginTop: 10,
    },
    textArea: { minHeight: 96, textAlignVertical: "top" },
    modalChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    modalChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    modalChipActive: { backgroundColor: colors.text, borderColor: colors.text },
    modalChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: "800" },
    modalChipTextActive: { color: colors.textInverse },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 10,
      marginTop: 14,
    },
    mediaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
    twoCol: { flexDirection: "row", gap: 10 },
    colInput: { flex: 1 },
    checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
    checkText: { color: colors.text, fontSize: 14, fontWeight: "700" },
    mapPlaceholder: {
      height: 140,
      borderRadius: 18,
      backgroundColor: colors.surfaceTertiary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    largeDogAvatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      overflow: "hidden",
      backgroundColor: colors.text,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: 12,
    },
    primaryBtn: {
      backgroundColor: colors.text,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 14,
    },
    primaryBtnText: { color: colors.textInverse, fontSize: 15, fontWeight: "900" },
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
