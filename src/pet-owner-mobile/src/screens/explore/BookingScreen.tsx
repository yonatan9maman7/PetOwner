import { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { bookingsApi } from "../../api/client";
import { getApiErrorMessage } from "../../utils/apiUtils";
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

/** Switch to Profile → My Bookings (outgoing) from any stack that hosts `Booking`. */
function navigateToMyBookingsOutgoing(navigation: { getParent: () => any }) {
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

function calculatePrice(
  pricingUnit: number,
  rate: number,
  start: Date,
  end: Date,
): number {
  switch (pricingUnit) {
    case 1: {
      const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
      return rate * nights;
    }
    case 0: {
      const hours = Math.max(0, (end.getTime() - start.getTime()) / 3600000);
      return rate * hours;
    }
    default:
      return rate;
  }
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
    const resolvedEndDate = endDate || startDate;
    const resolvedEndTime = endTime || startTime;
    const start = new Date(combineDateAndTime(startDate, startTime));
    const end = new Date(combineDateAndTime(resolvedEndDate, resolvedEndTime));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
    const pricingUnit = sr?.pricingUnit ?? 0;
    return calculatePrice(pricingUnit, sr?.rate ?? 0, start, end);
  }, [selectedRate, startDate, startTime, endDate, endTime]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (selectedRateIdx === null) {
      Alert.alert(t("errorTitle"), t("selectServiceFirst"));
      return;
    }
    if (!startDate || !startTime) {
      Alert.alert(t("errorTitle"), t("invalidDates"));
      return;
    }
    if (startTimeInvalid) {
      Alert.alert(t("errorTitle"), t("timeSlotUnavailable"));
      return;
    }
    const resolvedEndDate = endDate || startDate;
    const resolvedEndTime = endTime || startTime;
    const startISO = combineDateAndTime(startDate, startTime);
    const endISO = combineDateAndTime(resolvedEndDate, resolvedEndTime);
    if (new Date(endISO) <= new Date(startISO)) {
      Alert.alert(t("errorTitle"), t("invalidDates"));
      return;
    }

    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      await bookingsApi.create({
        providerId: profile.providerId,
        serviceType: sr?.serviceType ?? 0,
        startDate: new Date(startISO).toISOString(),
        endDate: new Date(endISO).toISOString(),
        notes: notes.trim() || undefined,
      });
      Alert.alert(t("bookingSuccess"), t("bookingCreated"), [
        {
          text: "OK",
          onPress: () => navigateToMyBookingsOutgoing(navigation),
        },
      ]);
    } catch (err: unknown) {
      Alert.alert(t("errorTitle"), getApiErrorMessage(err));
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
          flexDirection: isRTL ? "row-reverse" : "row",
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
                  flexDirection: isRTL ? "row-reverse" : "row",
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
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
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
                flexDirection: isRTL ? "row-reverse" : "row",
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
