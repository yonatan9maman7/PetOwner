import { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
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

function StatChip({
  icon,
  label,
  value,
  a11yLabel,
  onPress,
  colors,
  rtlText,
  valueEmphasis,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  a11yLabel: string;
  onPress?: () => void;
  colors: ThemeColors;
  rtlText: CommunityDashboardProps["rtlText"];
  valueEmphasis?: "warning" | "default";
}) {
  const valueColor = valueEmphasis === "warning" ? colors.warning : colors.text;

  const inner = (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        minWidth: 52,
        paddingVertical: 4,
        paddingHorizontal: 6,
        gap: 2,
      }}
    >
      <Ionicons name={icon} size={16} color={valueEmphasis === "warning" ? colors.warning : colors.text} />
      <Text style={{ fontSize: 13, fontWeight: "800", color: valueColor }} numberOfLines={1}>
        {value}
      </Text>
      <Text
        style={[{ fontSize: 9, fontWeight: "600", color: colors.textMuted, textAlign: "center" }, rtlText]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={({ pressed }) => ({
          opacity: pressed ? 0.75 : 1,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.borderLight,
          backgroundColor: colors.surfaceSecondary,
        })}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={{
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surfaceSecondary,
      }}
    >
      {inner}
    </View>
  );
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

  const meetupDisplay = useMemo(() => {
    if (upcomingMeetups.length > 0) return String(upcomingMeetups.length);
    if (apiUpcomingMeetupCount != null && apiUpcomingMeetupCount > 0) return String(apiUpcomingMeetupCount);
    return "0";
  }, [upcomingMeetups.length, apiUpcomingMeetupCount]);

  const meetupA11y = useMemo(() => {
    const n = upcomingMeetups.length > 0 ? upcomingMeetups.length : apiUpcomingMeetupCount ?? 0;
    const title = upcomingMeetups[0]?.title;
    if (n === 0) return `${t("cm_dashboard_upcoming_meetups")}: ${t("cm_dashboard_none")}`;
    return title
      ? `${t("cm_dashboard_upcoming_meetups")}: ${n}. ${title}`
      : `${t("cm_dashboard_upcoming_meetups")}: ${n}`;
  }, [upcomingMeetups, apiUpcomingMeetupCount, t]);

  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surface,
        paddingVertical: 4,
        paddingHorizontal: 6,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        maxHeight: 72,
        overflow: "hidden",
      }}
    >
      <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6, marginBottom: 2 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: "800",
            color: colors.textMuted,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
          numberOfLines={1}
        >
          {t("cm_db_strip_label")}
        </Text>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: rowDirection,
          alignItems: "stretch",
          gap: 6,
          paddingBottom: 2,
          paddingHorizontal: 2,
        }}
      >
        <StatChip
          icon="paw-outline"
          label={t("cm_db_chip_dogs")}
          value={String(activeDogsNearby)}
          a11yLabel={`${t("cm_dashboard_active_dogs")}: ${activeDogsNearby}`}
          colors={colors}
          rtlText={rtlText}
        />
        <StatChip
          icon="calendar-outline"
          label={t("cm_db_chip_meetups")}
          value={meetupDisplay}
          a11yLabel={meetupA11y}
          onPress={onPressMeetups}
          colors={colors}
          rtlText={rtlText}
        />
        <StatChip
          icon="leaf-outline"
          label={t("cm_db_chip_parks")}
          value={String(activeParksCount)}
          a11yLabel={`${t("cm_dashboard_active_parks")}: ${activeParksCount}`}
          onPress={onPressParks}
          colors={colors}
          rtlText={rtlText}
        />
        <StatChip
          icon="help-circle-outline"
          label={t("cm_db_chip_qa")}
          value={String(openQuestionsCount)}
          a11yLabel={`${t("cm_dashboard_open_questions")}: ${openQuestionsCount}`}
          onPress={onPressQuestions}
          colors={colors}
          rtlText={rtlText}
        />
        <StatChip
          icon="warning-outline"
          label={t("cm_db_chip_sos")}
          value={String(sosCount)}
          a11yLabel={`${t("cm_dashboard_sos")}: ${sosCount}`}
          onPress={onPressSos}
          colors={colors}
          rtlText={rtlText}
          valueEmphasis={sosCount > 0 ? "warning" : "default"}
        />
      </ScrollView>
    </View>
  );
}
