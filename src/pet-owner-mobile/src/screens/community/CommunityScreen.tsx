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
  type KeyboardAvoidingViewProps,
  Share,
  StatusBar,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { useAuthStore } from "../../store/authStore";
import { usePetsStore } from "../../store/petsStore";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { AuthPlaceholder } from "../../components/AuthPlaceholder";
import { BrandedAppHeader } from "../../components/BrandedAppHeader";
import { DatePickerField } from "../../components/DatePickerField";
import { ListSkeleton, ListEmptyState } from "../../components/shared";
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
  CommunityGroupDto,
  PlaydateEventDto,
  LiveBeaconDto,
  PetDto,
  RsvpStatusValue,
} from "../../types/api";
import { pickImageWithSource } from "../../utils/imagePicker";
import { formatBreedForDisplay } from "../pets/addPetHelpers";
import { fetchNearbyDogParks, geocodeAddress } from "../../api/googlePlaces";
import { useKeyboardAvoidingState } from "../../hooks/useKeyboardAvoidingState";

const PAGE_SIZE = 20;

type MainTab = "feed" | "playdates" | "parks" | "groups" | "qa" | "events";
type FeedFilter =
  | "Nearby"
  | "Playdates"
  | "Questions"
  | "Recommendations"
  | "Dog Parks"
  | "Lost & Found"
  | "Events"
  | "Groups";
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
  placeId?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  distance: string;
  rating: number;
  activity: "Low" | "Medium" | "High";
  amenities: string[];
  activeDogs: number;
  upcomingPlaydates: number;
  recentPosts: number;
  peakHours: string;
}

const FEED_FILTERS: FeedFilter[] = [
  "Nearby",
  "Playdates",
  "Questions",
  "Recommendations",
  "Dog Parks",
  "Lost & Found",
  "Events",
  "Groups",
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
    location: "פארק הירקון",
    dogName: "מיקה",
    visibility: "Nearby only",
    tags: ["evening", "friendly"],
    isDemo: true,
  },
  "demo-post-2": {
    kind: "Question",
    location: "תל אביב",
    dogName: "במבה",
    visibility: "Public",
    tags: ["training"],
    isDemo: true,
  },
  "demo-post-3": {
    kind: "Recommendation",
    location: "גינת דובנוב",
    visibility: "Public",
    tags: ["dog-park"],
    isDemo: true,
  },
  "demo-post-4": {
    kind: "Playdate",
    location: "גן מאיר",
    dogName: "לונה",
    visibility: "Nearby only",
    tags: ["small-dogs"],
    isDemo: true,
  },
  "demo-post-5": {
    kind: "Lost & Found",
    location: "דיזנגוף סנטר",
    visibility: "Public",
    tags: ["lost-dog"],
    isDemo: true,
  },
};

const DEMO_POSTS: PostDto[] = [
  {
    id: "demo-post-1",
    userId: "demo-user-mika",
    userName: "מיקה ונועה",
    content: "מיקה מחפשת חברים למשחק היום בגינת פארק הירקון בשעה 18:30. מי מצטרף?",
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
    userName: "עמית כהן",
    content: "מישהו מכיר מאלף טוב ללברדור אנרגטי באזור תל אביב?",
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
    userName: "חברי גינת דובנוב",
    content: "עדכון מגינת דובנוב: הברזייה חזרה לעבוד.",
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
    userName: "מפגש לונה",
    content: "מחפשים מפגש כלבים קטנים ביום שישי.",
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
    userName: "התראת קהילה",
    content: "כלב אבד באזור דיזנגוף סנטר, אשמח לעזרה.",
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
    name: "גינת הכלבים פארק הירקון",
    address: "פארק הירקון, תל אביב",
    latitude: 32.1047,
    longitude: 34.8158,
    distance: "1.2 km",
    rating: 4.8,
    activity: "High",
    amenities: ["ברזייה", "צל", "גדר", "אזור לכלבים קטנים"],
    activeDogs: 8,
    upcomingPlaydates: 2,
    recentPosts: 6,
    peakHours: "17:30-20:00",
  },
  {
    id: "dubnov",
    name: "גינת דובנוב",
    address: "גינת דובנוב, תל אביב",
    latitude: 32.0744,
    longitude: 34.7831,
    distance: "2.4 km",
    rating: 4.5,
    activity: "Medium",
    amenities: ["ברזייה", "תאורה", "גדר"],
    activeDogs: 4,
    upcomingPlaydates: 1,
    recentPosts: 3,
    peakHours: "18:00-19:30",
  },
  {
    id: "gan-meir",
    name: "גן מאיר לכלבים קטנים",
    address: "גן מאיר, תל אביב",
    latitude: 32.0735,
    longitude: 34.7736,
    distance: "3.1 km",
    rating: 4.6,
    activity: "Low",
    amenities: ["צל", "אזור לכלבים קטנים", "גדר"],
    activeDogs: 2,
    upcomingPlaydates: 1,
    recentPosts: 2,
    peakHours: "16:00-18:00",
  },
];

