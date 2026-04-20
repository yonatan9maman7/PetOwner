import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, Alert, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, type TranslationKey } from "../../../../i18n";
import type { ThemeColors } from "../../../../theme/ThemeContext";
import { useTheme } from "../../../../theme/ThemeContext";
import { medicalApi } from "../../../../api/client";
import { DatePickerField } from "../../../../components/DatePickerField";
import { ListSkeleton } from "../../../../components/shared/ListSkeleton";
import type { WeightLogDto } from "../../../../types/api";
import { formInputStyle } from "../helpers";

function formatAxisWeightKg(v: number): string {
  const r = Math.round(v * 10) / 10;
  if (Math.abs(r - Math.round(r)) < 0.05) return String(Math.round(r));
  return r.toFixed(1);
}

/** Time-series charts stay LTR (oldest left, newest right) regardless of app locale. */
function weightChartX(i: number, n: number, plotW: number, marginX: number): number {
  if (plotW <= 0) return 0;
  if (n <= 1) return plotW / 2;
  const inner = plotW - 2 * marginX;
  const u = i / (n - 1);
  return marginX + u * inner;
}

function WeightChartLine({
  x1,
  y1,
  x2,
  y2,
  color,
  thickness = 2.5,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  thickness?: number;
}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.75) return null;
  const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x1,
        top: y1 - thickness / 2,
        width: len,
        height: thickness,
        backgroundColor: color,
        borderRadius: thickness / 2,
        transform: [{ rotate: `${deg}deg` }],
        transformOrigin: "left center",
      }}
    />
  );
}

function WeightTrendChart({
  sorted,
  isRTL,
  colors,
  t,
}: {
  sorted: WeightLogDto[];
  isRTL: boolean;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
}) {
  const [plotW, setPlotW] = useState(0);
  const MARGIN_X = 12;
  const MARGIN_Y_TOP = 22;
  const MARGIN_Y_BOT = 6;
  const PLOT_H = 172;
  const drawH = PLOT_H - MARGIN_Y_TOP - MARGIN_Y_BOT;

  const n = sorted.length;
  const latest = sorted[n - 1]!;
  const prev = n >= 2 ? sorted[n - 2]! : latest;
  const diff = latest.weight - prev.weight;
  const trendUp = diff >= 0;

  const weights = sorted.map((s) => s.weight);
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const span = Math.max(rawMax - rawMin, 0.35);
  const pad = span * 0.14;
  const vMin = rawMin - pad;
  const vMax = rawMax + pad;
  const vRange = vMax - vMin || 1;
  const showMidTick = span >= 1.2;

  const yAt = (w: number) => MARGIN_Y_TOP + (1 - (w - vMin) / vRange) * drawH;
  const xAt = (i: number) => weightChartX(i, n, plotW, MARGIN_X);
  const labelInterval = Math.max(1, Math.floor(n / 5));

  const cardStyle = {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  } as const;

  const yAxisTextStyle = {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600" as const,
    textAlign: "right" as const,
    writingDirection: "ltr" as const,
  };

  if (n === 1) {
    const log = sorted[0]!;
    return (
      <View style={cardStyle}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
            {log.weight} {t("weightKg")}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: 12,
            lineHeight: 17,
          }}
        >
          {t("weightChartMoreDataHint")}
        </Text>
        <View
          style={{ height: PLOT_H, alignSelf: "stretch", direction: "ltr" }}
          onLayout={(e) => setPlotW(e.nativeEvent.layout.width)}
        >
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: MARGIN_Y_TOP,
              bottom: MARGIN_Y_BOT,
              borderRadius: 8,
              backgroundColor: colors.surfaceSecondary,
            }}
          />
          {plotW > 0 ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: xAt(0) - 9,
                top: yAt(log.weight) - 9,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: colors.primary,
                borderWidth: 3,
                borderColor: colors.surface,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.35,
                shadowRadius: 5,
                elevation: 4,
              }}
            />
          ) : null}
        </View>
        <Text
          style={{
            fontSize: 11,
            color: colors.textMuted,
            fontWeight: "500",
            textAlign: "center",
            marginTop: 8,
          }}
        >
          {new Date(log.dateRecorded).toLocaleDateString()}
        </Text>
      </View>
    );
  }

  return (
    <View style={cardStyle}>
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
          {latest.weight} {t("weightKg")}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Ionicons name={trendUp ? "caret-up" : "caret-down"} size={12} color={trendUp ? "#10b981" : "#ef4444"} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: trendUp ? "#10b981" : "#ef4444" }}>{Math.abs(diff).toFixed(1)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", direction: "ltr" }}>
        <View style={{ width: 36 }}>
          <View
            style={{
              height: PLOT_H,
              justifyContent: "space-between",
              paddingTop: MARGIN_Y_TOP - 2,
              paddingBottom: MARGIN_Y_BOT,
            }}
          >
            <Text style={yAxisTextStyle}>{formatAxisWeightKg(vMax)}</Text>
            {showMidTick ? (
              <Text style={{ ...yAxisTextStyle, marginVertical: -4 }}>{formatAxisWeightKg((vMax + vMin) / 2)}</Text>
            ) : (
              <View />
            )}
            <Text style={yAxisTextStyle}>{formatAxisWeightKg(vMin)}</Text>
          </View>
          <View style={{ height: 28 }} />
        </View>

        <View style={{ flex: 1, direction: "ltr" }} onLayout={(e) => setPlotW(e.nativeEvent.layout.width)}>
          <View style={{ height: PLOT_H, position: "relative" }}>
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
              <View
                key={pct}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: MARGIN_Y_TOP + (1 - pct) * drawH,
                  height: 1,
                  backgroundColor: colors.borderLight,
                }}
              />
            ))}
            {plotW > 0 &&
              sorted.map((_, i) =>
                i < n - 1 ? (
                  <WeightChartLine
                    key={`ln-${sorted[i]!.id}`}
                    x1={xAt(i)}
                    y1={yAt(sorted[i]!.weight)}
                    x2={xAt(i + 1)}
                    y2={yAt(sorted[i + 1]!.weight)}
                    color={colors.primary}
                    thickness={2.5}
                  />
                ) : null,
              )}
            {plotW > 0 &&
              sorted.map((log, i) => {
                const isLast = i === n - 1;
                const r = isLast ? 7 : 5;
                return (
                  <View
                    key={log.id}
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: xAt(i) - r,
                      top: yAt(log.weight) - r,
                      width: r * 2,
                      height: r * 2,
                      borderRadius: r,
                      backgroundColor: isLast ? colors.primary : colors.primaryLight,
                      borderWidth: 2,
                      borderColor: colors.surface,
                      shadowColor: isLast ? colors.primary : "transparent",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isLast ? 0.3 : 0,
                      shadowRadius: isLast ? 4 : 0,
                      elevation: isLast ? 3 : 0,
                    }}
                  />
                );
              })}
          </View>

          <View style={{ height: 24, marginTop: 4, position: "relative", direction: "ltr" }}>
            {plotW > 0 &&
              sorted.map((log, i) =>
                i % labelInterval === 0 || i === n - 1 ? (
                  <Text
                    key={`dl-${log.id}`}
                    style={{
                      position: "absolute",
                      left: xAt(i) - 26,
                      width: 52,
                      fontSize: 9,
                      color: colors.textMuted,
                      fontWeight: "500",
                      textAlign: "center",
                      writingDirection: "ltr",
                    }}
                    numberOfLines={1}
                  >
                    {new Date(log.dateRecorded).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </Text>
                ) : null,
              )}
          </View>
        </View>
      </View>
    </View>
  );
}

