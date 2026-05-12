import { memo } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme/ThemeContext";
import { useCommunityStyles } from "../communityStyles";
import { ListEmptyState, ScreenLoadingCenter } from "../../../components/shared";
import { SectionHeader } from "./SectionHeader";
import type { PlaydateEventDto } from "../../../types/api";
import type { CopyKey } from "../communityShared";
import { formatDateTime } from "../communityShared";

interface EventsTabProps {
  playdates: PlaydateEventDto[];
  playdatesLoading: boolean;
  bottomContentPadding: number;
  onRefresh: () => void;
  onCreatePlaydate: () => void;
  onJoinEvent: (event: PlaydateEventDto) => void;
  copy: (key: CopyKey) => string;
}

export const EventsTab = memo(function EventsTab({
  playdates,
  playdatesLoading,
  bottomContentPadding,
  onRefresh,
  onCreatePlaydate,
  onJoinEvent,
  copy,
}: EventsTabProps) {
  const { colors } = useTheme();
  const styles = useCommunityStyles();
  const { rtlText, rtlRow, isRTL } = useTranslation();
  const appRowDirection = isRTL ? "row-reverse" as const : "row" as const;

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={playdatesLoading} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.text]} />}
      contentContainerStyle={{ paddingBottom: bottomContentPadding }}
    >
      <SectionHeader
        title={copy("eventsTitle")}
        subtitle={copy("eventsSub")}
        actionLabel={copy("createPlaydate")}
        onAction={onCreatePlaydate}
      />
      {playdatesLoading && playdates.length === 0 ? (
        <ScreenLoadingCenter spinnerSize={60} fill={false} style={{ paddingTop: 40 }} title={copy("eventsTitle")} />
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
                <Text style={styles.metaPill}>
                  {event.maxPets ? `${event.maxPets} ${copy("maxParticipants")}` : copy("allSizes")}
                </Text>
                <Text style={styles.metaPill}>{spotsLeft} {copy("spotsLeft")}</Text>
                <Text style={styles.metaPill}>{event.goingCount} {copy("dogsAttending")}</Text>
              </View>
              <Pressable onPress={() => onJoinEvent(event)} style={joined ? styles.smallOutlineBtn : styles.primarySmallBtn}>
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
});
