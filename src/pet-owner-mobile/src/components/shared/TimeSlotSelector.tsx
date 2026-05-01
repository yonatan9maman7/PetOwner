import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  /** Exact available time strings returned by the API for the selected date/service. */
  availableTimes?: string[];
  /** The date the user selected (YYYY-MM-DD) — used to find relevant day-of-week slots */
  selectedDate: string;
  /** Currently selected time string (HH:mm) */
  selectedTime: string;
  /** Called when a slot is tapped */
  onTimeSelect: (time: string) => void;
  /** Optional label shown above the grid */
  label?: string;
  /** True while the parent is loading real-time availability from the API. */
  loading?: boolean;
  /**
   * When set (HH:mm), slots at or before this time are disabled — e.g. same-calendar-day end
   * must be strictly after start.
   */
  disableTimesAtOrBefore?: string;
}

/** Parse "HH:mm" or "HH:mm:ss" → total minutes from midnight */
function parseTimeMinutes(t: string): number {
  const parts = t.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

export function TimeSlotSelector({
  availableTimes,
  selectedDate,
  selectedTime,
  onTimeSelect,
  label,
  loading = false,
  disableTimesAtOrBefore,
}: Props) {
  const { colors } = useTheme();
  const slots = availableTimes ?? [];

  const cutoffMinutes =
    disableTimesAtOrBefore && disableTimesAtOrBefore.includes(":")
      ? parseTimeMinutes(disableTimesAtOrBefore)
      : null;

  if (!selectedDate) {
    return (
      <View style={{ paddingVertical: 12 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>
          Select a date first
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View style={{ paddingVertical: 12 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>
          No available time slots for this day
        </Text>
      </View>
    );
  }

  return (
    <View>
      {label ? (
        <Text
          style={{
            color: colors.text,
            fontSize: 14,
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {slots.map((slot) => {
          const isSelected = slot === selectedTime;
          const slotM = parseTimeMinutes(slot);
          const disabledByEndRule =
            cutoffMinutes !== null && slotM <= cutoffMinutes;
          const disabled = disabledByEndRule;
          return (
            <Pressable
              key={slot}
              disabled={disabled}
              onPress={() => {
                if (!disabled) onTimeSelect(slot);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primaryLight : colors.surfaceTertiary,
                opacity: disabled ? 0.35 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: isSelected ? "700" : "500",
                  color: isSelected ? colors.primary : colors.textSecondary,
                }}
              >
                {slot}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