const HE = {
  title: "הקהילה",
  subtitle: "הקהילה המקומית של הכלב שלך",
  privacy: "המיקום המדויק ישותף רק כאשר תבחר להצטרף או ליצור מפגש.",
  search: "חיפוש פוסטים, גינות וכלבים",
  createPost: "יצירת פוסט",
  createPlaydate: "קביעת מפגש",
  myDogs: "הכלבים שלי",
  noPets: "עדיין אין כלבים להצגה.",
  feed: "פיד",
  playdates: "מפגשים",
  parks: "גינות כלבים",
  groups: "קבוצות",
  qa: "שאלות ותשובות",
  events: "אירועים",
  nearby: "קרוב אליי",
  questions: "שאלות",
  recommendations: "המלצות",
  lostFound: "אבדות ומציאות",
  coming: "אני מגיע",
  like: "אהבתי",
  comment: "תגובה",
  share: "שיתוף",
  follow: "עקוב",
  invite: "הזמן למשחק",
  checkIn: "אני כאן",
  removeCheckIn: "הסר צ'ק-אין",
  viewPark: "צפה בגינה",
  hidePost: "הסתר פוסט",
  reportPost: "דווח על פוסט",
  blockUser: "חסום משתמש",
  provider: "נותן שירות",
  demoBanner: "מוצגת פעילות לדוגמה עד שיהיו פוסטים אמיתיים.",
  apiFallback: "הפיד אינו זמין כרגע, לכן מוצגים פוסטים לדוגמה.",
  localDogProfile: "פרופיל כלב מקומי",
  communityPlaydate: "מפגש קהילתי",
  interested: "מתעניינים",
  posted: "הפוסט פורסם",
  postedDesc: "הפוסט שלך עלה לקהילה.",
  savedLocal: "נשמר מקומית",
  savedLocalPost: "ה-API לא זמין, לכן הפוסט יוצג רק בסשן הנוכחי.",
  postNeedsContent: "צריך תוכן לפוסט",
  postNeedsContentDesc: "כתוב משהו או צרף תמונה לפני הפרסום.",
  locationRecommended: "מומלץ להוסיף מיקום",
  locationRecommendedDesc: "פוסט אבדות ומציאות עובד טוב יותר עם אזור משוער.",
  tip: "טיפ",
  playdateTip: "לפרטי RSVP מלאים, כדאי להשתמש גם בקביעת מפגש.",
  deletePost: "למחוק פוסט?",
  cancel: "ביטול",
  delete: "מחיקה",
  postHidden: "הפוסט הוסתר",
  postHiddenDesc: "הפוסט הוסר מהפיד שלך.",
  reportReceived: "הדיווח התקבל",
  reportReceivedDesc: "תודה שעזרת לשמור על הקהילה בטוחה.",
  userBlocked: "המשתמש נחסם",
  userBlockedDesc: "פוסטים מהמשתמש הזה מוסתרים מקומית.",
  youAreComing: "סימנו שאתה מגיע",
  youAreComingDesc: "העניין שלך במפגש נשמר.",
  dogPlaydatesTitle: "מפגשי כלבים",
  dogPlaydatesSub: "תאם מפגשים מקומיים והצטרף עם הכלב שלך.",
  noPlaydates: "אין מפגשים עדיין",
  noPlaydatesSub: "אפשר ליצור את המפגש הראשון לכלבים באזור.",
  openPlaydate: "מפגש פתוח לכלבים חברותיים מהאזור.",
  allSizes: "כל הגדלים",
  going: "מגיעים",
  maybe: "אולי",
  notGoing: "לא מגיע",
  comments: "תגובות",
  parksTitle: "גינות כלבים / פעילים עכשיו",
  parksSub: "ראה צ'ק-אינים חיים וגלה פעילות ידידותית בגינות.",
  activeNow: "פעילים עכשיו",
  noBeacons: "אין צ'ק-אינים כרגע. אפשר לסמן שאתה כאן כדי שבעלי כלבים באזור ידעו.",
  activeNowShort: "פעיל עכשיו",
  rating: "דירוג",
  activity: "פעילות",
  activeDogsNow: "כלבים פעילים עכשיו",
  upcomingPlaydates: "מפגשים קרובים",
  recentPosts: "פוסטים אחרונים",
  createPlaydateInPark: "קבע מפגש",
  groupsTitle: "קבוצות קהילה",
  groupsSub: "מצא תחומי עניין, המלצות, קבוצות גזע ותמיכה.",
  searchGroups: "חיפוש קבוצות",
  joined: "הצטרפת",
  joinGroup: "הצטרף",
  groupUpdated: "הקבוצה עודכנה",
  groupUpdatedDesc: "החברות מוצגת מקומית עד שתתווסף תמיכת שרת.",
  qaTitle: "שאלות ותשובות / המלצות",
  qaSub: "שאל בעלי כלבים באזור על מאלפים, דוגסיטרים, אוכל והתנהגות.",
  askQuestion: "שאל שאלה",
  askedBy: "נשאל על ידי",
  answers: "תשובות",
  training: "אילוף",
  bestAnswerPending: "תשובה מומלצת ממתינה",
  helpful: "מועיל",
  answer: "ענה",
  answerHint: "אפשר לענות דרך כפתור התגובות בפוסט.",
  eventsTitle: "אירועים ופעילויות",
  eventsSub: "טיולי סוף שבוע, מפגשי גורים, ימי אימוץ וסדנאות.",
  spotsLeft: "מקומות נותרו",
  dogsAttending: "כלבים משתתפים",
  joinEvent: "הצטרף לאירוע",
  eventUpdated: "האירוע עודכן",
  eventUpdatedDesc: "ההצטרפות נשמרה מקומית.",
  createPostTitle: "יצירת פוסט",
  postType: "סוג פוסט",
  dog: "כלב",
  whatHappening: "מה קורה בקהילת הכלבים שלך?",
  locationOrPark: "מיקום או גינת כלבים",
  visibility: "פרטיות",
  tags: "תגיות, מופרדות בפסיקים",
  addMedia: "הוסף תמונה / וידאו",
  publishPost: "פרסם בקהילה",
  createPlaydateTitle: "קביעת מפגש",
  titleField: "כותרת",
  dateField: "YYYY-MM-DD",
  timeField: "HH:mm",
  sizeFit: "התאמת גודל",
  ageFit: "התאמת גיל",
  energyLevel: "רמת אנרגיה",
  maxParticipants: "מספר משתתפים מקסימלי",
  description: "תיאור",
  requiresApproval: "דורש אישור מארגן",
  missingDetails: "חסרים פרטים",
  missingDetailsDesc: "כותרת, תאריך, שעה ומיקום הם שדות חובה.",
  invalidDate: "תאריך לא תקין",
  invalidDateDesc: "יש להזין תאריך בפורמט YYYY-MM-DD ושעה בפורמט HH:mm.",
  futureTime: "בחר זמן עתידי",
  futureTimeDesc: "אי אפשר ליצור מפגש בעבר.",
  playdateCreated: "המפגש נוצר",
  playdateCreatedDesc: "בעלי כלבים יכולים להצטרף עכשיו.",
  playdateSavedLocal: "ה-API לא זמין, לכן המפגש מוצג רק בסשן הנוכחי.",
  checkedIn: "סימנת שאתה כאן",
  checkedInDesc: "סימנת שאתה כאן עם הכלב שלך.",
  checkedInLocal: "הצ'ק-אין נשמר מקומית",
  checkedInLocalDesc: "Beacon API לא זמין, לכן הצ'ק-אין מקומי.",
  checkInRemoved: "הצ'ק-אין הוסר",
  parkLocation: "מיקום גינה משוער",
  peak: "שעות עומס",
  playdateComments: "תגובות למפגש",
  commentsHint: "תגובות מלאות נטענות במסך פרטי המפגש. אפשר להוסיף כאן תגובה קצרה לסשן.",
  writeComment: "כתיבת תגובה",
  postComment: "פרסם תגובה",
  commentAdded: "התגובה נוספה",
  commentAddedDesc: "התגובה פורסמה.",
  commentLocal: "התגובה נשמרה מקומית",
  commentLocalDesc: "ה-API לא זמין, לכן התגובה מקומית כרגע.",
  inviteOpened: "הזמנה למשחק נפתחה",
  following: "עקיבה",
  followingDesc: "העקיבה נשמרה מקומית.",
  invited: "הוזמן",
  followed: "עוקב",
} as const;

