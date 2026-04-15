import { View, Text } from "react-native";
import { useTranslation, type TranslationKey } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";

const STEP_LABELS: Record<number, TranslationKey> = {
  0: "onbStepIdentity",
  1: "onbStepServices",
  2: "onbStepPackages",
  3: "onbStepReview",
};

interface Props {
  currentIndex: number;
  steps: readonly number[];
}

export function ProgressBar({ currentIndex, steps }: Props) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const total = steps.length;
  const stepId = steps[Math.min(currentIndex, total - 1)];

  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 }}>
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1 }}>
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= currentIndex ? colors.primary : colors.borderLight,
              }}
            />
          </View>
        ))}
      </View>
      <Text
        style={{
          fontSize: 12,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: 6,
        }}
      >
        {t(STEP_LABELS[stepId])} ({currentIndex + 1}/{total})
      </Text>
    </View>
  );
}
