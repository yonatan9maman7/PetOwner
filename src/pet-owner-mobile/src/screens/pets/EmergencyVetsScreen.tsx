import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Linking,
  Image,
  RefreshControl,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme, type ThemeColors } from "../../theme/ThemeContext";
import { triageApi } from "../../api/client";
import type { NearbyVetDto } from "../../types/api";

const MAX_RESULTS = 15;

type ScreenState = "loading" | "location-denied" | "loaded" | "error";

export function EmergencyVetsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t, isRTL, rtlText } = useTranslation();
  const { colors } = useTheme();

  const [state, setState] = useState<ScreenState>("loading");
  const [vets, setVets] = useState<NearbyVetDto[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchVets = useCallback(
    async (lat: number, lng: number) => {
      try {
        const data = await triageApi.getNearbyVets(lat, lng, MAX_RESULTS);
        setVets(data);
        setState("loaded");
      } catch {
        setState("error");
      }
    },
    [],
  );

  const fetchVetsAndLocation = useCallback(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const c = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCoords(c);
      await fetchVets(c.lat, c.lng);
    } catch {
      setState("error");
    }
  }, [fetchVets]);

  const ensurePermissionAndFetch = useCallback(
    async (showSettingsAlertWhenBlocked: boolean) => {
      setState("loading");
      try {
        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

        if (status === "granted") {
          await fetchVetsAndLocation();
          return;
        }

        if (canAskAgain) {
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          if (newStatus === "granted") {
            await fetchVetsAndLocation();
          } else {
            setState("location-denied");
          }
        } else {
          setState("location-denied");
          if (showSettingsAlertWhenBlocked) {
            Alert.alert(
              t("locationPermissionAlertTitle"),
              t("locationPermissionAlertDesc"),
              [
                { text: t("cancel"), style: "cancel" },
                { text: t("openSettings"), onPress: () => Linking.openSettings() },
              ],
            );
          }
        }
      } catch {
        setState("error");
      }
    },
    [fetchVetsAndLocation, t],
  );

  useEffect(() => {
    ensurePermissionAndFetch(false);
  }, [ensurePermissionAndFetch]);

  const onRefresh = useCallback(async () => {
    if (!coords) return;
    setRefreshing(true);
    await fetchVets(coords.lat, coords.lng);
    setRefreshing(false);
  }, [coords, fetchVets]);

  const openPhone = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`);
  }, []);

  const openDirections = useCallback((lat: number, lng: number) => {
    const url =
      Platform.OS === "ios"
        ? `maps:0,0?q=${lat},${lng}`
        : `geo:0,0?q=${lat},${lng}`;
    Linking.openURL(url);
  }, []);

  const goToProfile = useCallback(
    (providerId: string) => {
      navigation.navigate("ProviderProfile", { providerId });
    },
    [navigation],
  );

  const goToTriage = useCallback(() => {
    navigation.navigate("Triage");
  }, [navigation]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderCard = useCallback(
    ({ item, index }: { item: NearbyVetDto; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 60).duration(400).springify()}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
          onPress={() => goToProfile(item.providerId)}
        >
          {/* Top row: avatar + info */}
          <View style={[styles.cardRow, { flexDirection: rowDirectionForAppLayout(isRTL) }]}>
            <VetAvatar uri={item.profileImageUrl} colors={colors} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.vetName, rtlText]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.address ? (
                <Text style={[styles.vetAddress, rtlText]} numberOfLines={2}>
                  {item.address}
                </Text>
              ) : null}
              <View style={[styles.metaRow, { flexDirection: rowDirectionForAppLayout(isRTL) }]}>
                <View style={[styles.distancePill, { flexDirection: rowDirectionForAppLayout(isRTL) }]}>
                  <Ionicons name="location" size={13} color={colors.primary} />
                  <Text style={styles.distanceText}>
                    {item.distanceKm.toFixed(1)} {t("kmAway")}
                  </Text>
                </View>
                {item.averageRating > 0 && (
                  <View style={[styles.ratingPill, { flexDirection: rowDirectionForAppLayout(isRTL) }]}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.ratingText}>
                      {item.averageRating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Action row */}
          <View style={[styles.actionRow, { flexDirection: rowDirectionForAppLayout(isRTL) }]}>
            {item.phone ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.success + "18" }]}
                onPress={() => openPhone(item.phone!)}
              >
                <Ionicons name="call" size={16} color={colors.success} />
                <Text style={[styles.actionLabel, { color: colors.success }]}>
                  {t("call")}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.primary + "14" }]}
              onPress={() => openDirections(item.latitude, item.longitude)}
            >
              <Ionicons name="navigate" size={16} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.primary }]}>
                {t("directions")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.textSecondary + "14" }]}
              onPress={() => goToProfile(item.providerId)}
            >
              <Ionicons name="person" size={16} color={colors.textSecondary} />
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>
                {t("viewProfile")}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    ),
    [colors, isRTL, rtlText, styles, t, goToProfile, openPhone, openDirections],
  );

  const ListHeader = useMemo(() => <View style={{ height: 8 }} />, []);

  const ListFooter = useMemo(
    () => (
      <Pressable onPress={goToTriage} style={[styles.triageLink, { flexDirection: rowDirectionForAppLayout(isRTL) }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
        <Text style={[styles.triageLinkText, { color: colors.primary }]}>
          {t("aiSymptomCheck")}
        </Text>
        <Ionicons
          name={isRTL ? "chevron-back" : "chevron-forward"}
          size={16}
          color={colors.primary}
        />
      </Pressable>
    ),
    [colors, isRTL, styles, t, goToTriage],
  );

  const ListEmpty = useMemo(
    () =>
      state === "loaded" ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="location-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, rtlText]}>{t("noNearbyVets")}</Text>
          <Text style={[styles.emptySubtitle, rtlText]}>{t("noNearbyVetsHint")}</Text>
        </View>
      ) : null,
    [state, colors, styles, rtlText, t],
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <View style={[styles.headerInner, { flexDirection: rowDirectionForAppLayout(isRTL) }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={22}
              color={colors.text}
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, rtlText]}>{t("emergencyVetsTitle")}</Text>
            <Text style={[styles.headerSub, rtlText]}>{t("emergencyVetsSubtitle")}</Text>
          </View>
          <View style={styles.headerMedkit}>
            <Ionicons name="medkit" size={20} color="#fff" />
          </View>
        </View>
      </Animated.View>

      {/* Body */}
      {state === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, rtlText]}>{t("findingProviders")}</Text>
        </View>
      ) : state === "location-denied" ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="location-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, rtlText]}>{t("locationRequired")}</Text>
          <Pressable
            onPress={() => ensurePermissionAndFetch(true)}
            style={[styles.enableBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.enableBtnText}>{t("enableLocation")}</Text>
          </Pressable>
        </View>
      ) : state === "error" ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, rtlText]}>{t("triageError")}</Text>
          <Pressable
            onPress={() => ensurePermissionAndFetch(false)}
            style={[styles.enableBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={vets}
          keyExtractor={(v) => v.providerId}
          renderItem={renderCard}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={vets.length > 0 ? ListFooter : null}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function VetAvatar({ uri, colors }: { uri?: string | null; colors: ThemeColors }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: colors.primaryLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="medkit" size={26} color={colors.primary} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primaryLight }}
      onError={() => setFailed(true)}
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    headerInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    headerSub: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textSecondary,
      marginTop: 1,
    },
    headerMedkit: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: "#dc2626",
      alignItems: "center",
      justifyContent: "center",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      padding: 32,
    },
    loadingText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
      marginTop: 4,
    },

    card: {
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    cardRow: {
      flexDirection: "row",
      gap: 14,
      alignItems: "flex-start",
    },
    vetName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    vetAddress: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 17,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 6,
    },
    distancePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    distanceText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
    },
    ratingPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    ratingText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#f59e0b",
    },

    actionRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: 12,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 8,
      borderRadius: 10,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: "600",
    },

    triageLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 20,
      marginTop: 6,
      marginBottom: 16,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primary + "30",
      backgroundColor: colors.primary + "08",
    },
    triageLinkText: {
      fontSize: 14,
      fontWeight: "600",
    },

    emptyWrap: {
      alignItems: "center",
      gap: 10,
      paddingTop: 60,
      paddingHorizontal: 32,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.textSecondary,
      textAlign: "center",
    },

    enableBtn: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 4,
    },
    enableBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#fff",
    },
  });
}
