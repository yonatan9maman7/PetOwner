import { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import type { PublicAvailabilitySlotDto } from "../../types/api";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  /** Provider's availability slots */
  availabilitySlots: PublicAvailabilitySlotDto[];
  /** The date the user selected (YYYY-MM-DD) — used to find relevant day-of-week slots */
  selectedDate: string;
  /** Currently selected time string (HH:mm) */
  selectedTime: string;
  /** Called when a slot is tapped */
  onTimeSelect: (time: string) => void;
  /** Optional label shown above the grid */
  label?: string;
  /** Slot interval in minutes (default: 60) */
  intervalMinutes?: number;
}

/** Parse "HH:mm" or "HH:mm:ss" → total minutes from midnight */
function parseTimeMinutes(t: string): number {
  const parts = t.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

/** Format total minutes → "HH:mm" */
function formatSlot(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Returns dayOfWeek (0=Sun) for a YYYY-MM-DD string */
function dowFromDate(dateStr: string): number {
  if (!dateStr) return -1;
  return new Date(`${dateStr}T12:00:00`).getDay();
}

/** Builds the list of time slots for the selected date, respecting provider working hours */
function buildTimeSlots(
  availabilitySlots: PublicAvailabilitySlotDto[],
  selectedDate: string,
  intervalMinutes: number,
): string[] {
  if (!selectedDate) return [];

  const dow = dowFromDate(selectedDate);
  const relevantSlots = availabilitySlots.filter((s) => s.dayOfWeek === dow);

  // Fallback: if provider has no slots at all, show standard 08:00–20:00 hourly
  const ranges =
    relevantSlots.length > 0
      ? relevantSlots.map((s) => ({
          start: parseTimeMinutes(s.startTime),
          end: parseTimeMinutes(s.endTime),
        }))
      : [{ start: 8 * 60, end: 20 * 60 }];

  const slots: string[] = [];
  for (const { start, end } of ranges) {
    for (let t = start; t < end; t += intervalMinutes) {
      slots.push(formatSlot(t));
    }
  }
  return slots;
}

export function TimeSlotSelector({
  availabilitySlots,
  selectedDate,
  selectedTime,
  onTimeSelect,
  label,
  intervalMinutes = 60,
}: Props) {
  const { colors } = useTheme();

  const slots = useMemo(
    () => buildTimeSlots(availabilitySlots, selectedDate, intervalMinutes),
    [availabilitySlots, selectedDate, intervalMinutes],
  );

  if (!selectedDate) {
    return (
      <View style={{ paddingVertical: 12 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>
          Select a date first
        </Text>
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
          return (
            <Pressable
              key={slot}
              onPress={() => onTimeSelect(slot)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primaryLight : colors.surfaceTertiary,
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
