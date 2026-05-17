import { useState, useEffect } from "react";
import { Text, TextInput, Pressable, Platform, Modal, View } from "react-native";
import { rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";

export function parseHHMM(hhmm: string): Date {
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

export function toHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Normalize API / form times to `HH:mm:ss` for schedule payloads. */
export function toApiTimeSpan(time: string | undefined): string {
  if (!time?.trim()) return "09:00:00";
  const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "09:00:00";
  return `${match[1].padStart(2, "0")}:${match[2]}:00`;
}

export function formatTimeForChip(time: string | undefined): string {
  if (!time?.trim()) return "";
  const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

type CompactTimeChipProps = {
  value: string;
  onChange: (v: string) => void;
  isRTL: boolean;
};

/**
 * Tappable HH:mm chip with native time picker (iOS modal / Android dialog).
 */
export function CompactTimeChip({ value, onChange, isRTL }: CompactTimeChipProps) {
  const { colors, isDark } = useTheme();
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(() => parseHHMM(value));

  useEffect(() => {
    if (!show) setDraft(parseHHMM(value));
  }, [value, show]);

  const display = formatTimeForChip(value) || "--:--";

  if (Platform.OS === "web") {
    return (
      <TextInput
        value={formatTimeForChip(value)}
        onChangeText={(v) => onChange(v)}
        placeholder="09:00"
        placeholderTextColor={colors.textMuted}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: colors.surfaceSecondary,
          minWidth: 72,
          fontSize: 14,
          fontWeight: "600",
          color: colors.text,
          textAlign: "center",
        }}
      />
    );
  }

  const DateTimePicker = require("@react-native-community/datetimepicker").default;

  return (
    <>
      <Pressable
        onPress={() => {
          setDraft(parseHHMM(value));
          setShow(true);
        }}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: colors.surfaceSecondary,
          minWidth: 72,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, textAlign: "center" }}>
          {display}
        </Text>
      </Pressable>

      {show && Platform.OS === "ios" && (
        <Modal transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setShow(false)} />
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingBottom: 28,
              }}
            >
              <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), justifyContent: "flex-end", padding: 12 }}>
                <Pressable
                  onPress={() => {
                    onChange(toHHMM(draft));
                    setShow(false);
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#007AFF" }}>Done</Text>
                </Pressable>
              </View>
              <View style={{ alignItems: "center", minHeight: 216 }}>
                <DateTimePicker
                  value={draft}
                  mode="time"
                  display="spinner"
                  is24Hour
                  themeVariant={isDark ? "dark" : "light"}
                  style={{ height: 216, width: "100%" }}
                  onChange={(_: unknown, d?: Date) => {
                    if (d) setDraft(d);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {show && Platform.OS === "android" && (
        <DateTimePicker
          value={parseHHMM(value)}
          mode="time"
          display="default"
          is24Hour
          onChange={(ev: { type: string }, d?: Date) => {
            setShow(false);
            if (ev.type === "set" && d) onChange(toHHMM(d));
          }}
        />
      )}
    </>
  );
}
