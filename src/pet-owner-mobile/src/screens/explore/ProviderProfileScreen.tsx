import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  CommonActions,
} from "@react-navigation/native";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { useTheme } from "../../theme/ThemeContext";
import { useKeyboardAvoidingState } from "../../hooks/useKeyboardAvoidingState";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { appProviderProfileDeepLink, publicProviderProfileUrl } from "../../config/publicLinks";
import { mapApi } from "../../api/client";
import type { DogSize, ProviderPublicProfileDto } from "../../types/api";
import { ProviderType } from "../../types/api";
import { useReviewsStore } from "../../store/reviewsStore";
import { StarRatingInput } from "./components/StarRatingInput";
import { InlineError } from "../../components/shared";
import { formInputStyle } from "../pets/MyPets/helpers";
import {
  DOG_ICON_SIZES,
  DOG_SIZE_LABEL_KEYS,
  DOG_SIZE_ORDER,
} from "../../features/provider-onboarding/dogSizeConstants";
import { ReviewCard } from "./components/ReviewCard";

const DAY_KEYS = ["daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat"] as const;

const SERVICE_TYPE_NAMES: Record<number, string> = {
  0: "Dog Walking", 1: "Pet Sitting", 2: "Boarding",
  3: "Drop-in Visit", 4: "Training", 5: "Insurance", 6: "Pet Store",
};

const PRICING_UNIT_LABELS: Record<number, string> = {
  0: "hour", 1: "night", 2: "visit", 3: "session", 4: "package",
};

const HERO_HEIGHT = 300;

/* ─── Translucent circle button ─── */
function GlassButton({
  onPress,
  icon,
}: {
  onPress: () => void;
  icon: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        s.glassBtn,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Ionicons name={icon as any} size={20} color="#fff" />
    </Pressable>
  );
}

