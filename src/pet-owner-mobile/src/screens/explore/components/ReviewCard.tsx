import { useState } from "react";
import { View, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/ThemeContext";
import { useTranslation, type TranslationKey, rowDirectionForAppLayout } from "../../../i18n";
import type { ReviewDto } from "../../../types/api";

const STAR_COLOR = "#f59e0b";

function ReviewerAvatar({ uri, size = 28 }: { uri?: string | null; size?: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const half = size / 2;

  if (!uri || failed) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: half,
          backgroundColor: colors.primaryLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="person" size={size * 0.46} color={colors.text} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: size,
        borderRadius: half,
        backgroundColor: colors.primaryLight,
      }}
      onError={() => setFailed(true)}
    />
  );
}

function relativeReviewLabel(iso: string, t: (key: TranslationKey) => string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 2) return t("reviewJustNow");
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("reviewHoursAgo").replace("{hours}", String(hrs));
  const days = Math.floor(hrs / 24);
  if (days < 30) return t("reviewDaysAgo").replace("{days}", String(days));
  return new Date(iso).toLocaleDateString();
}

interface ReviewCardProps {
  review: ReviewDto;
  /** First item in a list often has no top border */
  borderTop?: boolean;
  avatarSize?: number;
}

export function ReviewCard({ review, borderTop = true, avatarSize = 28 }: ReviewCardProps) {
  const { colors } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();

  return (
    <View
      style={{
        paddingVertical: 12,
        borderTopWidth: borderTop ? 1 : 0,
        borderTopColor: colors.borderLight,
      }}
    >
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <ReviewerAvatar uri={review.reviewerAvatar} size={avatarSize} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}
            numberOfLines={1}
          >
            {review.reviewerName}
          </Text>
          <Text
            className="text-xs mt-0.5"
            style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}
          >
            {relativeReviewLabel(review.createdAt, t)}
          </Text>
        </View>
        <View className="flex-row items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons
              key={i}
              name={i < review.rating ? "star" : "star-outline"}
              size={12}
              color={STAR_COLOR}
            />
          ))}
        </View>
      </View>
      {review.isVerified ? (
        <View
          className="self-start mb-1 px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: colors.successLight,
            alignSelf: isRTL ? "flex-end" : "flex-start",
          }}
        >
          <Text className="text-[10px] font-bold" style={{ color: colors.success }}>
            {t("reviewVerified")}
          </Text>
        </View>
      ) : null}
      <Text style={[rtlText, { color: colors.textSecondary }]} className="text-xs leading-5">
        {review.comment}
      </Text>
    </View>
  );
}
