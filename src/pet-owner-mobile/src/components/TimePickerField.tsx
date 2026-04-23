import { rowDirectionForAppLayout } from "../i18n";
import { useState } from "react";
import { View, Text, Pressable, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export interface TimePickerFieldProps {
  value: string;
  onChange: (hhmm: string) => void;
  placeholder: string;
  isRTL?: boolean;
}

/** Parse "HH:MM" string into a Date (using today's date). Falls back to current time. */
function parseHHMM(hhmm: string): Date {
  const d = new Date();
  if (hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      d.setHours(h, m, 0, 0);
      return d;
    }
  }
  d.setSeconds(0, 0);
  return d;
}

/** Format a Date to "HH:MM" 24-hour string. */
function toHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Format a Date to a locale-friendly display string (short time, 24-h). */
function toDisplayTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function TimePickerField({
  value,
  onChange,
  placeholder,
  isRTL,
}: TimePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() => parseHHMM(value));
  const { colors, isDark } = useTheme();

  const display = value ? toDisplayTime(parseHHMM(value)) : "";

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
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          gap: 8,
        }}
      >
        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
        <input
          type="time"
          value={value}
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

  return (
    <>
      <Pressable
        onPress={() => {
          setDraftDate(parseHHMM(value));
          setShowPicker(true);
        }}
        style={{
          backgroundColor: colors.surfaceTertiary,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          gap: 8,
        }}
      >
        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
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
                <View
                  style={{ flexDirection: "row", justifyContent: "flex-end", padding: 12 }}
                >
                  <Pressable
                    onPress={() => {
                      onChange(toHHMM(draftDate));
                      setShowPicker(false);
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#007AFF" }}>
                      Done
                    </Text>
                  </Pressable>
                </View>
                <View style={{ alignItems: "center", minHeight: 216 }}>
                  <DateTimePicker
                    value={draftDate}
                    mode="time"
                    display="spinner"
                    is24Hour
                    themeVariant={isDark ? "dark" : "light"}
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
            value={parseHHMM(value)}
            mode="time"
            display="default"
            is24Hour
            onChange={(_: unknown, d?: Date) => {
              setShowPicker(false);
              if (d) onChange(toHHMM(d));
            }}
          />
        ))}
    </>
  );
}
