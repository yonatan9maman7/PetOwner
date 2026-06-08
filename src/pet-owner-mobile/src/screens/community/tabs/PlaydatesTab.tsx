import { memo, useCallback } from "react";
import { View, Text, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme/ThemeContext";
import { useCommunityStyles } from "../communityStyles";
import { ListEmptyState, ScreenLoadingCenter } from "../../../components/shared";
import { SectionHeader } from "./SectionHeader";
import type { PlaydateEventDto, RsvpStatusValue, PetDto } from "../../../types/api";
import type { CopyKey } from "../communityShared";
import { formatDateTime } from "../communityShared";

interface PlaydatesTabProps {
  playdates: PlaydateEventDto[];
  playdatesLoading: boolean;
  bottomContentPadding: number;
  selectedPet: PetDto | null;
  onRefresh: () => void;
  onCreatePlaydate: () => void;
  onRsvp: (event: PlaydateEventDto, status: RsvpStatusValue) => void;
  onOpenComments: (event: PlaydateEventDto) => void;
  copy: (key: CopyKey) => string;
}

export const PlaydatesTab = memo(function PlaydatesTab({
  playdates,
  playdatesLoading,
  bottomContentPadding,
  onRefresh,
  onCreatePlaydate,
  onRsvp,
  onOpenComments,
  copy,
}: PlaydatesTabProps) {
  const { colors } = useTheme();
  const styles = useCommunityStyles();
  const { rtlText, rtlRow, isRTL } = useTranslation();
  const appRowDirection = isRTL ? "row-reverse" as const : "row" as const;

  const renderItem = useCallback(
    ({ item: event }: { item: PlaydateEventDto; index: number }) => (
      <View style={styles.card}>
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
                onPress={() => onRsvp(event, status)}
                style={[styles.rsvpButton, active && styles.rsvpButtonActive]}
              >
                <Text style={[styles.rsvpText, active && styles.rsvpTextActive]}>
                  {status === "Going" ? copy("going") : status === "Maybe" ? copy("maybe") : copy("notGoing")}
                </Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => onOpenComments(event)} style={[styles.actionBtn, rtlRow]}>
            <Ionicons name="chatbubble-outline" size={17} color={colors.textSecondary} />
            <Text style={styles.actionText}>{copy("comments")}</Text>
          </Pressable>
        </View>
      </View>
    ),
    [styles, rtlText, rtlRow, appRowDirection, colors, copy, onRsvp, onOpenComments],
  );

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        data={playdates}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <SectionHeader
            title={copy("dogPlaydatesTitle")}
            subtitle={copy("dogPlaydatesSub")}
            actionLabel={copy("createPlaydate")}
            onAction={onCreatePlaydate}
          />
        }
        ListEmptyComponent={
          playdatesLoading ? (
            <ScreenLoadingCenter spinnerSize={60} fill={false} style={{ paddingTop: 40 }} title={copy("dogPlaydatesTitle")} />
          ) : (
            <ListEmptyState icon="calendar-outline" title={copy("noPlaydates")} message={copy("noPlaydatesSub")} />
          )
        }
        contentContainerStyle={{ paddingBottom: bottomContentPadding }}
        refreshControl={
          <RefreshControl refreshing={playdatesLoading} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.text]} />
        }
      />
    </View>
  );
});
