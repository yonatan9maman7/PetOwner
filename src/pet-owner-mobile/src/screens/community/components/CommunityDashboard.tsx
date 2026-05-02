import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TranslationKey } from "../../../i18n";
import { useTheme } from "../../../theme/ThemeContext";
import type { ThemeColors } from "../../../theme/ThemeContext";
import type { PlaydateEventDto } from "../../../types/api";

type TFn = (key: TranslationKey) => string;

export interface CommunityDashboardProps {
  t: TFn;
  rtlText: { textAlign: "left" | "right"; writingDirection: "ltr" | "rtl" };
  rowDirection: "row" | "row-reverse";
  activeDogsNearby: number;
  upcomingMeetups: PlaydateEventDto[];
  /** When set and there is no local meetup preview, show this count on the meetups tile. */
  apiUpcomingMeetupCount?: number | null;
  openQuestionsCount: number;
  activeParksCount: number;
  sosCount: number;
  onPressMeetups?: () => void;
  onPressParks?: () => void;
  onPressQuestions?: () => void;
  onPressSos?: () => void;
}

function StatTile({
  icon,
  label,
  value,
  onPress,
  colors,
  rtlText,
  rowDirection,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  colors: ThemeColors;
  rtlText: CommunityDashboardProps["rtlText"];
  rowDirection: CommunityDashboardProps["rowDirection"];
}) {
  const content = (
    <View
      style={{
        flexDirection: rowDirection,
        alignItems: "center",
        gap: 10,
        backgroundColor: colors.surface,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        flex: 1,
        minWidth: 0,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.surfaceSecondary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }, rtlText]} numberOfLines={2}>
          {label}
        </Text>
        <Text style={[{ fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 2 }, rtlText]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={{ flex: 1, minWidth: 0 }}>
        {content}
      </Pressable>
    );
  }
  return <View style={{ flex: 1, minWidth: 0 }}>{content}</View>;
}

export function CommunityDashboard({
  t,
  rtlText,
  rowDirection,
  activeDogsNearby,
  upcomingMeetups,
  apiUpcomingMeetupCount,
  openQuestionsCount,
  activeParksCount,
  sosCount,
  onPressMeetups,
  onPressParks,
  onPressQuestions,
  onPressSos,
}: CommunityDashboardProps) {
  const { colors } = useTheme();
  const meetupPreview =
    upcomingMeetups.length > 0
      ? upcomingMeetups[0]!.title
      : apiUpcomingMeetupCount != null && apiUpcomingMeetupCount > 0
        ? String(apiUpcomingMeetupCount)
        : t("cm_dashboard_none");

  const rowStyle = { flexDirection: rowDirection as "row" | "row-reverse", gap: 10, marginBottom: 10 };

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
      <Text style={[{ fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 8 }, rtlText]}>
        {t("cm_dashboard_title")}
      </Text>
      <View style={rowStyle}>
        <StatTile
          icon="paw-outline"
          label={t("cm_dashboard_active_dogs")}
          value={String(activeDogsNearby)}
          colors={colors}
          rtlText={rtlText}
          rowDirection={rowDirection}
        />
        <StatTile
          icon="calendar-outline"
          label={t("cm_dashboard_upcoming_meetups")}
          value={meetupPreview}
          onPress={onPressMeetups}
          colors={colors}
          rtlText={rtlText}
          rowDirection={rowDirection}
        />
      </View>
      <View style={rowStyle}>
        <StatTile
          icon="help-circle-outline"
          label={t("cm_dashboard_open_questions")}
          value={String(openQuestionsCount)}
          onPress={onPressQuestions}
          colors={colors}
          rtlText={rtlText}
          rowDirection={rowDirection}
        />
        <StatTile
          icon="leaf-outline"
          label={t("cm_dashboard_active_parks")}
          value={String(activeParksCount)}
          onPress={onPressParks}
          colors={colors}
          rtlText={rtlText}
          rowDirection={rowDirection}
        />
      </View>
      <View style={rowStyle}>
        <StatTile
          icon="warning-outline"
          label={t("cm_dashboard_sos")}
          value={String(sosCount)}
          onPress={onPressSos}
          colors={colors}
          rtlText={rtlText}
          rowDirection={rowDirection}
        />
        <View style={{ flex: 1 }} />
      </View>
    </View>
  );
}
