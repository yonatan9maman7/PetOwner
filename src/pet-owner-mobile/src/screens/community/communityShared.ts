/**
 * Shared types, i18n strings and pure helper functions for the Community screens.
 * No React or hooks — safe to import from any tab or component without circular deps.
 */

import type { PostDto } from "../../types/api";
import { formatCommunityDistanceKm } from "./utils/formatCommunity";

// ─── Constants ────────────────────────────────────────────────────────────────

export const PAGE_SIZE = 20;
/** Post-confetti delay before SOS resolve API (matches UX spec ~1.5–2s). */
export const MARK_FOUND_SOS_CELEBRATION_DELAY_MS = 1750;

// ─── Types ────────────────────────────────────────────────────────────────────

export type MainTab = "feed" | "playdates" | "parks" | "groups" | "qa" | "events" | "lostSos";

export type FeedFilter =
  | "Nearby"
  | "Playdates"
  | "Questions"
  | "Recommendations"
  | "Dog Parks"
  | "Lost & Found"
  | "Events"
  | "Groups";

export type PostKind =
  | "Cute moment"
  | "Question"
  | "Recommendation"
  | "Playdate"
  | "Warning"
  | "Lost & Found"
  | "Event";

export type Visibility = "Public" | "Nearby only" | "Friends only" | "Group only";
export type DogSizeSuitability = "Small" | "Medium" | "Large" | "All";
export type EnergyLevel = "Calm" | "Medium" | "High";

export interface PostMeta {
  kind: PostKind;
  location?: string;
  dogName?: string;
  visibility?: Visibility;
  tags?: string[];
  isDemo?: boolean;
}