const EN: Record<keyof typeof HE, string> = {
  title: "Community",
  subtitle: "Your local dog community",
  privacy: "Exact location is only shared when you choose to join or create a playdate.",
  search: "Search posts, parks and dogs",
  createPost: "Create Post",
  createPlaydate: "Create Playdate",
  myDogs: "My dogs",
  noPets: "No dogs to show yet.",
  feed: "Feed",
  playdates: "Playdates",
  parks: "Dog Parks",
  groups: "Groups",
  qa: "Q&A",
  events: "Events",
  nearby: "Nearby",
  questions: "Questions",
  recommendations: "Recommendations",
  lostFound: "Lost & Found",
  coming: "I'm coming",
  like: "Like",
  comment: "Comment",
  share: "Share",
  follow: "Follow",
  invite: "Invite to play",
  checkIn: "Check in",
  removeCheckIn: "Remove check-in",
  viewPark: "View park",
  hidePost: "Hide post",
  reportPost: "Report post",
  blockUser: "Block user",
  provider: "Provider",
  demoBanner: "Showing demo community activity until real posts are available.",
  apiFallback: "Feed API is unavailable, so fallback posts are shown for this session.",
  localDogProfile: "Friendly local dog profile",
  communityPlaydate: "Community playdate",
  interested: "interested",
  posted: "Posted",
  postedDesc: "Your post is live in the community.",
  savedLocal: "Saved locally",
  savedLocalPost: "The API was unavailable, so this post is visible in this session.",
  postNeedsContent: "Post needs content",
  postNeedsContentDesc: "Write something or attach an image before publishing.",
  locationRecommended: "Location recommended",
  locationRecommendedDesc: "Lost & Found posts work best with an approximate area.",
  tip: "Tip",
  playdateTip: "For full RSVP details, use Create Playdate too.",
  deletePost: "Delete post?",
  cancel: "Cancel",
  delete: "Delete",
  postHidden: "Post hidden",
  postHiddenDesc: "This post was hidden from your feed.",
  reportReceived: "Report received",
  reportReceivedDesc: "Thanks for helping keep PawSquare safe.",
  userBlocked: "User blocked",
  userBlockedDesc: "Posts from this user are hidden locally.",
  youAreComing: "You're coming",
  youAreComingDesc: "Marked your interest for this playdate post.",
  dogPlaydatesTitle: "Dog Playdates",
  dogPlaydatesSub: "Coordinate local meetups and RSVP with your dog.",
  noPlaydates: "No playdates yet",
  noPlaydatesSub: "Create the first meetup for dogs nearby.",
  openPlaydate: "Open dog playdate for friendly local dogs.",
  allSizes: "All sizes",
  going: "Going",
  maybe: "Maybe",
  notGoing: "Not going",
  comments: "Comments",
  parksTitle: "Dog Parks / Live Nearby",
  parksSub: "See live check-ins and discover friendly park activity.",
  activeNow: "Active now",
  noBeacons: "No live beacons yet. Check in to let nearby dog owners know you are around.",
  activeNowShort: "active now",
  rating: "rating",
  activity: "activity",
  activeDogsNow: "active dogs now",
  upcomingPlaydates: "upcoming playdates",
  recentPosts: "recent posts",
  createPlaydateInPark: "Create playdate",
  groupsTitle: "Community Groups",
  groupsSub: "Find local interests, advice, breed groups and support circles.",
  searchGroups: "Search groups",
  joined: "Joined",
  joinGroup: "Join",
  groupUpdated: "Group updated",
  groupUpdatedDesc: "Membership is reflected locally until backend join support is added.",
  qaTitle: "Q&A / Recommendations",
  qaSub: "Ask local dog owners for trainers, sitters, food and behavior advice.",
  askQuestion: "Ask Question",
  askedBy: "Asked by",
  answers: "answers",
  training: "Training",
  bestAnswerPending: "Best answer pending",
  helpful: "Helpful",
  answer: "Answer",
  answerHint: "Use the comments button on the feed post to answer.",
  eventsTitle: "Events / Local Activities",
  eventsSub: "Weekend walks, puppy socials, adoption days and workshops.",
  spotsLeft: "spots left",
  dogsAttending: "dogs attending",
  joinEvent: "Join event",
  eventUpdated: "Event updated",
  eventUpdatedDesc: "Your event RSVP is saved locally.",
  createPostTitle: "Create Post",
  postType: "Post type",
  dog: "Dog",
  whatHappening: "What is happening in your dog community?",
  locationOrPark: "Location or dog park",
  visibility: "Visibility",
  tags: "Tags, comma separated",
  addMedia: "Add image/video placeholder",
  publishPost: "Post to Community",
  createPlaydateTitle: "Create Playdate",
  titleField: "Title",
  dateField: "YYYY-MM-DD",
  timeField: "HH:mm",
  sizeFit: "Dog size suitability",
  ageFit: "Dog age suitability",
  energyLevel: "Energy level",
  maxParticipants: "Max participants",
  description: "Description",
  requiresApproval: "Requires organizer approval",
  missingDetails: "Missing details",
  missingDetailsDesc: "Title, date, time and location are required.",
  invalidDate: "Invalid date",
  invalidDateDesc: "Use date as YYYY-MM-DD and time as HH:mm.",
  futureTime: "Choose a future time",
  futureTimeDesc: "Playdates cannot be created in the past.",
  playdateCreated: "Playdate created",
  playdateCreatedDesc: "Dog owners can RSVP now.",
  playdateSavedLocal: "The API was unavailable, so this playdate is visible in this session.",
  checkedIn: "Checked in",
  checkedInDesc: "You checked in with your dog.",
  checkedInLocal: "Checked in locally",
  checkedInLocalDesc: "Beacon API was unavailable, so this check-in is local.",
  checkInRemoved: "Check-in removed",
  parkLocation: "Approximate park location",
  peak: "peak",
  playdateComments: "Playdate comments",
  commentsHint: "Comments are loaded in the event detail screen. Add a quick comment here for this session.",
  writeComment: "Write a comment",
  postComment: "Post comment",
  commentAdded: "Comment added",
  commentAddedDesc: "Your comment was posted.",
  commentLocal: "Comment saved locally",
  commentLocalDesc: "The API was unavailable, so this is local for now.",
  inviteOpened: "Invite to play opened",
  following: "Following",
  followingDesc: "Follow saved locally.",
  invited: "Invited",
  followed: "Following",
};

