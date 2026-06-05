import { useRef, useEffect, memo, useCallback } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FlatList, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { PetDto } from "../../../../types/api";
import type { Section } from "../types";
import type { ActivePetSummary } from "../hooks/useActivePetSummary";
import { TriageWidget } from "./TriageWidget";
import { VaccineRingWidget } from "./VaccineRingWidget";
import { WeightTrendWidget } from "./WeightTrendWidget";
import { RecordsWidget } from "./RecordsWidget";
import { ActivityWidget } from "./ActivityWidget";
import { PetInfoWidget } from "./PetInfoWidget";

interface HealthHubListProps {
  activePet: PetDto | null;
  summary: ActivePetSummary;
  onSelectSection: (s: Section) => void;
  onOpenTriage: () => void;
}

type WidgetItem = { key: string; node: React.ReactElement };

function HealthHubListInner({ activePet, summary, onSelectSection, onOpenTriage }: HealthHubListProps) {
  const navigation = useNavigation<any>();
  const disabled = !activePet;
  const petId = activePet?.id;

  const hasMountedRef = useRef(false);
  useEffect(() => { hasMountedRef.current = true; }, []);

  const widgets: WidgetItem[] = [
    {
      key: "triage",
      node: (
        <TriageWidget
          onOpenTriage={onOpenTriage}
          onOpenHistory={() => { if (!disabled) onSelectSection("triage"); }}
          disabled={disabled}
        />
      ),
    },
    {
      key: "vaccines",
      node: (
        <VaccineRingWidget
          pet={activePet}
          vaccineStatuses={summary.vaccineStatuses}
          onPress={() => { if (!disabled) onSelectSection("vaccines"); }}
          disabled={disabled}
        />
      ),
    },
    {
      key: "weight",
      node: (
        <WeightTrendWidget
          pet={activePet}
          weightHistory={summary.weightHistory}
          onPress={() => { if (!disabled) onSelectSection("weight"); }}
          disabled={disabled}
        />
      ),
    },
    {
      key: "records",
      node: (
        <RecordsWidget
          pet={activePet}
          medicalRecords={summary.medicalRecords}
          onPress={() => { if (!disabled) onSelectSection("records"); }}
          disabled={disabled}
        />
      ),
    },
    {
      key: "activity",
      node: (
        <ActivityWidget
          pet={activePet}
          summary={summary.activitySummary}
          petId={petId}
          onPress={() => {
            if (!disabled && petId) navigation.navigate("ActivityLog", { petId });
          }}
          disabled={disabled}
        />
      ),
    },
    {
      key: "info",
      node: (
        <PetInfoWidget
          pet={activePet}
          onPress={() => { if (!disabled) onSelectSection("health"); }}
          disabled={disabled}
        />
      ),
    },
  ];

  const renderItem = useCallback(
    ({ item, index }: { item: WidgetItem; index: number }) => (
      <Animated.View
        entering={
          !hasMountedRef.current
            ? FadeInDown.delay(index * 50).springify().damping(18)
            : undefined
        }
      >
        {item.node}
      </Animated.View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: WidgetItem) => item.key, []);

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
      <FlatList
        data={widgets}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

export const HealthHubList = memo(HealthHubListInner);
