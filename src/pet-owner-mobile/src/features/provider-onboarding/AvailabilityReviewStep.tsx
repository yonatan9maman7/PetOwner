import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { servicesForOnboarding, DAY_FULL_KEYS } from "./constants";
import { FieldLabel } from "./FieldLabel";
import type { OnboardingFormValues } from "./schemas";

type Slot = { dayOfWeek: number; startTime: string; endTime: string };

interface Preset {
  labelKey: string;
  slots: Slot[];
}

const PRESETS: Preset[] = [
  {
    labelKey: "onbPresetSunThu",
    slots: [0, 1, 2, 3, 4].map((d) => ({ dayOfWeek: d, startTime: "09:00", endTime: "19:00" })),
  },
  {
    labelKey: "onbPresetSunThuFri",
    slots: [
      ...[0, 1, 2, 3, 4].map((d) => ({ dayOfWeek: d, startTime: "09:00", endTime: "18:00" })),
      { dayOfWeek: 5, startTime: "09:00", endTime: "14:00" },
    ],
  },
  {
    labelKey: "onbPresetSunFriShort",
    slots: [
      ...[0, 1, 2, 3, 4].map((d) => ({ dayOfWeek: d, startTime: "08:30", endTime: "17:00" })),
      { dayOfWeek: 5, startTime: "08:30", endTime: "13:00" },
    ],
  },
];

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

function toHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function sortSlotsForDisplay(slots: Slot[]): Slot[] {
  return [...slots].sort((a, b) =>
    a.dayOfWeek !== b.dayOfWeek ? a.dayOfWeek - b.dayOfWeek : a.startTime.localeCompare(b.startTime),
  );
}