type CopyKey = keyof typeof HE;

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

function formatDistanceKm(valueKm: number): string {
  if (!Number.isFinite(valueKm) || valueKm <= 0) return "0.1 km";
  return `${valueKm < 1 ? valueKm.toFixed(1) : valueKm.toFixed(1)} km`;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
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

function filterLabel(filter: FeedFilter, copy: (key: CopyKey) => string): string {
  switch (filter) {
    case "Nearby":
      return copy("nearby");
    case "Playdates":
      return copy("playdates");
    case "Questions":
      return copy("questions");
    case "Recommendations":
      return copy("recommendations");
    case "Dog Parks":
      return copy("parks");
    case "Lost & Found":
      return copy("lostFound");
    case "Events":
      return copy("events");
    case "Groups":
      return copy("groups");
  }
}

function filterIcon(filter: FeedFilter): keyof typeof Ionicons.glyphMap {
  switch (filter) {
    case "Nearby":
      return "navigate-outline";
    case "Playdates":
      return "calendar-outline";
    case "Questions":
      return "help-circle-outline";
    case "Recommendations":
      return "star-outline";
    case "Dog Parks":
      return "leaf-outline";
    case "Lost & Found":
      return "alert-circle-outline";
    case "Events":
      return "sparkles-outline";
    case "Groups":
      return "people-outline";
  }
}

function postKindLabel(kind: PostKind, isRTL: boolean): string {
  if (!isRTL) return kind;
  switch (kind) {
    case "Cute moment":
      return "רגע מתוק";
    case "Question":
      return "שאלה";
    case "Recommendation":
      return "המלצה";
    case "Playdate":
      return "מפגש";
    case "Warning":
      return "אזהרה";
    case "Lost & Found":
      return "אבדות ומציאות";
    case "Event":
      return "אירוע";
  }
}

function visibilityLabel(visibility: Visibility, isRTL: boolean): string {
  if (!isRTL) return visibility;
  switch (visibility) {
    case "Public":
      return "ציבורי";
    case "Nearby only":
      return "קרוב אליי";
    case "Friends only":
      return "חברים בלבד";
    case "Group only":
      return "קבוצה בלבד";
  }
}

function sizeLabel(size: DogSizeSuitability, isRTL: boolean): string {
  if (!isRTL) return size;
  switch (size) {
    case "Small":
      return "קטנים";
    case "Medium":
      return "בינוניים";
    case "Large":
      return "גדולים";
    case "All":
      return "כולם";
  }
}

function energyLabel(level: EnergyLevel, isRTL: boolean): string {
  if (!isRTL) return level;
  switch (level) {
    case "Calm":
      return "רגועה";
    case "Medium":
      return "בינונית";
    case "High":
      return "גבוהה";
  }
}

function ageLabel(age: string, isRTL: boolean): string {
  if (!isRTL) return age;
  const labels: Record<string, string> = {
    Puppies: "גורים",
    Adults: "בוגרים",
    Seniors: "מבוגרים",
    All: "כולם",
  };
  return labels[age] ?? age;
}

function activityLabel(activity: DogPark["activity"], isRTL: boolean): string {
  if (!isRTL) return activity;
  switch (activity) {
    case "Low":
      return "נמוכה";
    case "Medium":
      return "בינונית";
    case "High":
      return "גבוהה";
  }
}

function filterMatchesPost(filter: FeedFilter, post: PostDto, meta?: PostMeta): boolean {
  const kind = meta?.kind ?? categoryToKind(post.category);
  if (filter === "Nearby") return true;
  if (filter === "Groups") return true;
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
  isRTL,
  copy,
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
  isRTL: boolean;
  copy: (key: CopyKey) => string;
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
                <Text style={styles.providerBadgeText}>{copy("provider")}</Text>
              </View>
            )}
            <View style={[styles.kindBadge, kind === "Lost & Found" && styles.sosBadge]}>
              <Text style={styles.kindBadgeText}>{postKindLabel(kind, isRTL)}</Text>
            </View>
          </View>
          <Text style={styles.timeText}>
            {relativeTime(post.createdAt)}
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
}

