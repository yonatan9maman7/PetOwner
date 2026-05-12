import { memo } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme/ThemeContext";
import { useCommunityStyles } from "../communityStyles";
import { ListEmptyState, ScreenLoadingCenter } from "../../../components/shared";
import { SectionHeader } from "./SectionHeader";
import type { LiveBeaconDto } from "../../../types/api";
import type { CopyKey, DogPark } from "../communityShared";
import { activityLabel } from "../communityShared";

interface ParksTabProps {
  parks: DogPark[];
  parksLoading: boolean;
  beacons: LiveBeaconDto[];
  beaconsLoading: boolean;
  myBeaconId: string | null;
  parkCheckins: Record<string, boolean>;
  checkingInPark: DogPark | null;
  bottomContentPadding: number;
  onRefresh: () => Promise<void>;
  onCheckIn: (park: DogPark) => void;
  onRemoveBeacon: () => void;
  onViewPark: (park: DogPark) => void;
  onCreatePlaydateAtPark: (parkName: string) => void;
  copy: (key: CopyKey) => string;
}

export const ParksTab = memo(function ParksTab({
  parks,
  parksLoading,
  beacons,
  beaconsLoading,
  myBeaconId,
  parkCheckins,
  checkingInPark,
  bottomContentPadding,
  onRefresh,
  onCheckIn,
  onRemoveBeacon,
  onViewPark,
  onCreatePlaydateAtPark,
  copy,
}: ParksTabProps) {
  const { colors } = useTheme();
  const styles = useCommunityStyles();
  const { rtlText, rtlRow, isRTL } = useTranslation();
  const appRowDirection = isRTL ? "row-reverse" as const : "row" as const;
  const navigation = useNavigation<any>();

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={beaconsLoading || parksLoading}
          onRefresh={onRefresh}
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
        onAction={myBeaconId ? onRemoveBeacon : parks[0] ? () => onCheckIn(parks[0]) : undefined}
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
        <ScreenLoadingCenter spinnerSize={60} fill={false} style={{ paddingTop: 40 }} title={copy("parksTitle")} />
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
                  onPress={() => (checkedIn ? onRemoveBeacon() : onCheckIn(park))}
                  disabled={checkingInPark?.id === park.id}
                  style={[styles.primarySmallBtn, checkingInPark?.id === park.id && { opacity: 0.6 }]}
                >
                  <Text style={styles.primarySmallText}>
                    {checkedIn ? copy("removeCheckIn") : copy("checkIn")}
                  </Text>
                </Pressable>
                <Pressable onPress={() => onViewPark(park)} style={styles.smallOutlineBtn}>
                  <Text style={styles.smallOutlineText}>{copy("viewPark")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => onCreatePlaydateAtPark(park.name)}
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
});