export function AvailabilityReviewStep() {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const { watch, setValue, formState: { errors }, clearErrors } = useFormContext<OnboardingFormValues>();
  const slots = watch("availabilitySlots");
  const isEmergency = watch("isEmergencyService");
  const referenceName = watch("referenceName");
  const referenceContact = watch("referenceContact");
  const services = watch("services");
  const bio = watch("bio");
  const city = watch("city");
  const street = watch("street");
  const buildingNumber = watch("buildingNumber");
  const phoneNumber = watch("phoneNumber");
  const providerType = watch("providerType");
  const businessName = watch("businessName");
  const imageUrl = watch("imageUrl");
  const specialOffers = watch("specialOffers");

  const isBusiness = providerType === 1;

  const removeSlot = (idx: number) => {
    setValue("availabilitySlots", slots.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, patch: Partial<Slot>) => {
    const next = slots.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    setValue("availabilitySlots", next);
  };

  const addShiftForDay = (dayOfWeek: number) => {
    setValue("availabilitySlots", [
      ...slots,
      { dayOfWeek, startTime: "09:00", endTime: "17:00" },
    ]);
  };

  const enabledServices = servicesForOnboarding(providerType).filter((svc) => services[String(svc.serviceType)]?.enabled);

  const summarySlots = sortSlotsForDisplay(slots);

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
          {t("weeklyAvailability")}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
          {t("onbAvailabilityHint")}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
          {t("onbQuickFill")}
        </Text>
        {PRESETS.map((preset) => {
          const isActive = slots.length > 0 && slots.length === preset.slots.length
            && preset.slots.every((ps) => slots.some((s) => s.dayOfWeek === ps.dayOfWeek && s.startTime === ps.startTime && s.endTime === ps.endTime));
          return (
            <Pressable
              key={preset.labelKey}
              onPress={() => setValue("availabilitySlots", [...preset.slots])}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: isActive ? colors.primaryLight : colors.surface,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: isActive ? colors.primary : colors.border,
              }}
            >
              <Ionicons name={isActive ? "checkmark-circle" : "time-outline"} size={20} color={isActive ? colors.primary : colors.textSecondary} />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
                {t(preset.labelKey as any)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
        {t("onbCustomSchedule")}
      </Text>

      <View style={{ gap: 14 }}>
        {DAY_FULL_KEYS.map((dayKey, dayIdx) => {
          const daySlots = slots
            .map((s, slotIdx) => ({ s, slotIdx }))
            .filter((x) => x.s.dayOfWeek === dayIdx);

          return (
            <View
              key={dayIdx}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-start", gap: 10 }}>
                <Text
                  style={{
                    width: 108,
                    flexShrink: 0,
                    fontSize: 14,
                    fontWeight: "700",
                    color: colors.text,
                    textAlign: isRTL ? "right" : "left",
                  }}
                  numberOfLines={2}
                >
                  {t(dayKey)}
                </Text>
                <View style={{ flex: 1, gap: 10, minWidth: 0 }}>
                  {daySlots.length === 0 ? (
                    <View
                      style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: colors.textMuted }}>{t("onbUnavailable")}</Text>
                      <Pressable
                        onPress={() => addShiftForDay(dayIdx)}
                        style={{
                          flexDirection: isRTL ? "row-reverse" : "row",
                          alignItems: "center",
                          gap: 4,
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          backgroundColor: colors.primaryLight,
                        }}
                      >
                        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>{t("onbAddHours")}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      {daySlots.map(({ s, slotIdx }, rowIdx) => (
                        <View
                          key={`${slotIdx}-${rowIdx}`}
                          style={{
                            flexDirection: isRTL ? "row-reverse" : "row",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          <CompactTimeChip value={s.startTime} onChange={(v) => updateSlot(slotIdx, { startTime: v })} isRTL={isRTL} />
                          <Text style={{ fontSize: 15, color: colors.textMuted }}>–</Text>
                          <CompactTimeChip value={s.endTime} onChange={(v) => updateSlot(slotIdx, { endTime: v })} isRTL={isRTL} />
                          <Pressable onPress={() => removeSlot(slotIdx)} hitSlop={8}>
                            <Ionicons name="close-circle" size={22} color={colors.danger} />
                          </Pressable>
                          {rowIdx === daySlots.length - 1 ? (
                            <Pressable
                              onPress={() => addShiftForDay(dayIdx)}
                              hitSlop={8}
                              style={{
                                flexDirection: isRTL ? "row-reverse" : "row",
                                alignItems: "center",
                                padding: 4,
                              }}
                            >
                              <Ionicons name="add-circle" size={24} color={colors.primary} />
                            </Pressable>
                          ) : null}
                        </View>
                      ))}
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {isBusiness && (
        <View>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
            {t("onbSpecialOffers")}
          </Text>
          <TextInput
            value={specialOffers}
            onChangeText={(v) => setValue("specialOffers", v)}
            placeholder={t("onbSpecialOffersPlaceholder")}
            multiline
            maxLength={500}
            placeholderTextColor={colors.textMuted}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 14,
              color: colors.text,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 80,
              textAlignVertical: "top",
              textAlign: isRTL ? "right" : "left",
              writingDirection: isRTL ? "rtl" : "ltr",
            }}
          />
        </View>
      )}

      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons name="flash" size={20} color="#f59e0b" style={{ marginEnd: 10 }} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
          {t("urgentRequests")}
        </Text>
        <Switch
          value={isEmergency}
          onValueChange={(v) => setValue("isEmergencyService", v)}
          trackColor={{ false: colors.borderLight, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View>
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4, textAlign: isRTL ? "right" : "left" }}>
          {t("reference")}
          <Text style={{ color: colors.danger }}> *</Text>
        </Text>
        <View
          style={{
            backgroundColor: colors.primaryLight,
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <Ionicons name="information-circle" size={18} color={colors.primary} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, color: colors.text, lineHeight: 18, textAlign: isRTL ? "right" : "left" }}>
            {isBusiness ? t("onbReferenceHintBusiness") : t("onbReferenceHintIndividual")}
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          <SmallInput
            label={t("onbReferenceName")}
            required
            value={referenceName}
            onChangeText={(v) => setValue("referenceName", v)}
            isRTL={isRTL}
          />
          <SmallInput
            label={t("onbReferenceContact")}
            required
            value={referenceContact}
            onChangeText={(v) => { setValue("referenceContact", v); clearErrors("referenceContact"); }}
            isRTL={isRTL}
            keyboardType="phone-pad"
            errorMessage={errors.referenceContact?.message}
          />
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 12, textAlign: isRTL ? "right" : "left" }}>
          {t("onbSummary")}
        </Text>

        <SummaryRow label={t("onbProviderType")} value={isBusiness ? `${t("onbBusiness")} — ${businessName}` : t("onbIndividual")} isRTL={isRTL} />
        {imageUrl ? <SummaryRow label={t("profilePicture")} value="✓" isRTL={isRTL} /> : null}
        <SummaryRow
          label={isBusiness ? t("bioTitleBusiness") : t("bioTitle")}
          value={bio.slice(0, 60) + (bio.length > 60 ? "…" : "")}
          isRTL={isRTL}
        />
        <SummaryRow label={t("phoneNumber")} value={phoneNumber} isRTL={isRTL} />
        <SummaryRow label={t("onbAddress")} value={`${street} ${buildingNumber}, ${city}`} isRTL={isRTL} />

        {!isBusiness && enabledServices.length > 0 && (
          <>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 10, marginBottom: 4, textAlign: isRTL ? "right" : "left" }}>
              {t("servicesAndPricing")}:
            </Text>
            {enabledServices.map((svc) => {
              const state = services[String(svc.serviceType)];
              const pkgCount = state.packages.length;
              return (
                <Text key={svc.serviceType} style={{ fontSize: 13, color: colors.textSecondary, marginStart: 8, textAlign: isRTL ? "right" : "left" }}>
                  • {t(svc.nameKey)} — ₪{state.rate} {t(svc.unitKey)}
                  {pkgCount > 0 ? ` (+${pkgCount} ${t("packages").toLowerCase()})` : ""}
                </Text>
              );
            })}
          </>
        )}

        {isBusiness && specialOffers.trim().length > 0 && (
          <SummaryRow
            label={t("onbSpecialOffers")}
            value={specialOffers.slice(0, 80) + (specialOffers.length > 80 ? "…" : "")}
            isRTL={isRTL}
          />
        )}

        {summarySlots.length > 0 && (
          <>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 10, marginBottom: 4, textAlign: isRTL ? "right" : "left" }}>
              {t("weeklyAvailability")}:
            </Text>
            {summarySlots.map((s, i) => (
              <Text key={`${s.dayOfWeek}-${i}-${s.startTime}`} style={{ fontSize: 13, color: colors.textSecondary, marginStart: 8, textAlign: isRTL ? "right" : "left" }}>
                • {t(DAY_FULL_KEYS[s.dayOfWeek])} {s.startTime}–{s.endTime}
              </Text>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function SummaryRow({ label, value, isRTL }: { label: string; value: string; isRTL: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", paddingVertical: 3, gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}>{label}:</Text>
      <Text style={{ fontSize: 13, color: colors.text, flex: 1, textAlign: isRTL ? "right" : "left" }}>{value}</Text>
    </View>
  );
}

function SmallInput({
  label,
  value,
  onChangeText,
  isRTL,
  keyboardType,
  errorMessage,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  isRTL: boolean;
  keyboardType?: "default" | "phone-pad";
  errorMessage?: string;
  required?: boolean;
}) {
  const { colors } = useTheme();
  const hasError = !!errorMessage;
  return (
    <View>
      <FieldLabel text={label} isRTL={isRTL} required={required} variant="small" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: colors.text,
          borderWidth: 1,
          borderColor: hasError ? colors.danger : colors.border,
          textAlign: isRTL ? "right" : "left",
        }}
      />
      {hasError && (
        <Text style={{ fontSize: 11, color: colors.danger, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
}

function CompactTimeChip({
  value,
  onChange,
  isRTL,
}: {
  value: string;
  onChange: (v: string) => void;
  isRTL: boolean;
}) {
  const { colors, isDark } = useTheme();
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(() => parseHHMM(value));

  useEffect(() => {
    if (!show) setDraft(parseHHMM(value));
  }, [value, show]);

  const display = value || "--:--";

  if (Platform.OS === "web") {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
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
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, textAlign: "center" }}>{display}</Text>
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
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "flex-end", padding: 12 }}>
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