function Chip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useCommunityStyles();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? colors.textInverse : colors.textSecondary}
      />
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CommunityScreen() {
  const navigation = useNavigation<any>();
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

  const [beacons, setBeacons] = useState<LiveBeaconDto[]>([]);
  const [beaconsLoading, setBeaconsLoading] = useState(false);
  const [myBeaconId, setMyBeaconId] = useState<string | null>(null);
  const [parks, setParks] = useState<DogPark[]>(DEMO_PARKS);
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

  useEffect(() => {
    if (!composerOpen) return;
    const id = setTimeout(() => composerInputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [composerOpen]);

  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? pets[0] ?? null;
  const appRowDirection = rowDirectionForAppLayout(isRTL);
  const bottomContentPadding = 16 + insets.bottom;

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
    await Promise.all([loadFeed(1, true), loadPets(), loadPlaydates()]);
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
      const cachedPets = usePetsStore.getState().pets;
      if (cachedPets.length > 0) {
        setPets(cachedPets);
        setSelectedPetId((current) => current ?? cachedPets[0]?.id ?? null);
      }
      await fetchStorePets();
      const currentStorePets = usePetsStore.getState().pets;
      const data = currentStorePets.length > 0 ? currentStorePets : await petsApi.getMyPets();
      setPets(data);
      setSelectedPetId((current) => current ?? data[0]?.id ?? null);
    } catch {}
  }, [fetchStorePets]);

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

  const loadDogParks = useCallback(async () => {
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
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } catch {
        // Keep Tel Aviv fallback when location is unavailable.
      }
      setParksUserLocation({ latitude, longitude });
      const nearby = await fetchNearbyDogParks({
        latitude,
        longitude,
        language: isRTL ? "he" : "en",
        radiusMeters: 8000,
      });
      if (nearby.length === 0) {
        setParks(DEMO_PARKS);
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
          distance: formatDistanceKm(km),
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
      setParks(DEMO_PARKS);
    } finally {
      setParksLoading(false);
    }
  }, [copy, isRTL]);

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
      if (!hydrated || !isLoggedIn) return;
      loadPets();
      if (mainTab === "feed" || mainTab === "qa") loadFeed(1, true);
      if (mainTab === "groups") loadGroups();
      if (mainTab === "playdates" || mainTab === "events") loadPlaydates();
      if (mainTab === "parks") {
        loadBeacons();
        loadDogParks();
      }
    }, [hydrated, isLoggedIn, mainTab, loadFeed, loadGroups, loadPets, loadPlaydates, loadBeacons, loadDogParks]),
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
      setPlaydateModalOpen(false);
      setNewPlaydateTitle("");
      setNewPlaydateLocation("");
      setNewPlaydateDescription("");
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
      setPlaydateModalOpen(false);
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
      const beacon = await palsApi.startBeacon({
        placeName: park.name,
        latitude: 32.0853,
        longitude: 34.7818,
        city: isRTL ? "תל אביב" : "Tel Aviv",
        durationMinutes: 60,
        petIds: selectedPet ? [selectedPet.id] : pets.map((p) => p.id),
        species: "DOG",
      });
      setMyBeaconId(beacon.id);
      setBeacons((prev) => [beacon, ...prev]);
      setParkCheckins((prev) => ({ ...prev, [park.id]: true }));
      showGlobalAlertCompat(copy("checkedIn"), copy("checkedInDesc"));
    } catch {
      setMyBeaconId(`local-beacon-${park.id}`);
      setParkCheckins((prev) => ({ ...prev, [park.id]: true }));
      showGlobalAlertCompat(copy("checkedInLocal"), copy("checkedInLocalDesc"));
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
      showGlobalAlertCompat(copy("checkInRemoved"), "");
    }
  };

  const handleJoinGroup = async (item: CommunityGroupDto) => {
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
  };

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

  if (!hydrated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
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

  const renderTopTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.categoryTabsScroll, { flexGrow: 0, flexShrink: 0 }]}
      contentContainerStyle={[
        styles.topTabsContent,
        { flexDirection: appRowDirection },
      ]}
    >
      {(["feed", "playdates", "parks", "groups", "qa", "events"] as MainTab[]).map((tab) => {
        const active = mainTab === tab;
        const label =
          tab === "feed"
            ? copy("feed")
            : tab === "playdates"
              ? copy("playdates")
              : tab === "parks"
                ? copy("parks")
                : tab === "groups"
                  ? copy("groups")
                  : tab === "qa"
                    ? copy("qa")
                    : copy("events");
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
            style={styles.topTab}
          >
            <View style={[styles.topTabCircle, active ? styles.topTabCircleActive : styles.topTabCircleInactive]}>
              <Ionicons
                name={icon as any}
                size={28}
                color={active ? colors.textInverse : colors.text}
              />
            </View>
            <Text style={[styles.topTabText, active ? styles.topTabTextActive : undefined]}>
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
        <View style={styles.heroIcon}>
          <Ionicons name="paw" size={24} color={colors.textInverse} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, rtlText]}>{copy("title")}</Text>
          <Text style={[styles.heroSubtitle, rtlText]}>{copy("subtitle")}</Text>
        </View>
      </View>
      <Text style={[styles.privacyNote, rtlText]}>
        {copy("privacy")}
      </Text>
    </View>
  );

  const renderFeedHeaderWithoutHero = () => (
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
      {feedIsDemo && (
        <View style={styles.demoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.demoBannerText, rtlText]}>
            {copy("demoBanner")}
          </Text>
        </View>
      )}
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
          <Pressable onPress={() => setPlaydateModalOpen(true)} style={[styles.quickActionSecondary, rtlRow]}>
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
    return <View style={{ height: bottomContentPadding }} />;
  };

  const renderGroupCard = ({ item }: { item: CommunityGroupDto }) => {
    const joined = item.joinedByMe ?? false;
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
            void handleJoinGroup(item);
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
            {joined ? copy("joined") : copy("joinGroup")}
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
        {event.description || copy("openPlaydate")}
      </Text>
      <View style={[styles.metaWrap, { flexDirection: appRowDirection }]}>
        <Text style={styles.metaPill}>{event.locationName}</Text>
        <Text style={styles.metaPill}>{copy("allSizes")}</Text>
        <Text style={styles.metaPill}>{event.goingCount} {copy("going")}</Text>
        {event.maxPets ? <Text style={styles.metaPill}>{copy("maxParticipants")} {event.maxPets}</Text> : null}
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
                {status === "Going" ? copy("going") : status === "Maybe" ? copy("maybe") : copy("notGoing")}
              </Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setPlaydateCommentsOpenFor(event)} style={[styles.actionBtn, rtlRow]}>
          <Ionicons name="chatbubble-outline" size={17} color={colors.textSecondary} />
          <Text style={styles.actionText}>{copy("comments")}</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderPlaydates = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={playdatesLoading} onRefresh={loadPlaydates} tintColor={colors.text} colors={[colors.text]} />}
      contentContainerStyle={{ paddingBottom: bottomContentPadding }}
    >
      <SectionHeader
        title={copy("dogPlaydatesTitle")}
        subtitle={copy("dogPlaydatesSub")}
        actionLabel={copy("createPlaydate")}
        onAction={() => setPlaydateModalOpen(true)}
      />
      {playdatesLoading && playdates.length === 0 ? (
        <ListSkeleton rows={3} variant="card" />
      ) : playdates.length > 0 ? (
        playdates.map(renderPlaydateCard)
      ) : (
        <ListEmptyState
          icon="calendar-outline"
          title={copy("noPlaydates")}
          message={copy("noPlaydatesSub")}
        />
      )}
    </ScrollView>
  );

  const renderParks = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={beaconsLoading || parksLoading}
          onRefresh={async () => {
            await Promise.all([loadBeacons(), loadDogParks()]);
          }}
          tintColor={colors.text}
          colors={[colors.text]}
        />
      }
      contentContainerStyle={{ paddingBottom: bottomContentPadding }}
    >
      <SectionHeader
        title={copy("parksTitle")}
        subtitle={copy("parksSub")}
        actionLabel={myBeaconId ? copy("removeCheckIn") : copy("checkIn")}
        onAction={myBeaconId ? handleRemoveBeacon : () => handleParkCheckIn(parks[0] ?? DEMO_PARKS[0])}
      />
      <View style={styles.card}>
        <Text style={[styles.sectionCardTitle, rtlText]}>{copy("activeNow")}</Text>
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
                  {beacon.placeName} · {copy("activeNowShort")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))
        ) : (
          <Text style={[styles.emptyInline, rtlText]}>
            {copy("noBeacons")}
          </Text>
        )}
      </View>
      {parksLoading && parks.length === 0 ? (
        <ListSkeleton rows={3} variant="card" />
      ) : parks.length > 0 ? (
        parks.map((park) => {
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
                  {park.distance} · {park.rating.toFixed(1)} {copy("rating")} · {activityLabel(park.activity, isRTL)} {copy("activity")}
                </Text>
              </View>
            </View>
            <View style={[styles.metaWrap, { flexDirection: appRowDirection }]}>
              {park.amenities.map((amenity) => (
                <Text key={amenity} style={styles.metaPill}>{amenity}</Text>
              ))}
            </View>
            <Text style={[styles.sectionCardSub, rtlText]}>
              {park.activeDogs + (checkedIn ? 1 : 0)} {copy("activeDogsNow")} · {park.upcomingPlaydates} {copy("upcomingPlaydates")} · {park.recentPosts} {copy("recentPosts")}
            </Text>
            <View style={[styles.actionBar, rtlRow]}>
              <Pressable
                onPress={() => (checkedIn ? handleRemoveBeacon() : handleParkCheckIn(park))}
                disabled={checkingInPark?.id === park.id}
                style={[styles.primarySmallBtn, checkingInPark?.id === park.id && { opacity: 0.6 }]}
              >
                <Text style={styles.primarySmallText}>
                  {checkedIn ? copy("removeCheckIn") : copy("checkIn")}
                </Text>
              </Pressable>
              <Pressable onPress={() => setSelectedPark(park)} style={styles.smallOutlineBtn}>
                <Text style={styles.smallOutlineText}>{copy("viewPark")}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setNewPlaydateLocation(park.name);
                  setPlaydateModalOpen(true);
                }}
                style={styles.smallOutlineBtn}
              >
                <Text style={styles.smallOutlineText}>{copy("createPlaydateInPark")}</Text>
              </Pressable>
            </View>
          </View>
        );
      })
      ) : (
        <ListEmptyState icon="leaf-outline" title={copy("parksTitle")} message={copy("noBeacons")} />
      )}
    </ScrollView>
  );

  const renderGroups = () => (
    <View style={{ flex: 1 }}>
      <SectionHeader
        title={copy("groupsTitle")}
        subtitle={copy("groupsSub")}
        actionLabel={isAdmin ? "Create Group" : undefined}
        onAction={isAdmin ? () => setCreateModalOpen(true) : undefined}
      />
      <View style={[styles.searchCard, { flexDirection: appRowDirection }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, rtlInput]}
          value={groupSearch}
          onChangeText={setGroupSearch}
          placeholder={copy("searchGroups")}
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
          contentContainerStyle={{ paddingBottom: bottomContentPadding }}
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
      contentContainerStyle={{ paddingBottom: bottomContentPadding }}
    >
      <SectionHeader
        title={copy("qaTitle")}
        subtitle={copy("qaSub")}
        actionLabel={copy("askQuestion")}
        onAction={() => {
          setNewPostType("Question");
          setComposerOpen(true);
        }}
      />
      {(questionPosts.length > 0 ? questionPosts : DEMO_POSTS.filter((p) => p.category === "question")).map((post) => (
        <View key={post.id} style={styles.card}>
          <Text style={[styles.sectionCardTitle, rtlText]}>{post.content}</Text>
          <Text style={[styles.sectionCardSub, rtlText]}>
            {copy("askedBy")} {post.userName} · {post.commentCount} {copy("answers")}
          </Text>
          <View style={[styles.metaWrap, { flexDirection: appRowDirection }]}>
            <Text style={styles.metaPill}>{copy("training")}</Text>
            <Text style={styles.metaPill}>{copy("bestAnswerPending")}</Text>
            <Text style={styles.metaPill}>{copy("helpful")} {post.likeCount}</Text>
          </View>
          <View style={[styles.actionBar, rtlRow]}>
            <Pressable onPress={() => setAnswerPost(post)}
              style={styles.primarySmallBtn}>
              <Text style={styles.primarySmallText}>{copy("answer")}</Text>
            </Pressable>
            <Pressable onPress={() => handleToggleLike(post.id)} style={styles.smallOutlineBtn}>
              <Text style={styles.smallOutlineText}>{copy("helpful")}</Text>
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
      contentContainerStyle={{ paddingBottom: bottomContentPadding }}
    >
      <SectionHeader
        title={copy("eventsTitle")}
        subtitle={copy("eventsSub")}
        actionLabel={copy("createPlaydate")}
        onAction={() => setPlaydateModalOpen(true)}
      />
      {playdatesLoading && playdates.length === 0 ? (
        <ListSkeleton rows={3} variant="card" />
      ) : playdates.length > 0 ? (
        playdates.map((event) => {
          const joined = event.myRsvpStatus === "Going";
          const spotsLeft = Math.max(0, (event.maxPets ?? event.goingCount) - event.goingCount);
          return (
            <View key={event.id} style={styles.card}>
              <View style={[styles.cardRow, rtlRow]}>
                <View style={styles.iconBubble}>
                  <Ionicons name="sparkles-outline" size={19} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionCardTitle, rtlText]}>{event.title}</Text>
                  <Text style={[styles.sectionCardSub, rtlText]}>
                    {event.hostUserName} · {formatDateTime(event.scheduledFor)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.contentText, rtlText]}>{event.description || copy("openPlaydate")}</Text>
              <View style={[styles.metaWrap, { flexDirection: appRowDirection }]}>
                <Text style={styles.metaPill}>{event.locationName}</Text>
                <Text style={styles.metaPill}>{event.maxPets ? `${event.maxPets} max` : copy("allSizes")}</Text>
                <Text style={styles.metaPill}>{spotsLeft} {copy("spotsLeft")}</Text>
                <Text style={styles.metaPill}>{event.goingCount} {copy("dogsAttending")}</Text>
              </View>
              <Pressable onPress={() => handleJoinEvent(event)} style={joined ? styles.smallOutlineBtn : styles.primarySmallBtn}>
                <Text style={joined ? styles.smallOutlineText : styles.primarySmallText}>
                  {joined ? copy("joined") : copy("joinEvent")}
                </Text>
              </Pressable>
            </View>
          );
        })
      ) : (
        <ListEmptyState
          icon="sparkles-outline"
          title={copy("noPlaydates")}
          message={copy("eventsSub")}
        />
      )}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, marginTop: 0 }} edges={["top"]}>
      <BrandedAppHeader style={{ paddingVertical: 6 }} />
      <View style={{ flex: 1, backgroundColor: colors.surface, overflow: "hidden" }}>
        {renderTopTabs()}
        {renderHero()}

        {mainTab === "feed" ? (        loading && posts.length === 0 ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: bottomContentPadding }}
            scrollEnabled={false}
          >
            {renderFeedHeaderWithoutHero()}
            <ListSkeleton rows={4} variant="card" />
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              style={{ flex: 1 }}
              data={filteredPosts}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={renderFeedHeaderWithoutHero}
              ListEmptyComponent={renderFeedEmpty}
              ListFooterComponent={renderFeedFooter}
              contentContainerStyle={{ paddingBottom: bottomContentPadding, flexGrow: 1 }}
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
                    showGlobalAlertCompat(copy("postHidden"), copy("postHiddenDesc"));
                  }}
                  onReport={() => showGlobalAlertCompat(copy("reportReceived"), copy("reportReceivedDesc"))}
                  onBlock={(userId) => {
                    setBlockedUserIds((prev) => new Set(prev).add(userId));
                    showGlobalAlertCompat(copy("userBlocked"), copy("userBlockedDesc"));
                  }}
                  onPlaydateComing={(post) => {
                    setPosts((prev) =>
                      prev.map((p) =>
                        p.id === post.id ? { ...p, likeCount: p.likeCount + 1, likedByMe: true } : p,
                      ),
                    );
                    showGlobalAlertCompat(copy("youAreComing"), copy("youAreComingDesc"));
                  }}
                  rtlText={rtlText}
                  rtlRow={rtlRow}
                  isRTL={isRTL}
                  copy={copy}
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
      </View>

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

      <CreatePlaydateModal
        visible={playdateModalOpen}
        onClose={() => setPlaydateModalOpen(false)}
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
      />

      <Modal
        visible={!!selectedPark}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPark(null)}
      >
        <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdropFill} onPress={() => setSelectedPark(null)} />
          <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
            {selectedPark && (
              <>
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
                      setPlaydateModalOpen(true);
                    }}
                    style={styles.primarySmallBtn}
                  >
                    <Text style={styles.primarySmallText}>{copy("createPlaydate")}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleParkCheckIn(selectedPark)} style={styles.smallOutlineBtn}>
                    <Text style={styles.smallOutlineText}>{copy("checkIn")}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </View>
      </Modal>

      <Modal
        visible={!!dogProfilePet}
        transparent
        animationType="slide"
        onRequestClose={() => setDogProfilePet(null)}
      >
        <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdropFill} onPress={() => setDogProfilePet(null)} />
          <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
            {dogProfilePet && (
              <>
                {(() => {
                  const invited = invitedPetIds.has(dogProfilePet.id);
                  const followed = followedPetIds.has(dogProfilePet.id);
                  return (
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
                    style={invited ? styles.smallOutlineBtn : styles.primarySmallBtn}
                  >
                    <Text style={invited ? styles.smallOutlineText : styles.primarySmallText}>
                      {invited ? copy("invited") : copy("invite")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleFollowPet(dogProfilePet)}
                    style={followed ? styles.primarySmallBtn : styles.smallOutlineBtn}
                  >
                    <Text style={followed ? styles.primarySmallText : styles.smallOutlineText}>
                      {followed ? copy("followed") : copy("follow")}
                    </Text>
                  </Pressable>
                </View>
                    </>
                  );
                })()}
              </>
            )}
          </Pressable>
        </View>
      </Modal>

      <Modal
        visible={!!playdateCommentsOpenFor}
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
}: {
  visible: boolean;
  onClose: () => void;
  keyboardAvoidBehavior: KeyboardAvoidingViewProps["behavior"];
  colors: any;
  styles: ReturnType<typeof getStyles>;
  rtlInput: object;
  isRTL: boolean;
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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdropFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={keyboardAvoidBehavior} style={styles.keyboardSheet}>
          <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { textAlign: isRTL ? "right" : "left" }]}>{copy("createPlaydateTitle")}</Text>
            <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
              <TextInput style={[styles.input, rtlInput]} placeholder={copy("titleField")} placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
              <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{copy("dog")}</Text>
              <View style={styles.modalChipWrap}>
                {pets.map((pet) => (
                  <Pressable key={pet.id} onPress={() => setSelectedPetId(pet.id)} style={[styles.modalChip, selectedPetId === pet.id && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, selectedPetId === pet.id && styles.modalChipTextActive]}>{pet.name}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.twoCol}>
                <View style={styles.colInput}>
                  <DatePickerField
                    value={date}
                    onChange={setDate}
                    placeholder={copy("dateField")}
                    isRTL={isRTL}
                    minimumDate={new Date()}
                  />
                </View>
                <View style={styles.colInput}>
                  <TimePickerField
                    value={time}
                    onChange={setTime}
                    placeholder={copy("timeField")}
                    isRTL={isRTL}
                  />
                </View>
              </View>
              <TextInput style={[styles.input, rtlInput]} placeholder={copy("locationOrPark")} placeholderTextColor={colors.textMuted} value={location} onChangeText={setLocation} />
              <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{copy("sizeFit")}</Text>
              <View style={styles.modalChipWrap}>
                {(["Small", "Medium", "Large", "All"] as DogSizeSuitability[]).map((option) => (
                  <Pressable key={option} onPress={() => setSize(option)} style={[styles.modalChip, size === option && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, size === option && styles.modalChipTextActive]}>{sizeLabel(option, isRTL)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{copy("ageFit")}</Text>
              <View style={styles.modalChipWrap}>
                {["Puppies", "Adults", "Seniors", "All"].map((option) => (
                  <Pressable key={option} onPress={() => setAge(option)} style={[styles.modalChip, age === option && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, age === option && styles.modalChipTextActive]}>{ageLabel(option, isRTL)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{copy("energyLevel")}</Text>
              <View style={styles.modalChipWrap}>
                {(["Calm", "Medium", "High"] as EnergyLevel[]).map((option) => (
                  <Pressable key={option} onPress={() => setEnergy(option)} style={[styles.modalChip, energy === option && styles.modalChipActive]}>
                    <Text style={[styles.modalChipText, energy === option && styles.modalChipTextActive]}>{energyLabel(option, isRTL)}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput style={[styles.input, rtlInput]} placeholder={copy("maxParticipants")} placeholderTextColor={colors.textMuted} value={maxParticipants} onChangeText={setMaxParticipants} keyboardType="number-pad" />
              <TextInput style={[styles.input, styles.textArea, rtlInput]} placeholder={copy("description")} placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline />
              <Pressable onPress={() => setRequiresApproval(!requiresApproval)} style={styles.checkRow}>
                <Ionicons name={requiresApproval ? "checkbox" : "square-outline"} size={20} color={colors.text} />
                <Text style={styles.checkText}>{copy("requiresApproval")}</Text>
              </Pressable>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable onPress={onClose} style={styles.composerCancel}>
                <Text style={styles.composerCancelText}>{copy("cancel")}</Text>
              </Pressable>
              <Pressable onPress={onCreate} disabled={creating} style={[styles.publishBtn, creating && { opacity: 0.5 }]}>
                {creating ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={styles.publishText}>{copy("createPlaydate")}</Text>}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    /** Pull category row closer to the navy header; strip uses page background. */
    categoryTabsScroll: {
      backgroundColor: colors.surface,
      marginTop: 0,
      flexShrink: 1,
    },
    topTabsContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 12,
      alignItems: "flex-start",
    },
    topTab: {
      alignItems: "center",
      justifyContent: "flex-start",
      minWidth: 76,
      flexShrink: 0,
      paddingVertical: 2,
    },
    topTabCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#06256f",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    topTabCircleActive: {
      backgroundColor: colors.text,
      borderColor: colors.text,
    },
    topTabCircleInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    /** Inactive label — gray; active uses `topTabTextActive` only (never white). */
    topTabText: {
      marginTop: 10,
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 16,
      maxWidth: 92,
    },
    topTabTextActive: {
      color: "#06256F",
      fontWeight: "800",
    },
    hero: {
      marginHorizontal: 16,
      marginTop: 6,
      borderRadius: 22,
      padding: 16,
      backgroundColor: colors.text,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.16,
      shadowRadius: 22,
      elevation: 7,
    },
    heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    heroTitle: { color: colors.textInverse, fontSize: 25, fontWeight: "900" },
    heroSubtitle: { color: "rgba(255,255,255,0.84)", fontSize: 13, marginTop: 3, lineHeight: 19 },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    privacyNote: {
      color: "rgba(255,255,255,0.72)",
      fontSize: 12,
      marginTop: 10,
      lineHeight: 18,
    },
    searchCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginHorizontal: 16,
      marginTop: 10,
      paddingHorizontal: 14,
      minHeight: 54,
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
      paddingBottom: 2,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 36,
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
      marginTop: 10,
      padding: 14,
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
    contentText: { fontSize: 15, color: colors.text, lineHeight: 23, marginTop: 12 },
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
      gap: 12,
      paddingTop: 12,
      paddingBottom: 2,
    },
    dogProfileCard: {
      width: 154,
      padding: 12,
      borderRadius: 18,
      backgroundColor: colors.surfaceTertiary,
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignItems: "center",
    },
    dogProfileAvatar: {
      width: 78,
      height: 78,
      borderRadius: 39,
      overflow: "hidden",
      backgroundColor: colors.text,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    dogProfileName: { color: colors.text, fontSize: 15, fontWeight: "900", textAlign: "center", lineHeight: 19 },
    dogProfileSub: { color: colors.textMuted, fontSize: 12, marginTop: 3, textAlign: "center", lineHeight: 17 },
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
      flexWrap: "wrap",
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
      flexWrap: "wrap",
    },
    quickActionPrimary: {
      flex: 1,
      minWidth: 140,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.text,
      paddingVertical: 12,
      minHeight: 48,
      borderRadius: 14,
    },
    quickActionPrimaryText: { color: colors.textInverse, fontSize: 14, fontWeight: "900" },
    quickActionSecondary: {
      flex: 1,
      minWidth: 140,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primaryLight,
      paddingVertical: 12,
      minHeight: 48,
      borderRadius: 14,
    },
    quickActionSecondaryText: { color: colors.text, fontSize: 14, fontWeight: "900" },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
      flexWrap: "wrap",
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
      minHeight: 38,
      justifyContent: "center",
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
      minHeight: 38,
      justifyContent: "center",
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
    modalRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    modalBackdropFill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
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
      overflow: "hidden",
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
