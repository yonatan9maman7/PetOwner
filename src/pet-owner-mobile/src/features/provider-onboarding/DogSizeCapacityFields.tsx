import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useController, useFormContext } from "react-hook-form";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import type { DogSize } from "../../types/api";
import {
  DOG_ICON_SIZES,
  DOG_SIZE_LABEL_KEYS,
  DOG_SIZE_ORDER,
} from "./dogSizeConstants";
import { DOG_CARE_SERVICE_TYPES } from "./constants";
import type { OnboardingFormValues } from "./schemas";

export function toggleDogSize(current: DogSize[], id: DogSize): DogSize[] {
  if (current.includes(id)) return current.filter((x) => x !== id);
  return [...current, id].sort(
    (a, b) => DOG_SIZE_ORDER.indexOf(a) - DOG_SIZE_ORDER.indexOf(b),
  );
}

/** Shared UI for onboarding (react-hook-form) and provider edit (controlled). */
export function DogSizeCapacityEditor({
  selected,
  onToggleSize,
  maxCapacity,
  onMaxCapacityChange,
}: {
  selected: DogSize[];
  onToggleSize: (id: DogSize) => void;
  maxCapacity: string;
  onMaxCapacityChange: (v: string) => void;
}) {
  const { t, isRTL, alignCls } = useTranslation();
  const { colors } = useTheme();

  return (
    <View className="mt-4 gap-4">
      <Text
        className={`text-base font-extrabold ${alignCls}`}
        style={{ color: colors.text }}
      >
        {t("acceptedSizes")}
        <Text style={{ color: colors.danger }}> *</Text>
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: isRTL ? "row-reverse" : "row",
          gap: 10,
          paddingVertical: 4,
        }}
      >
        {DOG_SIZE_ORDER.map((id) => {
          const on = selected.includes(id);
          return (
            <Pressable
              key={id}
              onPress={() => onToggleSize(id)}
              className={`rounded-2xl px-3 py-3 ${on ? "border-2" : "border"}`}
              style={{
                borderColor: on ? colors.primary : colors.border,
                backgroundColor: on ? colors.surfaceSecondary : colors.surface,
                minWidth: 76,
                alignItems: "center",
              }}
            >
              <MaterialCommunityIcons
                name="dog"
                size={DOG_ICON_SIZES[id]}
                color={on ? colors.primary : colors.textMuted}
              />
              <Text
                className="mt-2 text-center text-[11px] font-semibold leading-tight"
                style={{ color: on ? colors.text : colors.textSecondary }}
                numberOfLines={3}
              >
                {t(DOG_SIZE_LABEL_KEYS[id])}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="gap-2">
        <Text className={`text-sm font-bold ${alignCls}`} style={{ color: colors.text }}>
          {t("maxCapacity")}
          <Text style={{ color: colors.danger }}> *</Text>
        </Text>
        <View
          className={`flex-row items-center gap-3 rounded-xl border px-3 py-2 ${
            isRTL ? "flex-row-reverse" : ""
          }`}
          style={{ borderColor: colors.border, backgroundColor: colors.surfaceTertiary }}
        >
          <Pressable
            onPress={() => {
              const n = Math.max(1, (Number(maxCapacity) || 1) - 1);
              onMaxCapacityChange(String(n));
            }}
            className="h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-lg font-bold" style={{ color: colors.text }}>
              −
            </Text>
          </Pressable>
          <TextInput
            value={maxCapacity}
            onChangeText={onMaxCapacityChange}
            keyboardType="number-pad"
            className={`min-w-[48px] flex-1 py-2 text-center text-lg font-extrabold ${alignCls}`}
            style={{ color: colors.text }}
            placeholder="1"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            onPress={() => {
              const n = (Number(maxCapacity) || 0) + 1;
              onMaxCapacityChange(String(n));
            }}
            className="h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-lg font-bold" style={{ color: colors.text }}>
              +
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function DogSizeCapacityFields() {
  const { control, watch } = useFormContext<OnboardingFormValues>();
  const services = watch("services");
  const needsDogPrefs = [...DOG_CARE_SERVICE_TYPES].some(
    (id) => services[String(id)]?.enabled,
  );

  const { field: sizesField } = useController({ control, name: "acceptedDogSizes" });
  const { field: capField } = useController({ control, name: "maxDogsCapacity" });

  if (!needsDogPrefs) return null;

  const selected = sizesField.value ?? [];

  return (
    <DogSizeCapacityEditor
      selected={selected}
      onToggleSize={(id) => sizesField.onChange(toggleDogSize(selected, id))}
      maxCapacity={capField.value}
      onMaxCapacityChange={capField.onChange}
    />
  );
}
