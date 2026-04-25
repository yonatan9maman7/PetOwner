import { useCallback, useState, useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { usePetsStore } from "../../store/petsStore";
import { useActivitiesStore } from "../../store/activitiesStore";
import type { ActivityDto } from "../../types/api";
import { ListSkeleton } from "../../components/shared/ListSkeleton";
import { ListEmptyState } from "../../components/shared/ListEmptyState";
import { InlineError } from "../../components/shared/InlineError";
import { ActivityLogSectionShell } from "./components/ActivityLogSectionShell";
import { AddActivityModal, type CreateableActivityType } from "./components/AddActivityModal";

function activityIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "Walk":
      return "footsteps";
    case "Meal":
      return "restaurant";
    case "Weight":
      return "scale";
    case "Exercise":
      return "barbell";
    case "Grooming":
      return "cut";
    default:
      return "ellipse";
  }
}

function activityListWhenLabel(isoDate: string, withTime: boolean): string {
  const d = new Date(isoDate);
  if (withTime) {
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toLocaleDateString();
}

function activityTypeLabel(type: string, t: (k: import("../../i18n").TranslationKey) => string): string {
  switch (type) {
    case "Walk":
      return t("activityTypeWalk");
    case "Meal":
      return t("activityTypeMeal");
    case "Weight":
      return t("activityTypeWeight");
    case "Exercise":
      return t("activityTypeExercise");
    case "Grooming":
      return t("activityTypeGrooming");
    default:
      return type;
  }
}

function ActivityRow({
  item,
  isRTL,
  colors,
  t,
}: {
  item: ActivityDto;
  isRTL: boolean;
  colors: import("../../theme/ThemeContext").ThemeColors;
  t: (k: import("../../i18n").TranslationKey) => string;
}) {
  const meta = `${activityTypeLabel(item.type, t)} · ${activityListWhenLabel(item.date, item.type === "Meal")}`;
  const detail =
    item.type === "Walk" || item.type === "Exercise"
      ? item.durationMinutes != null
        ? `${item.durationMinutes} min`
        : ""
      : item.type === "Weight" && item.value != null
        ? `${item.value} ${t("weightKg")}`
        : "";

  return (
    <View
      className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl border px-3.5 py-3.5"
      style={{
        flexDirection: rowDirectionForAppLayout(isRTL),
        backgroundColor: colors.surface,
        borderColor: colors.borderLight,
      }}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: colors.primaryLight }}
      >
        <Ionicons name={activityIcon(item.type)} size={22} color={colors.primary} />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className="text-[15px] font-bold"
          style={{ color: colors.text, textAlign: isRTL ? "right" : "left" }}
          numberOfLines={1}
        >
          {meta}
        </Text>
        {detail ? (
          <Text
            className="mt-0.5 text-xs"
            style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}
          >
            {detail}
          </Text>
        ) : null}
        {item.notes ? (
          <Text
            className="mt-1 text-xs leading-[18px]"
            style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}
            numberOfLines={2}
          >
            {item.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function ActivityLogScreen() {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: string; params?: { petId?: string } }>();
  const petId = route.params?.petId;

  const pets = usePetsStore((s) => s.pets);
  const pet = petId ? pets.find((p) => p.id === petId) ?? null : null;

  const bucket = useActivitiesStore((s) => (petId ? s.byPetId[petId] : undefined));
  const items = bucket?.items ?? [];
  const summary = bucket?.summary ?? null;
  const loading = bucket?.loading ?? false;
  const summaryLoading = bucket?.summaryLoading ?? false;
  const error = bucket?.error ?? null;

  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<CreateableActivityType>("Walk");

  const reload = useCallback(async () => {
    if (!petId) return;
    await Promise.all([
      useActivitiesStore.getState().fetchActivities(petId),
      useActivitiesStore.getState().fetchSummary(petId),
    ]);
  }, [petId]);

  useFocusEffect(
    useCallback(() => {
      if (!petId) {
        navigation.goBack();
        return;
      }
      void reload();
    }, [petId, navigation, reload]),
  );

  const onRefresh = useCallback(async () => {
    if (!petId) return;
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [petId, reload]);

  const openModal = useCallback((type: CreateableActivityType) => {
    setModalType(type);
    setModalOpen(true);
  }, []);

  const latestWeight =
    summary?.weightHistory?.length && summary.weightHistory.length > 0
      ? summary.weightHistory[summary.weightHistory.length - 1]!
      : null;

  const ListHeader = useMemo(
    () => (
      <View className="pb-2">
        <View
          className="mx-4 mt-3 rounded-2xl border p-4"
          style={{
            backgroundColor: colors.cardHighlight,
            borderColor: colors.borderLight,
          }}
        >
          <View className="mb-2 flex-row items-center justify-between" style={{ flexDirection: rowDirectionForAppLayout(isRTL) }}>
            <Text className="text-base font-extrabold" style={{ color: colors.text }}>
              {t("activitySummarySection")}
            </Text>
            {summaryLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>
          {!summaryLoading && summary ? (
            <View className="gap-1.5">
              <Text className="text-sm" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {t("activityWalkSummaryLine")
                  .replace("{count}", String(summary.totalWalks))
                  .replace("{minutes}", String(summary.totalWalkMinutes))}
              </Text>
              <Text className="text-sm" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {t("activityMealsSummaryLine").replace("{count}", String(summary.totalMeals))}
              </Text>
              <Text className="text-sm" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {t("activityExerciseSummaryLine")
                  .replace("{sessions}", String(summary.totalExercises))
                  .replace("{minutes}", String(summary.totalExerciseMinutes))}
              </Text>
              {latestWeight ? (
                <Text className="text-sm font-semibold" style={{ color: colors.text, textAlign: isRTL ? "right" : "left" }}>
                  {t("activityLatestWeightLine")
                    .replace("{value}", String(latestWeight.value))
                    .replace("{date}", new Date(latestWeight.date).toLocaleDateString())}
                </Text>
              ) : null}
              <Text className="text-sm" style={{ color: colors.primary, textAlign: isRTL ? "right" : "left" }}>
                {t("activityStreakLine").replace("{days}", String(summary.currentStreak))}
              </Text>
            </View>
          ) : !summaryLoading ? (
            <Text className="text-sm" style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}>
              {t("activitySummaryEmpty")}
            </Text>
          ) : null}
        </View>

        <View
          className="mx-4 mt-4 flex-row justify-between gap-2"
          style={{ flexDirection: rowDirectionForAppLayout(isRTL) }}
        >
          <Pressable
            accessibilityLabel={t("activityQuickWalkA11y")}
            onPress={() => openModal("Walk")}
            className="flex-1 items-center rounded-2xl border py-3"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderLight }}
          >
            <Text className="text-2xl">🦮</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t("activityQuickMealA11y")}
            onPress={() => openModal("Meal")}
            className="flex-1 items-center rounded-2xl border py-3"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderLight }}
          >
            <Text className="text-2xl">🥩</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t("activityQuickExerciseA11y")}
            onPress={() => openModal("Exercise")}
            className="flex-1 items-center rounded-2xl border py-3"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderLight }}
          >
            <Text className="text-2xl">🎾</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t("activityQuickGroomingA11y")}
            onPress={() => openModal("Grooming")}
            className="flex-1 items-center rounded-2xl border py-3"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderLight }}
          >
            <Text className="text-2xl">🛁</Text>
          </Pressable>
        </View>

        {error ? (
          <View className="mt-2 px-1">
            <InlineError message={error} onRetry={() => void reload()} />
          </View>
        ) : null}
      </View>
    ),
    [
      colors,
      isRTL,
      t,
      summary,
      summaryLoading,
      error,
      latestWeight,
      openModal,
      reload,
    ],
  );

  if (!petId) {
    return null;
  }

  return (
    <ActivityLogSectionShell pet={pet} onBack={() => navigation.goBack()}>
      <FlashList<ActivityDto>
        className="flex-1"
        data={items}
        keyExtractor={(a) => a.id}
        extraData={{ isRTL, colors }}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          loading ? (
            <View className="px-4 pt-2">
              <ListSkeleton rows={6} variant="row" />
            </View>
          ) : error ? (
            <View className="h-4" />
          ) : (
            <View className="flex-1 justify-center px-6 pt-6">
              <ListEmptyState
                icon="footsteps-outline"
                title={t("activityEmptyTitle")}
                message={t("activityEmptySubtitle")}
              />
            </View>
          )
        }
        renderItem={({ item }) => (
          <ActivityRow item={item} isRTL={isRTL} colors={colors} t={t} />
        )}
      />

      <AddActivityModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        petId={petId}
        initialType={modalType}
        onCreated={() => void reload()}
      />
    </ActivityLogSectionShell>
  );
}