function weightLogDateToPickerValue(dateRecorded: string): string {
  const trimmed = dateRecorded.trim();
  const ymd = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (ymd) return ymd[1]!;
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function WeightSection({ petId, reloadNonce = 0 }: { petId: string; reloadNonce?: number }) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const [history, setHistory] = useState<WeightLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formWeight, setFormWeight] = useState("");
  const [formDate, setFormDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editDate, setEditDate] = useState("");

  const load = useCallback(async () => {
    try {
      setHistory(await medicalApi.getWeightHistory(petId));
    } catch {}
  }, [petId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, reloadNonce]);

  const addWeight = async () => {
    const w = parseFloat(formWeight);
    if (!formWeight || isNaN(w) || w <= 0) {
      Alert.alert(t("errorTitle"), t("weightMustBePositive"));
      return;
    }
    if (!formDate) {
      Alert.alert(t("errorTitle"), t("dateRequired"));
      return;
    }
    setSaving(true);
    try {
      await medicalApi.addWeightLog(petId, {
        weight: w,
        dateRecorded: formDate,
      });
      setShowForm(false);
      setFormWeight("");
      setFormDate("");
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? t("genericError");
      Alert.alert(t("errorTitle"), msg);
    }
    setSaving(false);
  };

  const startEditLog = (log: WeightLogDto) => {
    setShowForm(false);
    setEditingId(log.id);
    setEditWeight(String(log.weight));
    setEditDate(weightLogDateToPickerValue(log.dateRecorded));
  };

  const cancelEditLog = () => {
    setEditingId(null);
    setEditWeight("");
    setEditDate("");
  };

  const saveEditLog = async () => {
    if (!editingId) return;
    const w = parseFloat(editWeight);
    if (!editWeight || isNaN(w) || w <= 0) {
      Alert.alert(t("errorTitle"), t("weightMustBePositive"));
      return;
    }
    if (!editDate) {
      Alert.alert(t("errorTitle"), t("dateRequired"));
      return;
    }
    setSaving(true);
    try {
      await medicalApi.updateWeightLog(petId, editingId, {
        weight: w,
        dateRecorded: editDate,
      });
      cancelEditLog();
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? t("genericError");
      Alert.alert(t("errorTitle"), msg);
    }
    setSaving(false);
  };

  const deleteLog = async (logId: string) => {
    if (editingId === logId) cancelEditLog();
    try {
      await medicalApi.deleteWeightLog(petId, logId);
      await load();
    } catch {}
  };

  if (loading) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <ListSkeleton rows={3} variant="row" />
      </View>
    );
  }

  const sorted = [...history].sort((a, b) => new Date(a.dateRecorded).getTime() - new Date(b.dateRecorded).getTime());

  return (
    <View style={{ padding: 20, gap: 12 }}>
      {sorted.length >= 1 && <WeightTrendChart sorted={sorted} isRTL={isRTL} colors={colors} t={t} />}

      {sorted.length === 0 && (
        <View style={{ padding: 24, alignItems: "center" }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="analytics-outline" size={32} color={colors.primary} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: "600", textAlign: "center" }}>{t("noWeightData")}</Text>
        </View>
      )}

      {[...history]
        .sort((a, b) => new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime())
        .slice(0, 10)
        .map((log) =>
          editingId === log.id ? (
            <View
              key={log.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                gap: 12,
                borderWidth: 1,
                borderColor: colors.primaryLight,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>{t("editAction")}</Text>
              <TextInput
                placeholder={`${t("petWeight")} (${t("weightKg")})`}
                value={editWeight}
                onChangeText={setEditWeight}
                keyboardType="decimal-pad"
                style={formInputStyle(isRTL, colors)}
                placeholderTextColor={colors.textMuted}
              />
              <DatePickerField
                value={editDate}
                onChange={setEditDate}
                placeholder={t("dateRecorded")}
                isRTL={isRTL}
                maximumDate={new Date()}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={cancelEditLog}
                  disabled={saving}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: colors.surfaceSecondary,
                    alignItems: "center",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontWeight: "600", color: colors.textSecondary, fontSize: 14 }}>{t("cancel")}</Text>
                </Pressable>
                {(() => {
                  const wValid = editWeight.trim() && !isNaN(parseFloat(editWeight)) && parseFloat(editWeight) > 0;
                  const dValid = !!editDate.trim();
                  const canSave = wValid && dValid && !saving;
                  return (
                    <Pressable
                      onPress={saveEditLog}
                      disabled={!canSave}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: canSave ? colors.primary : colors.primaryLight,
                        alignItems: "center",
                        opacity: canSave ? 1 : 0.6,
                      }}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ fontWeight: "700", color: "#fff", fontSize: 14 }}>{t("save")}</Text>
                      )}
                    </Pressable>
                  );
                })()}
              </View>
            </View>
          ) : (
            <View
              key={log.id}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                padding: 14,
                borderRadius: 14,
                gap: 10,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: colors.primaryLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="analytics" size={18} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                {log.weight} {t("weightKg")}
              </Text>
              <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {new Date(log.dateRecorded).toLocaleDateString()}
              </Text>
              <Pressable onPress={() => startEditLog(log)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("editAction")}>
                <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
              </Pressable>
              <Pressable onPress={() => deleteLog(log.id)} hitSlop={8} accessibilityRole="button">
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </Pressable>
            </View>
          ),
        )}

      {showForm ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            gap: 12,
            borderWidth: 1,
            borderColor: "#ede9fe",
          }}
        >
          <TextInput
            placeholder={`${t("petWeight")} (${t("weightKg")})`}
            value={formWeight}
            onChangeText={setFormWeight}
            keyboardType="decimal-pad"
            style={formInputStyle(isRTL, colors)}
            placeholderTextColor={colors.textMuted}
          />
          <DatePickerField
            value={formDate}
            onChange={setFormDate}
            placeholder={t("dateRecorded")}
            isRTL={isRTL}
            maximumDate={new Date()}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setShowForm(false)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.surfaceSecondary,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "600", color: colors.textSecondary, fontSize: 14 }}>{t("cancel")}</Text>
            </Pressable>
            {(() => {
              const weightValid = formWeight.trim() && !isNaN(parseFloat(formWeight)) && parseFloat(formWeight) > 0;
              const dateValid = !!formDate.trim();
              const canSave = weightValid && dateValid && !saving;
              return (
                <Pressable
                  onPress={addWeight}
                  disabled={!canSave}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: canSave ? colors.primary : colors.primaryLight,
                    alignItems: "center",
                    opacity: canSave ? 1 : 0.6,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ fontWeight: "700", color: "#fff", fontSize: 14 }}>{t("save")}</Text>
                  )}
                </Pressable>
              );
            })()}
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            cancelEditLog();
            setShowForm(true);
          }}
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderStyle: "dashed",
            backgroundColor: colors.primaryLight,
          }}
        >
          <Ionicons name="add-circle" size={18} color={colors.primary} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>{t("addWeight")}</Text>
        </Pressable>
      )}
    </View>
  );
}
