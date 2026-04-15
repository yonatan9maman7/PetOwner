import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { SERVICES, DAY_KEYS } from "./constants";
import type { OnboardingFormValues } from "./schemas";

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00",
];

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

  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");

  const addSlot = () => {
    if (addingDay === null) return;
    setValue("availabilitySlots", [
      ...slots,
      { dayOfWeek: addingDay, startTime: newStart, endTime: newEnd },
    ]);
    setAddingDay(null);
    setNewStart("09:00");
    setNewEnd("17:00");
  };

  const removeSlot = (idx: number) => {
    setValue("availabilitySlots", slots.filter((_, i) => i !== idx));
  };

  const enabledServices = SERVICES.filter((svc) => services[String(svc.serviceType)]?.enabled);

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Availability */}
      <View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
          {t("weeklyAvailability")}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
          {t("onbAvailabilityHint")}
        </Text>
      </View>

      {/* Quick-fill Presets */}
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

      {/* Or customize per-day */}
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
        {t("onbCustomSchedule")}
      </Text>

      {/* Day Buttons */}
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 6, flexWrap: "wrap" }}>
        {DAY_KEYS.map((dayKey, dayIdx) => {
          const hasSlots = slots.some((s) => s.dayOfWeek === dayIdx);
          return (
            <Pressable
              key={dayIdx}
              onPress={() => setAddingDay(addingDay === dayIdx ? null : dayIdx)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: addingDay === dayIdx ? colors.primary : hasSlots ? colors.primaryLight : colors.surfaceSecondary,
                borderWidth: 1,
                borderColor: addingDay === dayIdx ? colors.primary : hasSlots ? colors.primaryLight : colors.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: addingDay === dayIdx ? "#fff" : colors.text }}>
                {t(dayKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Add Slot Panel */}
      {addingDay !== null && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 10, textAlign: isRTL ? "right" : "left" }}>
            {t(DAY_KEYS[addingDay])}
          </Text>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 2 }}>{t("onbSlotStart")}</Text>
              <TimePicker value={newStart} onChange={setNewStart} />
            </View>
            <Text style={{ fontSize: 18, color: colors.textMuted, marginTop: 14 }}>→</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 2 }}>{t("onbSlotEnd")}</Text>
              <TimePicker value={newEnd} onChange={setNewEnd} />
            </View>
          </View>
          <Pressable
            onPress={addSlot}
            style={{
              marginTop: 10,
              backgroundColor: colors.primary,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{t("onbAddSlot")}</Text>
          </Pressable>
        </View>
      )}

      {/* Existing Slots */}
      {slots.length > 0 && (
        <View style={{ gap: 6 }}>
          {slots.map((slot, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 8,
              }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.text }}>{t(DAY_KEYS[slot.dayOfWeek])}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>
                {slot.startTime} – {slot.endTime}
              </Text>
              <Pressable onPress={() => removeSlot(idx)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Special Offers (Business only) */}
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

      {/* Emergency Toggle */}
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

      {/* References with explanation */}
      <View>
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4, textAlign: isRTL ? "right" : "left" }}>
          {t("reference")} *
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
            label={`${t("onbReferenceName")} *`}
            value={referenceName}
            onChangeText={(v) => setValue("referenceName", v)}
            isRTL={isRTL}
          />
          <SmallInput
            label={`${t("onbReferenceContact")} *`}
            value={referenceContact}
            onChangeText={(v) => { setValue("referenceContact", v); clearErrors("referenceContact"); }}
            isRTL={isRTL}
            keyboardType="phone-pad"
            errorMessage={errors.referenceContact?.message}
          />
        </View>
      </View>

      {/* Summary */}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 12, textAlign: isRTL ? "right" : "left" }}>
          {t("onbSummary")}
        </Text>

        <SummaryRow label={t("onbProviderType")} value={isBusiness ? `${t("onbBusiness")} — ${businessName}` : t("onbIndividual")} isRTL={isRTL} />
        {imageUrl ? <SummaryRow label={t("profilePicture")} value="✓" isRTL={isRTL} /> : null}
        <SummaryRow label={t("bioTitle")} value={bio.slice(0, 60) + (bio.length > 60 ? "…" : "")} isRTL={isRTL} />
        <SummaryRow label={t("phoneNumber")} value={phoneNumber} isRTL={isRTL} />
        <SummaryRow label={t("onbAddress")} value={`${street} ${buildingNumber}, ${city}`} isRTL={isRTL} />

        {/* Services summary (Individual only) */}
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

        {/* Special offers summary (Business only) */}
        {isBusiness && specialOffers.trim().length > 0 && (
          <SummaryRow
            label={t("onbSpecialOffers")}
            value={specialOffers.slice(0, 80) + (specialOffers.length > 80 ? "…" : "")}
            isRTL={isRTL}
          />
        )}

        {slots.length > 0 && (
          <>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 10, marginBottom: 4, textAlign: isRTL ? "right" : "left" }}>
              {t("weeklyAvailability")}:
            </Text>
            {slots.map((s, i) => (
              <Text key={i} style={{ fontSize: 13, color: colors.textSecondary, marginStart: 8, textAlign: isRTL ? "right" : "left" }}>
                • {t(DAY_KEYS[s.dayOfWeek])} {s.startTime}–{s.endTime}
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
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  isRTL: boolean;
  keyboardType?: "default" | "phone-pad";
  errorMessage?: string;
}) {
  const { colors } = useTheme();
  const hasError = !!errorMessage;
  return (
    <View>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, marginBottom: 4, textAlign: isRTL ? "right" : "left" }}>
        {label}
      </Text>
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

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 4, paddingVertical: 2 }}
    >
      {TIME_OPTIONS.map((t) => (
        <Pressable
          key={t}
          onPress={() => onChange(t)}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: t === value ? colors.primary : colors.surfaceSecondary,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: t === value ? "#fff" : colors.text }}>{t}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