/* ─── Hero area ─── */
function HeroSection({
  profile,
  isFav,
  onBack,
  onToggleFav,
  onShare,
}: {
  profile: ProviderPublicProfileDto;
  isFav: boolean;
  onBack: () => void;
  onToggleFav: () => void;
  onShare: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={s.heroOuter}>
      {profile.profileImageUrl && !imgFailed ? (
        <Image
          source={{ uri: profile.profileImageUrl }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <View style={[s.heroFallback]}>
          <View style={s.heroFallbackCircle1} />
          <View style={s.heroFallbackCircle2} />
          <View style={s.heroFallbackIconWrap}>
            <View style={s.heroFallbackIconBg}>
              <Ionicons name="paw" size={72} color="rgba(255,255,255,0.8)" />
            </View>
          </View>
        </View>
      )}

      {/* Gradient overlay */}
      <View style={s.heroGradient} />

      {/* Floating header */}
      <View style={[s.heroHeader, { paddingTop: insets.top }]}>
        <GlassButton onPress={onBack} icon="arrow-back" />
        <View style={s.heroHeaderRight}>
          <GlassButton
            onPress={onToggleFav}
            icon={isFav ? "heart" : "heart-outline"}
          />
          <GlassButton onPress={onShare} icon="share-outline" />
        </View>
      </View>
    </View>
  );
}

/* ─── Action button in the 4-col grid ─── */
function ActionBtn({
  icon,
  label,
  onPress,
  primary,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.actionBtn,
        primary
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.surfaceSecondary },
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={22}
        color={primary ? "#fff" : colors.primary}
      />
      <Text
        style={[
          s.actionBtnLabel,
          { color: primary ? "#fff" : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ─── Section header ─── */
function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={s.sectionHeaderRow}>
      <Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text>
      {right}
    </View>
  );
}

/* ═══════════════════════ MAIN SCREEN ═══════════════════════ */

export function ProviderProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const providerId = route.params?.providerId as string;
  const requestedDate = route.params?.requestedDate as string | undefined;
  const requestedTime = route.params?.requestedTime as string | undefined;
  const { colors } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();
  const insets = useSafeAreaInsets();
  const { behavior: keyboardAvoidBehavior } = useKeyboardAvoidingState();

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const currentUserId = useAuthStore((s) => s.userId);
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const isFav = favoriteIds.has(providerId);

  const submitDirectReview = useReviewsStore((s) => s.submitDirectReview);
  const submittingDirect = useReviewsStore((s) => s.submitting);
  const directSubmitError = useReviewsStore((s) => s.submitError);
  const clearSubmitError = useReviewsStore((s) => s.clearSubmitError);

  const [profile, setProfile] = useState<ProviderPublicProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareCardBusy, setShareCardBusy] = useState(false);
  const [directReviewOpen, setDirectReviewOpen] = useState(false);
  const [directRating, setDirectRating] = useState(0);
  const [directComment, setDirectComment] = useState("");
  const [directFieldError, setDirectFieldError] = useState<string | null>(null);

  const openDirectReviewModal = useCallback(() => {
    clearSubmitError();
    setDirectFieldError(null);
    setDirectRating(0);
    setDirectComment("");
    setDirectReviewOpen(true);
  }, [clearSubmitError]);

  const closeDirectReviewModal = useCallback(() => {
    setDirectReviewOpen(false);
  }, []);

  const handleSubmitDirectReview = useCallback(async () => {
    if (!profile) return;
    setDirectFieldError(null);
    clearSubmitError();
    if (directRating < 1) {
      setDirectFieldError(t("reviewValidationRating"));
      return;
    }
    const c = directComment.trim();
    if (c.length < 10) {
      setDirectFieldError(t("reviewValidationComment"));
      return;
    }
    if (c.length > 1000) {
      setDirectFieldError(t("reviewValidationCommentMax"));
      return;
    }
    const dto = await submitDirectReview(
      {
        revieweeId: profile.providerId,
        rating: directRating,
        comment: c,
      },
      profile.providerId,
    );
    if (!dto) return;
    setProfile((prev) => {
      if (!prev) return prev;
      const rc = prev.reviewCount + 1;
      const newAvg =
        prev.averageRating != null && prev.reviewCount > 0
          ? Math.round(
              ((prev.averageRating * prev.reviewCount + dto.rating) / rc) * 10,
            ) / 10
          : dto.rating;
      return {
        ...prev,
        recentReviews: [dto, ...prev.recentReviews].slice(0, 3),
        reviewCount: rc,
        averageRating: newAvg,
      };
    });
    setDirectReviewOpen(false);
    showGlobalAlertCompat(t("reviewSubmitSuccess"), t("reviewSubmitSuccessMessage"));
  }, [
    profile,
    directRating,
    directComment,
    submitDirectReview,
    clearSubmitError,
    t,
  ]);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    mapApi
      .getProviderProfile(providerId)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [providerId, isLoggedIn]);

  /* ─── Actions ─── */
  const handleCall = async () => {
    try {
      const contact = await mapApi.getProviderContact(providerId);
      if (contact?.phone) Linking.openURL(`tel:${contact.phone}`);
    } catch {}
  };

  const handleNavigate = useCallback(() => {
    navigation.navigate("ExploreMain", {
      focusProviderId: providerId,
    });
  }, [navigation, providerId]);

  const handleWebsite = () => {
    if (profile?.websiteUrl) {
      const url = profile.websiteUrl.startsWith("http")
        ? profile.websiteUrl
        : `https://${profile.websiteUrl}`;
      Linking.openURL(url);
    }
  };

  const handleShare = async () => {
    if (shareCardBusy) return;
    setShareCardBusy(true);
    try {
      const png = await mapApi.getProviderShareCard(providerId);
      const filename = `po-provider-share-${providerId}.png`;
      const out = new File(Paths.cache, filename);
      if (out.exists) out.delete();
      out.create();
      out.write(new Uint8Array(png));

      const name = profile?.name?.trim() || "Provider";
      const web = publicProviderProfileUrl(providerId);
      const app = appProviderProfileDeepLink(providerId);
      const caption = `${t("shareProviderCardLine1")} ${name}.\n${web}\n${t("shareProviderCardLineApp")} ${app}`;

      if (Platform.OS === "ios") {
        await Share.share({
          message: caption,
          url: out.uri,
          title: name,
        });
        return;
      }

      await Clipboard.setStringAsync(caption);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showGlobalAlertCompat(t("errorTitle"), t("shareProviderNotSupported"));
        return;
      }
      await Sharing.shareAsync(out.uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: t("shareProviderCardDialogTitle"),
      });
    } catch {
      showGlobalAlertCompat(t("errorTitle"), t("shareProviderCardFailed"));
    } finally {
      setShareCardBusy(false);
    }
  };

  const handleMessage = () => {
    if (!isLoggedIn) {
      showGlobalAlertCompat(t("loginRequiredSos"), t("loginToMessage"));
      return;
    }
    navigation.navigate("ChatRoom", {
      otherUserId: profile!.providerId,
      otherUserName: profile!.name,
    });
  };

  const navigateToLogin = useCallback(() => {
    navigation.goBack();
    setTimeout(() => {
      navigation.dispatch(CommonActions.navigate({ name: "Login" }));
    }, 100);
  }, [navigation]);

  /* ─── Not logged in ─── */
  if (!isLoggedIn) {
    return (
      <SafeAreaView edges={["top"]} style={[s.flex, { backgroundColor: colors.background }]}>
        <View style={[s.topBar, { backgroundColor: colors.surface }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
          </Pressable>
          <Text style={[s.topBarTitle, { color: colors.text }]} numberOfLines={1}>
            {t("providerProfile")}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.centerContent}>
          <Ionicons name="lock-closed-outline" size={56} color={colors.textMuted} />
          <Text style={[s.loginTitle, { color: colors.text }]}>{t("loginRequired")}</Text>
          <Text style={[s.loginSubtitle, { color: colors.textSecondary }]}>
            {t("loginToViewProfile")}
          </Text>
          <Pressable
            onPress={navigateToLogin}
            style={[s.loginBtn, { backgroundColor: colors.text }]}
          >
            <Text style={[s.loginBtnText, { color: colors.textInverse }]}>
              {t("signIn")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /* ─── Loading ─── */
  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={[s.flex, { backgroundColor: colors.background }]}>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  /* ─── Not found ─── */
  if (!profile) {
    return (
      <SafeAreaView edges={["top"]} style={[s.flex, { backgroundColor: colors.background }]}>
        <View style={s.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[s.loginTitle, { color: colors.textMuted }]}>
            Provider not found
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[s.loginBtn, { backgroundColor: colors.text }]}
          >
            <Text style={[s.loginBtnText, { color: colors.textInverse }]}>
              {t("backStep")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /* ─── Group availability slots by day ─── */
  const groupedSlots = profile.availabilitySlots.reduce(
    (acc, slot) => {
      if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
      acc[slot.dayOfWeek].push(slot);
      return acc;
    },
    {} as Record<number, typeof profile.availabilitySlots>,
  );

  const today = new Date().getDay();
  const hasHours = Object.keys(groupedSlots).length > 0 || profile.openingHours;

  const offersDogWalkingOrBoarding = profile.services.some(
    (s) => s.includes("Dog Walking") || s.includes("Boarding"),
  );
  const orderedSizes = (profile.acceptedDogSizes ?? []).filter((x): x is DogSize =>
    DOG_SIZE_ORDER.includes(x as DogSize),
  ).sort(
    (a, b) => DOG_SIZE_ORDER.indexOf(a) - DOG_SIZE_ORDER.indexOf(b),
  );
  const showDogPrefsBlock =
    offersDogWalkingOrBoarding &&
    (orderedSizes.length > 0 || profile.maxDogsCapacity != null);

  /* ─── Render ─── */
  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        style={s.flex}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <HeroSection
          profile={profile}
          isFav={isFav}
          onBack={() => navigation.goBack()}
          onToggleFav={() => toggleFavorite(providerId)}
          onShare={handleShare}
        />

        {/* ── Summary card (overlapping hero) ── */}
        <View style={[s.summaryCard, { backgroundColor: colors.surface }]}>
          {/* Category badge */}
          {profile.services.length > 0 && (
            <View style={s.categoryBadge}>
              <Text style={s.categoryBadgeText}>
                {profile.services[0].toUpperCase()}
              </Text>
            </View>
          )}

          {/* Provider name */}
          <Text style={[s.providerName, { color: colors.text }]}>
            {profile.name}
          </Text>

          {/* Rating + availability row */}
          <View style={[s.metaRow, { flexDirection: rowDirectionForAppLayout(isRTL) }]}>
            {profile.averageRating != null && (
              <View style={s.ratingPill}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={s.ratingText}>
                  {profile.averageRating.toFixed(1)}
                </Text>
              </View>
            )}
            {profile.reviewCount > 0 && (
              <Text style={[s.reviewCountText, { color: colors.textSecondary }]}>
                ({profile.reviewCount} {t("reviews")})
              </Text>
            )}
            <View
              style={[
                s.availBadge,
                { backgroundColor: profile.isAvailableNow ? "#dcfce7" : "#fee2e2" },
              ]}
            >
              <Text
                style={[
                  s.availBadgeText,
                  { color: profile.isAvailableNow ? "#16a34a" : "#dc2626" },
                ]}
              >
                {profile.isAvailableNow ? t("availableNow") : t("notAvailable")}
              </Text>
            </View>
            {profile.isEmergencyService && (
              <View style={s.emergencyBadge}>
                <Ionicons name="medkit" size={11} color="#fff" />
                <Text style={s.emergencyText}>{t("emergency")}</Text>
              </View>
            )}
          </View>

          {/* ── Action grid ── */}
          <View style={s.actionGrid}>
            <ActionBtn
              icon="call"
              label={t("call")}
              onPress={handleCall}
            />
            <ActionBtn
              icon="navigate"
              label={t("navigateAction")}
              onPress={handleNavigate}
              primary
            />
            <ActionBtn
              icon="globe-outline"
              label={t("websiteAction")}
              onPress={handleWebsite}
              disabled={!profile.websiteUrl}
            />
            <ActionBtn
              icon="share-outline"
              label={t("share")}
              onPress={handleShare}
            />
          </View>
        </View>

        {/* ─── Section padding ─── */}
        <View style={s.sectionsWrap}>

          {/* ── Opening Hours ── */}
          {hasHours && (
            <View style={[s.sectionCard, { backgroundColor: colors.surface }]}>
              <SectionHeader title={t("openingHours")} />

              {profile.openingHours ? (
                <Text style={[s.openingHoursText, { color: colors.textSecondary }]}>
                  {profile.openingHours}
                </Text>
              ) : (
                [0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const daySlots = groupedSlots[day];
                  if (!daySlots?.length) return null;
                  const isToday = day === today;
                  return (
                    <View
                      key={day}
                      style={[
                        s.hoursRow,
                        { flexDirection: rowDirectionForAppLayout(isRTL) },
                        { borderTopColor: colors.borderLight },
                      ]}
                    >
                      <Text
                        style={[
                          s.hoursDay,
                          { color: isToday ? colors.primary : colors.text },
                          isToday && { fontWeight: "700" },
                        ]}
                      >
                        {t(DAY_KEYS[day] as any)}
                      </Text>
                      <View style={s.slotGroup}>
                        {daySlots.map((slot, i) => (
                          <Text
                            key={i}
                            style={[
                              s.hoursTime,
                              { color: isToday ? colors.primary : colors.textSecondary },
                            ]}
                          >
                            {slot.startTime?.slice(0, 5)} – {slot.endTime?.slice(0, 5)}
                          </Text>
                        ))}
                      </View>
                    </View>
                  );
                })
              )}

              {profile.acceptsOffHoursRequests && (
                <View style={[s.offHoursRow, { borderTopColor: colors.borderLight }]}>
                  <Ionicons name="flash" size={14} color="#f59e0b" />
                  <Text style={s.offHoursText}>{t("offHoursAvailable")}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── About ── */}
          {(profile.bio || profile.services.length > 0) && (
            <View style={[s.sectionCard, { backgroundColor: colors.surface }]}>
              <SectionHeader title={t("aboutProvider")} />
              {profile.bio && (
                <Text style={[s.bioText, rtlText, { color: colors.textSecondary }]}>
                  {profile.bio}
                </Text>
              )}
              {profile.services.length > 0 && (
                <View style={[s.tagsWrap, { flexDirection: rowDirectionForAppLayout(isRTL) }]}>
                  {profile.services.map((svc, i) => (
                    <View
                      key={i}
                      style={[s.tag, { backgroundColor: colors.surfaceSecondary }]}
                    >
                      <Text style={[s.tagText, { color: colors.textSecondary }]}>
                        {svc}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Accepted sizes & capacity (dog walking / boarding) ── */}
          {showDogPrefsBlock && (
            <View
              className="rounded-[20px] p-5 shadow-sm"
              style={[
                s.sectionCard,
                {
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <SectionHeader title={t("acceptedSizes")} />
              {orderedSizes.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    flexDirection: rowDirectionForAppLayout(isRTL),
                    gap: 12,
                    paddingVertical: 4,
                  }}
                >
                  {orderedSizes.map((id) => (
                    <View
                      key={id}
                      className="items-center rounded-2xl border border-neutral-200/80 px-3 py-3"
                      style={{
                        borderColor: colors.borderLight,
                        backgroundColor: colors.surfaceSecondary,
                        minWidth: 80,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="dog"
                        size={DOG_ICON_SIZES[id]}
                        color={colors.primary}
                      />
                      <Text
                        className="mt-2 text-center text-[11px] font-semibold leading-tight"
                        style={{ color: colors.textSecondary }}
                        numberOfLines={3}
                      >
                        {t(DOG_SIZE_LABEL_KEYS[id])}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
              {profile.maxDogsCapacity != null && (
                <View
                  className={`mt-4 flex-row items-center gap-2 rounded-xl px-3 py-2.5 ${
                    isRTL ? "flex-row-reverse" : ""
                  }`}
                  style={{ backgroundColor: colors.surfaceSecondary }}
                >
                  <MaterialCommunityIcons
                    name="paw"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    className="flex-1 text-sm font-bold"
                    style={[rtlText, { color: colors.text }]}
                  >
                    {t("maxCapacityTakesUpTo").replace(
                      "{{count}}",
                      String(profile.maxDogsCapacity),
                    )}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Services & Pricing ── */}
          {profile.serviceRates.length > 0 && (
            <View style={[s.sectionCard, { backgroundColor: colors.surface }]}>
              <SectionHeader title={t("servicesOffered")} />
              {profile.serviceRates.map((sr: any, idx: number) => {
                const name =
                  sr.service ?? SERVICE_TYPE_NAMES[sr.serviceType] ?? `Service ${sr.serviceType}`;
                const unit =
                  sr.unit ?? PRICING_UNIT_LABELS[sr.pricingUnit] ?? "";
                return (
                  <View
                    key={idx}
                    style={[
                      s.rateRow,
                      { flexDirection: rowDirectionForAppLayout(isRTL) },
                      {
                        borderTopWidth: idx > 0 ? 1 : 0,
                        borderTopColor: colors.borderLight,
                      },
                    ]}
                  >
                    <Text style={[s.rateName, { color: colors.textSecondary }]}>
                      {name}
                    </Text>
                    <Text style={[s.ratePrice, { color: colors.text }]}>
                      ₪{sr.rate}
                      <Text style={[s.rateUnit, { color: colors.textMuted }]}>
                        {" "}/{" "}{unit}
                      </Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Reviews ── */}
          <View style={[s.sectionCard, { backgroundColor: colors.surface }]}>
            <SectionHeader
              title={`${t("reviews")} (${profile.reviewCount})`}
              right={
                profile.providerId !== currentUserId ? (
                  profile.providerType === ProviderType.Business ? (
                    <Pressable
                      onPress={openDirectReviewModal}
                      style={[s.writeReviewBtn, { backgroundColor: colors.surfaceSecondary }]}
                    >
                      <Text style={[s.writeReviewBtnText, { color: colors.text }]}>
                        {t("writeReviewTitle")}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() =>
                        navigation.navigate("WriteReview", {
                          providerId: profile.providerId,
                          providerName: profile.name,
                        })
                      }
                      style={[s.writeReviewBtn, { backgroundColor: colors.surfaceSecondary }]}
                    >
                      <Text style={[s.writeReviewBtnText, { color: colors.text }]}>
                        {t("leaveReview")}
                      </Text>
                    </Pressable>
                  )
                ) : undefined
              }
            />

            {profile.recentReviews.length === 0 ? (
              <Text style={[s.noReviewsText, { color: colors.textMuted }]}>
                {t("noReviews")}
              </Text>
            ) : (
              profile.recentReviews.slice(0, 3).map((review, index) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  borderTop={index > 0}
                  avatarSize={40}
                />
              ))
            )}

            {profile.reviewCount > 3 && (
              <Pressable
                onPress={() =>
                  navigation.navigate("AllReviews", {
                    providerId: profile.providerId,
                    providerName: profile.name,
                  })
                }
                style={[s.seeAllBtn, { borderColor: colors.borderLight }]}
              >
                <Text style={[s.seeAllBtnText, { color: colors.textSecondary }]}>
                  {t("seeAllReviews")}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky Book Now ── */}
      {profile.providerId !== currentUserId && profile.serviceRates.length > 0 && (
        <View
          style={[
            s.bookingBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.borderLight,
              paddingBottom: Platform.OS === "ios" ? Math.max(insets.bottom, 16) : 16,
            },
          ]}
        >
          {profile.providerId !== currentUserId && (
          <Pressable
            onPress={handleMessage}
            style={[s.messageBtn, { borderColor: colors.primary }]}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
          </Pressable>
        )}
        {(() => {
          const canBook = profile.isAvailableNow || profile.acceptsOffHoursRequests;
          return (
            <Pressable
              onPress={canBook ? () => navigation.navigate("Booking", { profile, requestedDate, requestedTime }) : undefined}
              disabled={!canBook}
              style={[
                s.bookNowBtn,
                { flex: 1 },
                canBook
                  ? { backgroundColor: colors.text }
                  : { backgroundColor: colors.textMuted, opacity: 0.55 },
              ]}
            >
              <Ionicons
                name={canBook ? "calendar" : "ban-outline"}
                size={20}
                color={colors.textInverse}
              />
              <Text style={[s.bookNowText, { color: colors.textInverse }]}>
                {canBook ? t("bookNow") : t("providerUnavailable")}
              </Text>
            </Pressable>
          );
        })()}
        </View>
      )}

      <Modal
        visible={directReviewOpen}
        animationType="fade"
        transparent
        onRequestClose={closeDirectReviewModal}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={keyboardAvoidBehavior}
        >
          <Pressable style={s.modalBackdrop} onPress={closeDirectReviewModal}>
            <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
              <View style={[s.modalHeaderRow, { flexDirection: rowDirectionForAppLayout(isRTL) }]}>
                <Text style={[s.modalTitle, { color: colors.text }]}>{t("writeReviewTitle")}</Text>
                <Pressable onPress={closeDirectReviewModal} hitSlop={12} accessibilityRole="button">
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </Pressable>
              </View>
              <Text
                style={[rtlText, { color: colors.textSecondary, fontSize: 14, marginBottom: 16 }]}
                numberOfLines={2}
              >
                {profile.name}
              </Text>

              {(directFieldError || directSubmitError) ? (
                <InlineError message={directFieldError ?? directSubmitError ?? ""} />
              ) : null}

              <Text
                style={[s.modalLabel, { color: colors.textMuted, textAlign: isRTL ? "right" : "left" }]}
              >
                {t("reviewRatingLabel")}
              </Text>
              <StarRatingInput
                value={directRating}
                onChange={setDirectRating}
                size={36}
                isRTL={isRTL}
                accessibilityLabel={t("reviewRatingLabel")}
              />

              <Text
                style={[
                  s.modalLabel,
                  { color: colors.textMuted, textAlign: isRTL ? "right" : "left", marginTop: 18 },
                ]}
              >
                {t("reviewCommentLabel")}
              </Text>
              <TextInput
                value={directComment}
                onChangeText={setDirectComment}
                placeholder={t("reviewCommentPlaceholder")}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={5}
                style={[formInputStyle(isRTL, colors), { minHeight: 120, textAlignVertical: "top" }]}
              />

              <Pressable
                onPress={handleSubmitDirectReview}
                disabled={submittingDirect}
                style={[
                  s.modalSubmitBtn,
                  {
                    backgroundColor: submittingDirect ? colors.primaryLight : colors.primary,
                    opacity: submittingDirect ? 0.85 : 1,
                  },
                ]}
              >
                {submittingDirect ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <Text style={[s.modalSubmitText, { color: colors.primaryText }]}>{t("reviewSubmit")}</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ══════════════════ STYLES ══════════════════ */

const s = StyleSheet.create({
  flex: { flex: 1 },

  /* ─── Auth / loading screens ─── */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  loginSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  loginBtn: {
    marginTop: 24,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
  },
  loginBtnText: {
    fontWeight: "700",
    fontSize: 15,
  },

  /* ─── Hero ─── */
  heroOuter: {
    height: HERO_HEIGHT,
    width: "100%",
    backgroundColor: "#1a1a2e",
    overflow: "hidden",
  },
  heroFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a2e",
  },
  heroFallbackCircle1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(99,102,241,0.35)",
    top: -80,
    right: -60,
  },
  heroFallbackCircle2: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(139,92,246,0.25)",
    bottom: -60,
    left: -40,
  },
  heroFallbackIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  heroFallbackIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    // Simulate gradient with bottom shadow overlay
    bottom: 0,
    height: "60%",
    top: "40%",
    backgroundColor: "transparent",
  },
  heroHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  heroHeaderRight: {
    flexDirection: "row",
    gap: 10,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ─── Summary card ─── */
  summaryCard: {
    marginHorizontal: 20,
    marginTop: -48,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#3730a3",
    letterSpacing: 1.2,
  },
  providerName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400e",
  },
  reviewCountText: {
    fontSize: 13,
    fontWeight: "500",
  },
  availBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  availBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emergencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dc2626",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  emergencyText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },

  /* ─── Action grid ─── */
  actionGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* ─── Sections wrapper ─── */
  sectionsWrap: {
    marginTop: 20,
    gap: 14,
    paddingHorizontal: 20,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },

  /* ─── Opening hours ─── */
  openingHoursText: {
    fontSize: 14,
    lineHeight: 22,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  hoursDay: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  slotGroup: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
  },
  hoursTime: {
    fontSize: 13,
    fontWeight: "500",
  },
  offHoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  offHoursText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },

  /* ─── About ─── */
  bioText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "500",
  },

  /* ─── Service rates ─── */
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  rateName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  ratePrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  rateUnit: {
    fontSize: 12,
    fontWeight: "400",
  },

  /* ─── Reviews ─── */
  writeReviewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  writeReviewBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  noReviewsText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },
  seeAllBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
  },
  seeAllBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },

  /* ─── Sticky booking bar ─── */
  bookingBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  messageBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bookNowBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  bookNowText: {
    fontSize: 16,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 20,
    padding: 22,
    maxHeight: "90%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalSubmitBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalSubmitText: {
    fontWeight: "700",
    fontSize: 16,
  },
});
