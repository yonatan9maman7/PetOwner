import { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { bookingsApi } from "../../api/client";
import type { ProviderPublicProfileDto } from "../../types/api";
import { SmartCalendarPicker } from "../../components/shared/SmartCalendarPicker";
import { TimeSlotSelector } from "../../components/shared/TimeSlotSelector";
import { usePetsStore } from "../../store/petsStore";

const SERVICE_TYPE_NAMES: Record<number, string> = {
  0: "Dog Walking",
  1: "Pet Sitting",
  2: "Boarding",
  3: "Drop-in Visit",
  4: "Training",
  5: "Insurance",
  6: "Pet Store",
  7: "House Sitting",
  8: "Doggy Day Care",
};

const PRICING_UNIT_LABELS: Record<number, string> = {
  0: "hour",
  1: "night",
  2: "visit",
  3: "session",
  4: "package",
};

function combineDateAndTime(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00`;
}

/** Matches backend `PricingUnit` / JSON string names from the API */
type BillingMode = "perHour" | "perNight" | "flat";

/**
 * `ProviderPublicProfile` JSON uses `pricingUnit` (camelCase) and does not set `unit`.
 * If `pricingUnit` is missing, infer from `serviceType` (same as catalog defaults) so
 * hourly services don't fall through to "flat" (base rate only).
 */
function getBillingMode(rate: any): BillingMode {
  const raw = rate?.pricingUnit ?? (rate as { PricingUnit?: string | number }).PricingUnit;

  if (typeof raw === "number" && !Number.isNaN(raw)) {
    if (raw === 0) return "perHour";
    if (raw === 1) return "perNight";
    if (raw >= 2) return "flat";
  }
  if (typeof raw === "string") {
    const s = raw.replace(/\s+/g, "").toLowerCase();
    if (s === "perhour" || s === "0") return "perHour";
    if (s === "pernight" || s === "1") return "perNight";
    if (
      s === "pervisit" ||
      s === "2" ||
      s === "persession" ||
      s === "3" ||
      s === "perpackage" ||
      s === "4"
    ) {
      return "flat";
    }
    return "flat";
  }

  const unit = String(rate?.unit ?? "").toLowerCase();
  if (unit === "hour" || unit === "hours") return "perHour";
  if (unit === "night" || unit === "nights") return "perNight";

  if (raw === undefined || raw === null || raw === "") {
    const n = serviceTypeToNumber(rate);
    if (n === 0 || n === 1 || n === 8) return "perHour";
    if (n === 2) return "perNight";
  }
  return "flat";
}

/** Calendar nights between local dates; matches server `(end.Date - start.Date).Days` with a minimum of 1 */
function calendarNightsBetween(start: Date, end: Date): number {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const days = Math.round((e.getTime() - s.getTime()) / 86400000);
  return Math.max(1, days);
}

function calculateBookingTotal(
  mode: BillingMode,
  rate: number,
  start: Date,
  end: Date,
): number {
  switch (mode) {
    case "perNight":
      return rate * calendarNightsBetween(start, end);
    case "perHour": {
      const hours = (end.getTime() - start.getTime()) / 3600000;
      const total = rate * Math.max(0, hours);
      return Math.round(total * 100) / 100;
    }
    default:
      return rate;
  }
}

/**
 * Resolves local start/end for the booking window.
 * If end is before start on the same calendar day, end is moved forward by one day (overnight / next-morning end).
 */
function resolveBookingRange(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
): { start: Date; end: Date } | null {
  if (!startDate || !startTime || !endTime) return null;
  const resolvedEndDate = endDate || startDate;
  const start = new Date(combineDateAndTime(startDate, startTime));
  let end = new Date(combineDateAndTime(resolvedEndDate, endTime));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (end <= start) {
    end = new Date(end.getTime() + 86400000);
  }
  if (end <= start) return null;
  return { start, end };
}

/** PetOwner.Data `ServiceType` enum ordinal — used when JSON sends string names */
function serviceTypeToNumber(rate: any): number {
  if (typeof rate?.serviceType === "number" && !Number.isNaN(rate.serviceType)) {
    return rate.serviceType;
  }
  const label = rate?.service ?? rate?.serviceType;
  if (typeof label !== "string") return 0;
  const lower = label.toLowerCase().trim();
  const entry = Object.entries(SERVICE_TYPE_NAMES).find(
    ([, name]) => name.toLowerCase() === lower,
  );
  if (entry) return Number(entry[0]);
  const compact = label.replace(/[\s-]/g, "");
  const enumHit = Object.entries(SERVICE_TYPE_NAMES).find(
    ([, name]) => name.replace(/\s+/g, "").toLowerCase() === compact.toLowerCase(),
  );
  return enumHit ? Number(enumHit[0]) : 0;
}

/** Reset current stack, then switch to Profile -> MyBookings (outgoing). */
function navigateToMyBookingsOutgoing(navigation: { getParent: () => any }) {
  const stack = navigation as any;
  const stackRouteNames = stack.getState?.()?.routeNames as string[] | undefined;
  if (stackRouteNames?.includes("ExploreMain")) {
    stack.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "ExploreMain" }],
      }),
    );
  } else if (stackRouteNames?.includes("MyPetsMain")) {
    stack.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "MyPetsMain" }],
      }),
    );
  } else if (stackRouteNames?.includes("ProfileMain")) {
    stack.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "ProfileMain" }],
      }),
    );
  }

  let parent: any = navigation.getParent();
  while (parent) {
    const names = parent.getState?.()?.routeNames as string[] | undefined;
    if (names?.includes("Profile") && names.includes("Explore")) {
      parent.navigate("Profile", {
        screen: "MyBookings",
        params: { tab: "outgoing" },
      });
      return;
    }
    parent = parent.getParent?.();
  }
  (navigation as any).navigate("MyBookings", { tab: "outgoing" });
}

/** Parse "HH:mm" or "HH:mm:ss" → total minutes from midnight */
function parseTimeMinutes(t: string): number {
  const parts = t.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

/** Check whether a HH:mm time falls within any of the provider's slots for the given date */
function isTimeWithinSlots(
  time: string,
  dateStr: string,
  availabilitySlots: ProviderPublicProfileDto["availabilitySlots"],
): boolean {
  if (!time || !dateStr || availabilitySlots.length === 0) return true;
  const dow = new Date(`${dateStr}T12:00:00`).getDay();
  const minutes = parseTimeMinutes(time);
  return availabilitySlots
    .filter((s) => s.dayOfWeek === dow)
    .some((s) => {
      const start = parseTimeMinutes(s.startTime);
      const end = parseTimeMinutes(s.endTime);
      return minutes >= start && minutes < end;
    });
}

export function BookingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const profile = route.params?.profile as ProviderPublicProfileDto;
  const prefillDate = (route.params?.requestedDate as string | undefined) ?? "";
  const prefillTime = (route.params?.requestedTime as string | undefined) ?? "";
  const { colors } = useTheme();
  const { t, isRTL, rtlText, rtlStyle } = useTranslation();

  const pets = usePetsStore((s) => s.pets);
  const petsLoading = usePetsStore((s) => s.loading);

  useEffect(() => {
    void usePetsStore.getState().fetchPets();
  }, []);

  const showPetsLoading = petsLoading && pets.length === 0;
  const hasPets = pets.length > 0;

  const [selectedRateIdx, setSelectedRateIdx] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(prefillDate);
  const [startTime, setStartTime] = useState(prefillTime);
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const selectedRate = selectedRateIdx !== null ? profile.serviceRates[selectedRateIdx] : null;
  const sr = selectedRate as any;

  /** End-time slots must be after start only on the same calendar day; multi-day boarding allows early pickup on the last day. */
  const endTimeDisableAtOrBefore = useMemo(() => {
    if (!sr) return undefined;
    const mode = getBillingMode(sr);
    if (mode === "perNight") {
      const resolvedEnd = endDate || startDate;
      if (resolvedEnd === startDate && startTime) return startTime;
      return undefined;
    }
    return startTime || undefined;
  }, [sr, startTime, startDate, endDate]);

  /** True when a prefill time was requested but falls outside this provider's working hours */
  const prefillTimeInvalid = useMemo(() => {
    if (!prefillTime || !prefillDate) return false;
    return !isTimeWithinSlots(prefillTime, prefillDate, profile.availabilitySlots ?? []);
  }, [prefillTime, prefillDate, profile.availabilitySlots]);

  /** True when the currently selected start time is outside the provider's slots for startDate */
  const startTimeInvalid = useMemo(() => {
    if (!startTime || !startDate) return false;
    return !isTimeWithinSlots(startTime, startDate, profile.availabilitySlots ?? []);
  }, [startTime, startDate, profile.availabilitySlots]);

  const estimatedPrice = useMemo(() => {
    if (!selectedRate || !startDate || !startTime) return null;
    const billingMode = getBillingMode(sr);
    if (billingMode === "perNight" && (!endDate || !endTime)) return null;
    if (billingMode !== "perNight" && !endTime) return null;
    const range = resolveBookingRange(startDate, startTime, endDate, endTime);
    if (!range) return null;
    const total = calculateBookingTotal(billingMode, sr?.rate ?? 0, range.start, range.end);
    return total > 0 ? total : null;
  }, [selectedRate, startDate, startTime, endDate, endTime]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (selectedRateIdx === null) {
      showGlobalAlertCompat(t("errorTitle"), t("selectServiceFirst"));
      return;
    }
    if (!startDate || !startTime) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }
    if (startTimeInvalid) {
      showGlobalAlertCompat(t("errorTitle"), t("timeSlotUnavailable"));
      return;
    }
    const billingMode = getBillingMode(sr);
    if (billingMode === "perNight" && (!endDate || !endTime)) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }
    if (billingMode !== "perNight" && !endTime) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }
    const range = resolveBookingRange(startDate, startTime, endDate, endTime);
    if (!range) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }
    const startISO = range.start.toISOString();
    const endISO = range.end.toISOString();
    const clientTotal = calculateBookingTotal(billingMode, sr?.rate ?? 0, range.start, range.end);
    if (clientTotal <= 0) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }

    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      // Server recomputes `totalPrice` from the same start/end window and provider rate; keep client range in sync with the estimate above.
      await bookingsApi.create({
        providerId: profile.providerId,
        serviceType: serviceTypeToNumber(sr),
        startDate: startISO,
        endDate: endISO,
        notes: notes.trim() || undefined,
      });
      showGlobalAlertCompat(t("bookingSuccess"), t("bookingCreated"), [
        {
          text: "OK",
          onPress: () => navigateToMyBookingsOutgoing(navigation),
        },
      ]);
    } catch {
      /* error toast from global API interceptor */
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" edges={["top"]} style={{ marginTop: -8, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={colors.text}
          />
        </Pressable>
        <Text
          style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center" }}
          numberOfLines={1}
        >
          {t("bookNow")} — {profile.name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {showPetsLoading ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !hasPets ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-5xl mb-4">🐾</Text>
          <Text
            className="text-xl font-bold text-center mb-3 px-2"
            style={[{ color: colors.text }, rtlStyle]}
          >
            {t("noPetsForBookingTitle")}
          </Text>
          <Text
            className="text-sm text-center mb-8 leading-5 px-2"
            style={[{ color: colors.textMuted }, rtlStyle]}
          >
            {t("noPetsForBookingDesc")}
          </Text>
          <Pressable
            onPress={() =>
              navigation.navigate("MyPets", { screen: "AddPet" })
            }
            className="rounded-2xl px-10 py-4 self-stretch max-w-sm items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text
              className="text-base font-bold"
              style={{ color: "#fff", ...rtlStyle }}
            >
              {t("addPetNow")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Service Selection */}
        <View
          className="rounded-2xl p-5 mb-5"
          style={{
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text style={[rtlText, { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 14 }]}>
            {t("selectService")}
          </Text>
          {profile.serviceRates.map((rate: any, idx: number) => {
            const name = rate.service ?? SERVICE_TYPE_NAMES[rate.serviceType] ?? `Service ${rate.serviceType}`;
            const unit = rate.unit ?? PRICING_UNIT_LABELS[rate.pricingUnit] ?? "";
            const selected = selectedRateIdx === idx;

            return (
              <Pressable
                key={idx}
                onPress={() => setSelectedRateIdx(idx)}
                style={{
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  marginBottom: 8,
                  borderWidth: 2,
                  borderColor: selected ? colors.text : colors.borderLight,
                  backgroundColor: selected ? colors.cardHighlight : "transparent",
                }}
              >
                <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: selected ? colors.text : colors.textMuted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected && (
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.text }} />
                    )}
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{name}</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                  ₪{rate.rate}{" "}
                  <Text style={{ fontSize: 12, fontWeight: "500", color: colors.textMuted }}>/ {unit}</Text>
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Date & Time */}
        <View
          className="rounded-2xl p-5 mb-5"
          style={{
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {/* Prefill-time warning banner */}
          {prefillTimeInvalid && (
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                gap: 8,
                backgroundColor: colors.warningLight,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 16,
              }}
            >
              <Ionicons name="warning-outline" size={18} color={colors.warning} />
              <Text style={[rtlText, { color: colors.warning, fontSize: 13, fontWeight: "600", flex: 1 }]}>
                {t("timeSlotUnavailable")}
              </Text>
            </View>
          )}

          <Text style={[rtlText, { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 14 }]}>
            {t("startDate")}
          </Text>
          <SmartCalendarPicker
            availabilitySlots={profile.availabilitySlots ?? []}
            selectedDate={startDate}
            onDateSelect={(d) => {
              setStartDate(d);
              // Auto-set end date to start date for single-day services;
              // for multi-night services the user can change it below.
              if (!endDate || endDate < d) setEndDate(d);
              // Clear time selections so user picks fresh slots for the new day
              setStartTime("");
              setEndTime("");
            }}
          />

          {startDate ? (
            <>
              <Text style={[rtlText, { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 18, marginBottom: 10 }]}>
                {t("startTime")}
              </Text>
              <TimeSlotSelector
                availabilitySlots={profile.availabilitySlots ?? []}
                selectedDate={startDate}
                selectedTime={startTime}
                onTimeSelect={setStartTime}
                filterPastSlotsForToday
              />
            </>
          ) : null}

          {/* End date — only show for multi-day pricing units (Boarding = 1, PerNight = 1) */}
          {sr && (sr.pricingUnit === 1 || sr.unit === "night") ? (
            <>
              <Text style={[rtlText, { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 22, marginBottom: 14 }]}>
                {t("endDate")}
              </Text>
              <SmartCalendarPicker
                availabilitySlots={profile.availabilitySlots ?? []}
                selectedDate={endDate}
                onDateSelect={(d) => {
                  setEndDate(d);
                  setEndTime("");
                }}
              />
              {endDate ? (
                <>
                  <Text style={[rtlText, { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 18, marginBottom: 10 }]}>
                    {t("endTime")}
                  </Text>
                  <TimeSlotSelector
                    availabilitySlots={profile.availabilitySlots ?? []}
                    selectedDate={endDate}
                    selectedTime={endTime}
                    onTimeSelect={setEndTime}
                    disableTimesAtOrBefore={endTimeDisableAtOrBefore}
                  />
                </>
              ) : null}
            </>
          ) : (
            /* For hourly/per-visit services, end time is on the same day */
            startDate && startTime ? (
              <>
                <Text style={[rtlText, { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 18, marginBottom: 10 }]}>
                  {t("endTime")}
                </Text>
                <TimeSlotSelector
                  availabilitySlots={profile.availabilitySlots ?? []}
                  selectedDate={startDate}
                  selectedTime={endTime}
                  onTimeSelect={(t) => {
                    setEndTime(t);
                    setEndDate(startDate);
                  }}
                  disableTimesAtOrBefore={endTimeDisableAtOrBefore}
                />
              </>
            ) : null
          )}
        </View>

        {/* Price Estimate */}
        {estimatedPrice !== null && (
          <View
            className="rounded-2xl p-5 mb-5"
            style={{
              backgroundColor: colors.surface,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text style={[rtlText, { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: 4 }]}>
              {t("estimatedPrice")}
            </Text>
            <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text, textAlign: "center", marginTop: 4 }}>
              ₪{estimatedPrice.toFixed(2)}
            </Text>
          </View>
        )}

        {/* Notes */}
        <View
          className="rounded-2xl p-5 mb-5"
          style={{
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text style={[rtlText, { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: 8 }]}>
            {t("bookingNotes")}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t("bookingNotesPlaceholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: colors.surfaceTertiary,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
              fontSize: 14,
              color: colors.text,
              minHeight: 100,
              textAlignVertical: "top",
              textAlign: isRTL ? "right" : "left",
            }}
          />
        </View>
      </ScrollView>

      {/* Sticky bottom button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingBottom: Platform.OS === "ios" ? 34 : 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={submitting || startTimeInvalid}
          style={{
            backgroundColor: submitting || startTimeInvalid ? colors.textMuted : colors.text,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: submitting || startTimeInvalid ? 0 : 0.25,
            shadowRadius: 12,
            elevation: submitting || startTimeInvalid ? 0 : 6,
            opacity: startTimeInvalid ? 0.55 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : startTimeInvalid ? (
            <>
              <Ionicons name="ban-outline" size={20} color={colors.textInverse} />
              <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "700" }}>
                {t("timeSlotUnavailable")}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
              <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "700" }}>
                {t("confirmBooking")}
                {estimatedPrice !== null ? ` — ₪${estimatedPrice.toFixed(2)}` : ""}
              </Text>
            </>
          )}
        </Pressable>
      </View>
        </>
      )}
    </SafeAreaView>
  );
}
