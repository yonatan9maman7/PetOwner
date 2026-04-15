import { useState } from "react";
import { View, Text, Pressable, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export interface DatePickerFieldProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder: string;
  isRTL?: boolean;
  /** Earliest selectable calendar day (inclusive). */
  minimumDate?: Date;
  /** Latest selectable calendar day (inclusive). */
  maximumDate?: Date;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Wheel value when opening: existing value, else today; clamped to min/max day. */
function initialDraftDate(value: string, minimumDate?: Date, maximumDate?: Date): Date {
  const todayNoon = new Date();
  todayNoon.setHours(12, 0, 0, 0);

  let candidate: Date;
  if (value) {
    const parsed = new Date(`${value}T12:00:00`);
    candidate = Number.isNaN(parsed.getTime()) ? todayNoon : parsed;
  } else {
    candidate = todayNoon;
  }

  if (minimumDate) {
    const minDay = startOfDay(minimumDate);
    const candDay = startOfDay(candidate);
    if (candDay < minDay) {
      const next = new Date(minDay);
      next.setHours(12, 0, 0, 0);
      candidate = next;
    }
  }
  if (maximumDate) {
    const maxDay = startOfDay(maximumDate);
    const candDay = startOfDay(candidate);
    if (candDay > maxDay) {
      const next = new Date(maxDay);
      next.setHours(12, 0, 0, 0);
      candidate = next;
    }
  }
  return candidate;
}

export function DatePickerField({
  value,
  onChange,
  placeholder,
  isRTL,
  minimumDate,
  maximumDate,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState(() => new Date());
  const { colors, isDark } = useTheme();

  const display = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString()
    : "";

  if (Platform.OS === "web") {
    return (
      <View
        style={{
          backgroundColor: colors.surfaceTertiary,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
        <input
          type="date"
          value={value}
          min={minimumDate ? toISO(startOfDay(minimumDate)) : undefined}
          max={maximumDate ? toISO(startOfDay(maximumDate)) : undefined}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            fontSize: 13,
            color: value ? colors.text : colors.textMuted,
            outline: "none",
            fontFamily: "inherit",
            direction: isRTL ? "rtl" : "ltr",
          }}
        />
      </View>
    );
  }

  const DateTimePicker =
    require("@react-native-community/datetimepicker").default;

  const pickerValueAndroid = initialDraftDate(value, minimumDate, maximumDate);

  return (
    <>
      <Pressable
        onPress={() => {
          setDraftDate(initialDraftDate(value, minimumDate, maximumDate));
          setShowPicker(true);
        }}
        style={{
          backgroundColor: colors.surfaceTertiary,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            color: display ? colors.text : colors.textMuted,
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {display || placeholder}
        </Text>
      </Pressable>

      {showPicker &&
        (Platform.OS === "ios" ? (
          <Modal transparent animationType="slide">
            <View style={{ flex: 1, justifyContent: "flex-end" }}>
              <Pressable
                style={{ flex: 1, backgroundColor: colors.overlay }}
                onPress={() => setShowPicker(false)}
              />
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  paddingBottom: 32,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: 12 }}>
                  <Pressable
                    onPress={() => {
                      onChange(toISO(draftDate));
                      setShowPicker(false);
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#007AFF" }}>Done</Text>
                  </Pressable>
                </View>
                <View style={{ alignItems: "center", minHeight: 216 }}>
                  <DateTimePicker
                    value={draftDate}
                    mode="date"
                    display="spinner"
                    themeVariant={isDark ? "dark" : "light"}
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                    style={{ height: 216, width: "100%" }}
                    onChange={(_: unknown, d?: Date) => {
                      if (d) setDraftDate(d);
                    }}
                  />
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={pickerValueAndroid}
            mode="date"
            display="default"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_: unknown, d?: Date) => {
              setShowPicker(false);
              if (d) onChange(toISO(d));
            }}
          />
        ))}
    </>
  );
}
