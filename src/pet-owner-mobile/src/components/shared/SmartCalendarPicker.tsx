import { useMemo } from "react";
import { View, Text } from "react-native";
import { Calendar } from "react-native-calendars";
import type { DateData, MarkedDates } from "react-native-calendars/src/types";
import type { PublicAvailabilitySlotDto } from "../../types/api";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n";

interface Props {
  /** Provider's availability slots from ProviderPublicProfileDto.availabilitySlots */
  availabilitySlots: PublicAvailabilitySlotDto[];
  /** Currently selected ISO date string (YYYY-MM-DD) */
  selectedDate: string;
  /** Called when the user taps an available date */
  onDateSelect: (dateString: string) => void;
}

/** ISO YYYY-MM-DD for today */
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns the set of dayOfWeek values the provider is available on */
function availableDaySet(slots: PublicAvailabilitySlotDto[]): Set<number> {
  return new Set(slots.map((s) => s.dayOfWeek));
}

/**
 * Builds the `markedDates` object for react-native-calendars.
 * We scan the next 90 days and disable any day whose weekday is not in the
 * provider's availabilitySlots, as well as any day in the past.
 */
function buildMarkedDates(
  slots: PublicAvailabilitySlotDto[],
  selectedDate: string,
  primaryColor: string,
  disabledColor: string,
  selectedBg: string,
): MarkedDates {
  const availableDays = availableDaySet(slots);
  const marks: MarkedDates = {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 90; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;

    const isAvailable = availableDays.size === 0 || availableDays.has(d.getDay());

    if (!isAvailable) {
      marks[key] = {
        disabled: true,
        disableTouchEvent: true,
        customStyles: {
          text: { color: disabledColor },
        },
      } as any;
    }
  }

  if (selectedDate) {
    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: primaryColor,
      selectedTextColor: "#ffffff",
    } as any;
  }

  return marks;
}

export function SmartCalendarPicker({ availabilitySlots, selectedDate, onDateSelect }: Props) {
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();

  const today = todayISO();

  const markedDates = useMemo(
    () =>
      buildMarkedDates(
        availabilitySlots,
        selectedDate,
        colors.primary,
        colors.textMuted,
        colors.primary,
      ),
    [availabilitySlots, selectedDate, colors.primary, colors.textMuted],
  );

  const theme = useMemo(
    () => ({
      backgroundColor: colors.surface,
      calendarBackground: colors.surface,
      textSectionTitleColor: colors.textSecondary,
      selectedDayBackgroundColor: colors.primary,
      selectedDayTextColor: "#ffffff",
      todayTextColor: colors.primary,
      dayTextColor: colors.text,
      textDisabledColor: colors.textMuted,
      dotColor: colors.primary,
      monthTextColor: colors.text,
      indicatorColor: colors.primary,
      arrowColor: colors.primary,
      textMonthFontWeight: "700" as const,
      textDayFontSize: 14,
      textMonthFontSize: 15,
      textDayHeaderFontSize: 12,
    }),
    [colors, isDark],
  );

  function handleDayPress(day: DateData) {
    // Extra guard: don't allow past days or provider-unavailable days
    if (day.dateString < today) return;
    const dow = new Date(`${day.dateString}T12:00:00`).getDay();
    const available =
      availabilitySlots.length === 0 ||
      availabilitySlots.some((s) => s.dayOfWeek === dow);
    if (!available) return;
    onDateSelect(day.dateString);
  }

  const hasSlots = availabilitySlots.length > 0;

  return (
    <View
      style={{
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}
    >
      <Calendar
        current={selectedDate || today}
        minDate={today}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        markingType="custom"
        enableSwipeMonths
        firstDay={isRTL ? 0 : 1}
        renderArrow={(direction) => (
          <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "700" }}>
            {direction === "left" ? "‹" : "›"}
          </Text>
        )}
        theme={theme}
      />
      {hasSlots && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: colors.surfaceSecondary,
            flexDirection: isRTL ? "row-reverse" : "row",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
            const isAvail = availabilitySlots.some((s) => s.dayOfWeek === dow);
            const labels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
            return (
              <View
                key={dow}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 20,
                  backgroundColor: isAvail ? colors.primaryLight : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isAvail ? "700" : "400",
                    color: isAvail ? colors.primary : colors.textMuted,
                  }}
                >
                  {labels[dow]}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