export interface DogPark {
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

export const POST_TYPES: PostKind[] = [
  "Cute moment",
  "Question",
  "Recommendation",
  "Playdate",
  "Warning",
  "Lost & Found",
  "Event",
];

export const VISIBILITY_OPTIONS: Visibility[] = [
  "Public",
  "Nearby only",
  "Friends only",
  "Group only",
];

// ─── i18n ─────────────────────────────────────────────────────────────────────

export const HE = {
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
  savePost: "שמור",
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
  createPlaydateSubtitle:
    "ארגן מפגש משחק מהנה ומצא כלבים מתאימים שישמחו להצטרף לכלב שלך.",
  titleField: "כותרת",
  dateLabel: "תאריך",
  timeLabel: "שעה",
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
  postKindCuteMoment: "רגע מתוק",
  postKindQuestion: "שאלה",
  postKindRecommendation: "המלצה",
  postKindPlaydate: "מפגש",
  postKindWarning: "אזהרה",
  postKindLostFound: "אבדות ומציאות",
  postKindEvent: "אירוע",
  visibilityPublic: "ציבורי",
  visibilityNearbyOnly: "קרוב אליי",
  visibilityFriendsOnly: "חברים בלבד",
  visibilityGroupOnly: "קבוצה בלבד",
  sizeSmall: "קטנים",
  sizeMedium: "בינוניים",
  sizeLarge: "גדולים",
  sizeAll: "כולם",
} as const;

export const EN: Record<keyof typeof HE, string> = {
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
  checkIn: "I'm here",
  removeCheckIn: "Remove Check-in",
  viewPark: "View Park",
  hidePost: "Hide post",
  reportPost: "Report post",
  blockUser: "Block user",
  provider: "Provider",
  demoBanner: "Demo activity shown until real posts exist.",
  apiFallback: "Feed is currently unavailable, showing demo posts.",
  localDogProfile: "Local Dog Profile",
  communityPlaydate: "Community Playdate",
  interested: "Interested",
  posted: "Post published",
  postedDesc: "Your post is live in the community.",
  savedLocal: "Saved locally",
  savedLocalPost: "API unavailable — post only visible this session.",
  postNeedsContent: "Post needs content",
  postNeedsContentDesc: "Write something or attach a photo before publishing.",
  locationRecommended: "Location recommended",
  locationRecommendedDesc: "A Lost & Found post works better with a rough area.",
  tip: "Tip",
  playdateTip: "For full RSVP details, also use the Create Playdate feature.",
  deletePost: "Delete post?",
  cancel: "Cancel",
  delete: "Delete",
  postHidden: "Post hidden",
  postHiddenDesc: "Post removed from your feed.",
  reportReceived: "Report received",
  reportReceivedDesc: "Thanks for helping keep the community safe.",
  userBlocked: "User blocked",
  userBlockedDesc: "Posts from this user are hidden locally.",
  youAreComing: "Marked as coming",
  youAreComingDesc: "Your interest in the playdate was saved.",
  dogPlaydatesTitle: "Dog Playdates",
  dogPlaydatesSub: "Coordinate local meetups and join with your dog.",
  noPlaydates: "No playdates yet",
  noPlaydatesSub: "Create the first playdate for dogs in your area.",
  openPlaydate: "Open playdate for friendly dogs nearby.",
  allSizes: "All sizes",
  going: "Going",
  maybe: "Maybe",
  notGoing: "Not going",
  comments: "Comments",
  parksTitle: "Dog Parks / Active Now",
  parksSub: "See live check-ins and discover dog-friendly activity at parks.",
  activeNow: "Active now",
  noBeacons: "No check-ins right now. Mark yourself here to let nearby dog owners know.",
  activeNowShort: "Active now",
  rating: "Rating",
  activity: "Activity",
  activeDogsNow: "active dogs now",
  upcomingPlaydates: "upcoming playdates",
  recentPosts: "recent posts",
  createPlaydateInPark: "Plan playdate",
  groupsTitle: "Community Groups",
  groupsSub: "Find interests, recommendations, breed groups and support.",
  searchGroups: "Search groups",
  joined: "Joined",
  joinGroup: "Join",
  groupUpdated: "Group updated",
  groupUpdatedDesc: "Membership shown locally until server support is added.",
  qaTitle: "Q&A / Recommendations",
  qaSub: "Ask local dog owners about trainers, sitters, food and behaviour.",
  askQuestion: "Ask a question",
  askedBy: "Asked by",
  answers: "answers",
  training: "Training",
  bestAnswerPending: "Best answer pending",
  helpful: "Helpful",
  savePost: "Save",
  answer: "Answer",
  answerHint: "Reply via the comments button on the post.",
  eventsTitle: "Events & Activities",
  eventsSub: "Weekend hikes, puppy meetups, adoption days and workshops.",
  spotsLeft: "spots left",
  dogsAttending: "dogs attending",
  joinEvent: "Join event",
  eventUpdated: "Event updated",
  eventUpdatedDesc: "Your participation was saved locally.",
  createPostTitle: "Create Post",
  postType: "Post type",
  dog: "Dog",
  whatHappening: "What's happening in your dog community?",
  locationOrPark: "Location or dog park",
  visibility: "Privacy",
  tags: "Tags, comma-separated",
  addMedia: "Add photo / video",
  publishPost: "Publish to community",
  createPlaydateTitle: "Create Playdate",
  createPlaydateSubtitle:
    "Organize a fun meetup and find the perfect playmates for your dog.",
  titleField: "Title",
  dateLabel: "Date",
  timeLabel: "Time",
  dateField: "YYYY-MM-DD",
  timeField: "HH:mm",
  sizeFit: "Size fit",
  ageFit: "Age fit",
  energyLevel: "Energy level",
  maxParticipants: "Max participants",
  description: "Description",
  requiresApproval: "Requires organiser approval",
  missingDetails: "Missing details",
  missingDetailsDesc: "Title, date, time and location are required.",
  invalidDate: "Invalid date",
  invalidDateDesc: "Enter date as YYYY-MM-DD and time as HH:mm.",
  futureTime: "Choose a future time",
  futureTimeDesc: "You can't create a playdate in the past.",
  playdateCreated: "Playdate created",
  playdateCreatedDesc: "Dog owners can now join.",
  playdateSavedLocal: "API unavailable — playdate only visible this session.",
  checkedIn: "Checked in",
  checkedInDesc: "You marked yourself here with your dog.",
  checkedInLocal: "Check-in saved locally",
  checkedInLocalDesc: "Beacon API unavailable — check-in is local.",
  checkInRemoved: "Check-in removed",
  parkLocation: "Approximate park location",
  peak: "Peak hours",
  playdateComments: "Playdate comments",
  commentsHint: "Full comments load on the playdate detail screen. Add a quick comment here for this session.",
  writeComment: "Write a comment",
  postComment: "Post comment",
  commentAdded: "Comment added",
  commentAddedDesc: "Your comment was published.",
  commentLocal: "Comment saved locally",
  commentLocalDesc: "API unavailable — comment is local for now.",
  inviteOpened: "Play invite opened",
  following: "Following",
  followingDesc: "Following saved locally.",
  invited: "Invited",
  followed: "Followed",
  postKindCuteMoment: "Cute moment",
  postKindQuestion: "Question",
  postKindRecommendation: "Recommendation",
  postKindPlaydate: "Playdate",
  postKindWarning: "Warning",
  postKindLostFound: "Lost & Found",
  postKindEvent: "Event",
  visibilityPublic: "Public",
  visibilityNearbyOnly: "Nearby only",
  visibilityFriendsOnly: "Friends only",
  visibilityGroupOnly: "Group only",
  sizeSmall: "Small",
  sizeMedium: "Medium",
  sizeLarge: "Large",
  sizeAll: "All",
};

export type CopyKey = keyof typeof HE;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function formatDistanceKm(valueKm: number, language: "he" | "en"): string {
  if (!Number.isFinite(valueKm) || valueKm <= 0) {
    return language === "he" ? "0.1 ק״מ" : "0.1 km";
  }
  return formatCommunityDistanceKm(valueKm, language);
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
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

export function categoryToKind(category?: string): PostKind {
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

export function postKindLabel(kind: PostKind, isRTL: boolean): string {
  if (!isRTL) {
    switch (kind) {
      case "Cute moment": return EN.postKindCuteMoment;
      case "Question": return EN.postKindQuestion;
      case "Recommendation": return EN.postKindRecommendation;
      case "Playdate": return EN.postKindPlaydate;
      case "Warning": return EN.postKindWarning;
      case "Lost & Found": return EN.postKindLostFound;
      case "Event": return EN.postKindEvent;
    }
  }
  switch (kind) {
    case "Cute moment": return "רגע מתוק";
    case "Question": return "שאלה";
    case "Recommendation": return "המלצה";
    case "Playdate": return "מפגש";
    case "Warning": return "אזהרה";
    case "Lost & Found": return "אבדות ומציאות";
    case "Event": return "אירוע";
  }
}

export function visibilityLabel(visibility: Visibility, isRTL: boolean): string {
  if (!isRTL) {
    switch (visibility) {
      case "Public": return EN.visibilityPublic;
      case "Nearby only": return EN.visibilityNearbyOnly;
      case "Friends only": return EN.visibilityFriendsOnly;
      case "Group only": return EN.visibilityGroupOnly;
    }
  }
  switch (visibility) {
    case "Public": return "ציבורי";
    case "Nearby only": return "קרוב אליי";
    case "Friends only": return "חברים בלבד";
    case "Group only": return "קבוצה בלבד";
  }
}

export function sizeLabel(size: DogSizeSuitability, isRTL: boolean): string {
  if (!isRTL) {
    switch (size) {
      case "Small": return EN.sizeSmall;
      case "Medium": return EN.sizeMedium;
      case "Large": return EN.sizeLarge;
      case "All": return EN.sizeAll;
    }
  }
  switch (size) {
    case "Small": return "קטנים";
    case "Medium": return "בינוניים";
    case "Large": return "גדולים";
    case "All": return "כולם";
  }
}

export function energyLabel(level: EnergyLevel, isRTL: boolean): string {
  if (!isRTL) return level;
  switch (level) {
    case "Calm": return "רגועה";
    case "Medium": return "בינונית";
    case "High": return "גבוהה";
  }
}

export function ageLabel(age: string, isRTL: boolean): string {
  if (!isRTL) return age;
  const labels: Record<string, string> = {
    Puppies: "גורים",
    Adults: "בוגרים",
    Seniors: "מבוגרים",
    All: "כולם",
  };
  return labels[age] ?? age;
}

export function activityLabel(activity: DogPark["activity"], isRTL: boolean): string {
  if (!isRTL) return activity;
  switch (activity) {
    case "Low": return "נמוכה";
    case "Medium": return "בינונית";
    case "High": return "גבוהה";
  }
}

/** Active SOS-style lost post: Lost & Found category, not yet resolved on the server. */
export function isActiveSosLostPost(post: PostDto, kind: PostKind): boolean {
  if (kind !== "Lost & Found" || post.sosResolvedAt) return false;
  const cat = (post.category ?? "").toLowerCase();
  if (cat.includes("sos") || cat.includes("lost")) return true;
  return post.content.includes("🆘") || /SOS:/i.test(post.content);
}

export function filterMatchesPost(filter: FeedFilter, post: PostDto, meta?: PostMeta): boolean {
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
