import { View, Text } from "react-native";
import type { PetDto } from "../../../../types/api";
import { useTranslation } from "../../../../i18n";
import { WidgetCard } from "./WidgetCard";
import { useTheme } from "../../../../theme/ThemeContext";

interface PetInfoWidgetProps {
  pet: PetDto;
  onPress: () => void;
  disabled?: boolean;
}

export function PetInfoWidget({ pet, onPress, disabled }: PetInfoWidgetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const microchipSlot = pet.microchipNumber ? (
    <View style={{ alignItems: "flex-end", gap: 1 }}>
      <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: "500" }}>
        {t("microchipShort")}
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: colors.text,
          fontVariant: ["tabular-nums"],
          letterSpacing: 0.5,
        }}
      >
        ···· {pet.microchipNumber.slice(-4)}
      </Text>
    </View>
  ) : undefined;

  const subtitle = pet.vetName
    ? `${t("vetInfo")}: ${pet.vetName}`
    : t("petInfo");

  return (
    <WidgetCard
      icon="heart"
      iconColor="#7c3aed"
      iconBg="#f5f3ff"
      title={t("petInfo")}
      subtitle={subtitle}
      onPress={onPress}
      disabled={disabled}
      rightSlot={microchipSlot}
    />
  );
}
