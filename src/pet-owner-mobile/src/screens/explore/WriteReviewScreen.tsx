import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation, type TranslationKey, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useReviewsStore } from "../../store/reviewsStore";
import { bookingsApi } from "../../api/client";
import { StarRatingInput } from "./components/StarRatingInput";
import { InlineError } from "../../components/shared";
import { formInputStyle } from "../pets/MyPets/helpers";

function errMsg(msg: string | undefined, tr: (k: TranslationKey) => string): string {
  if (!msg) return "";
  return tr(msg as TranslationKey);
}

const reviewFormSchema = z.object({
  rating: z
    .number()
    .min(1, "reviewValidationRating")
    .max(5, "reviewValidationRating"),
  comment: z
    .string()
    .min(10, "reviewValidationComment")
    .max(1000, "reviewValidationCommentMax"),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export function WriteReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const bookingIdParam = route.params?.bookingId as string | undefined;
  const providerId = route.params?.providerId as string;
  const providerName = (route.params?.providerName as string) ?? "";

  const { colors } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);

  const [resolvingBooking, setResolvingBooking] = useState(!bookingIdParam);
  const [resolvedBookingId, setResolvedBookingId] = useState<string | null>(bookingIdParam ?? null);

  const submitBookingReview = useReviewsStore((s) => s.submitBookingReview);
  const submitting = useReviewsStore((s) => s.submitting);
  const submitError = useReviewsStore((s) => s.submitError);
  const clearSubmitError = useReviewsStore((s) => s.clearSubmitError);

  useEffect(() => {
    clearSubmitError();
  }, [clearSubmitError]);

  const resolver = useMemo(() => zodResolver(reviewFormSchema), []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver,
    defaultValues: { rating: 0, comment: "" },
  });

  useEffect(() => {
    if (bookingIdParam) {
      setResolvedBookingId(bookingIdParam);
      setResolvingBooking(false);
      return;
    }
    if (!providerId || !userId) {
      setResolvingBooking(false);
      return;
    }
    let cancelled = false;
    setResolvingBooking(true);
    (async () => {
      try {
        const list = await bookingsApi.getMine();
        if (cancelled) return;
        const eligible = list.find(
          (b) =>
            b.ownerId === userId &&
            b.providerProfileId === providerId &&
            !b.hasReview &&
            b.status === "Completed",
        );
        setResolvedBookingId(eligible?.id ?? null);
      } catch {
        if (!cancelled) {
          setResolvedBookingId(null);
        }
      } finally {
        if (!cancelled) setResolvingBooking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingIdParam, providerId, userId]);

  const onSubmit = handleSubmit(async (data) => {
    if (!resolvedBookingId || !providerId) return;
    const ok = await submitBookingReview(
      {
        bookingId: resolvedBookingId,
        rating: data.rating,
        comment: data.comment.trim(),
      },
      providerId,
    );
    if (ok) {
      showGlobalAlertCompat(t("reviewSubmitSuccess"), t("reviewSubmitSuccessMessage"), [
        { text: t("confirmAction"), onPress: () => navigation.goBack() },
      ]);
    }
  });

  const goBookings = useCallback(() => {
    const tab = navigation.getParent();
    if (tab) {
      tab.dispatch(
        CommonActions.navigate({
          name: "Profile",
          params: { screen: "MyBookings" },
        }),
      );
    } else {
      navigation.navigate("MyBookings");
    }
  }, [navigation]);

  if (!providerId) {
    return (
      <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: colors.background }}>
        <Text className="p-5" style={{ color: colors.textMuted }}>
          {t("genericError")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" edges={["top"]} style={{ marginTop: -8, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
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
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <Text
          style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center" }}
          numberOfLines={1}
        >
          {t("writeReviewTitle")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {resolvingBooking ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !resolvedBookingId ? (
          <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} style={{ alignSelf: "center" }} />
            <Text style={[rtlText, { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" }]}>
              {t("reviewNoBookingTitle")}
            </Text>
            <Text style={[rtlText, { color: colors.textSecondary, marginTop: 8, textAlign: "center", lineHeight: 22 }]}>
              {t("reviewNoBookingSubtitle")}
            </Text>
            <Pressable
              onPress={goBookings}
              className="mt-8 py-4 rounded-2xl items-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="font-bold" style={{ color: colors.primaryText }}>
                {t("reviewGoToBookings")}
              </Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            className="flex-1 px-5 pt-4"
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[rtlText, { color: colors.textSecondary, fontSize: 15, marginBottom: 20 }]} className="font-semibold">
              {providerName}
            </Text>

            {submitError ? <InlineError message={submitError} /> : null}

            <Text
              className="text-xs font-bold uppercase tracking-wide mb-2"
              style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}
            >
              {t("reviewRatingLabel")}
            </Text>
            <Controller
              control={control}
              name="rating"
              render={({ field: { value, onChange } }) => (
                <View className="mb-1">
                  <StarRatingInput
                    value={value}
                    onChange={onChange}
                    size={40}
                    isRTL={isRTL}
                    accessibilityLabel={t("reviewRatingLabel")}
                  />
                  {errors.rating ? (
                    <Text className="mt-2 text-xs" style={{ color: colors.danger }}>
                      {errMsg(errors.rating.message, t)}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Text
              className="text-xs font-bold uppercase tracking-wide mb-2 mt-6"
              style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}
            >
              {t("reviewCommentLabel")}
            </Text>
            <Controller
              control={control}
              name="comment"
              render={({ field: { value, onChange } }) => (
                <View>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={t("reviewCommentPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={6}
                    style={[formInputStyle(isRTL, colors), { minHeight: 140, textAlignVertical: "top" }]}
                  />
                  {errors.comment ? (
                    <Text className="mt-1 text-xs" style={{ color: colors.danger }}>
                      {errMsg(errors.comment.message, t)}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              className="mt-8 py-4 rounded-2xl items-center"
              style={{
                backgroundColor: submitting ? colors.primaryLight : colors.primary,
                opacity: submitting ? 0.85 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text className="font-bold" style={{ color: colors.primaryText }}>
                  {t("reviewSubmit")}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
