import Animated, { FadeInDown } from "react-native-reanimated";
import { View } from "react-native";
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

export function HealthHubList({ activePet, summary, onSelectSection, onOpenTriage }: HealthHubListProps) {
  const navigation = useNavigation<any>();
  const disabled = !activePet;
  const petId = activePet?.id;
  const key = petId ?? "none";

  const widgets = [
    <TriageWidget
      key="triage"
      onOpenTriage={onOpenTriage}
      onOpenHistory={() => { if (!disabled) onSelectSection("triage"); }}
      disabled={disabled}
    />,
    <VaccineRingWidget
      key="vaccines"
      vaccineStatuses={summary.vaccineStatuses}
      onPress={() => { if (!disabled) onSelectSection("vaccines"); }}
      disabled={disabled}
    />,
    <WeightTrendWidget
      key="weight"
      weightHistory={summary.weightHistory}
      onPress={() => { if (!disabled) onSelectSection("weight"); }}
      disabled={disabled}
    />,
    <RecordsWidget
      key="records"
      medicalRecords={summary.medicalRecords}
      onPress={() => { if (!disabled) onSelectSection("records"); }}
      disabled={disabled}
    />,
    <ActivityWidget
      key="activity"
      summary={summary.activitySummary}
      petId={petId}
      onPress={() => {
        if (!disabled && petId) navigation.navigate("ActivityLog", { petId });
      }}
      disabled={disabled}
    />,
    <PetInfoWidget
      key="info"
      pet={activePet!}
      onPress={() => { if (!disabled) onSelectSection("health"); }}
      disabled={disabled || !activePet}
    />,
  ];

  return (
    <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 16 }}>
      {widgets.map((widget, i) => (
        <Animated.View
          key={`${key}-${i}`}
          entering={FadeInDown.delay(i * 50)
            .springify()
            .damping(18)}
        >
          {widget}
        </Animated.View>
      ))}
    </View>
  );
}
