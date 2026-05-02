import { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { bookingsApi, mapApi } from "../../api/client";
import { PetSpecies, ServiceType, type PetDto, type ProviderPublicProfileDto } from "../../types/api";
import { SmartCalendarPicker } from "../../components/shared/SmartCalendarPicker";
import { TimeSlotSelector } from "../../components/shared/TimeSlotSelector";
import { usePetsStore } from "../../store/petsStore";

const SERVICE_TYPE_BY_ORDINAL: Record<number, ServiceType> = {
  0: ServiceType.DogWalking,
  1: ServiceType.PetSitting,
  2: ServiceType.Boarding,
  3: ServiceType.DropInVisit,
  4: ServiceType.Training,
  5: ServiceType.Insurance,
  6: ServiceType.PetStore,
  7: ServiceType.HouseSitting,
  8: ServiceType.DoggyDayCare,
};

const SERVICE_TYPE_NAMES: Record<ServiceType, string> = {
  [ServiceType.DogWalking]: "Dog Walking",
  [ServiceType.PetSitting]: "Pet Sitting",
  [ServiceType.Boarding]: "Boarding",
  [ServiceType.DropInVisit]: "Drop-in Visit",
  [ServiceType.Training]: "Training",
  [ServiceType.Insurance]: "Insurance",
  [ServiceType.PetStore]: "Pet Store",
  [ServiceType.HouseSitting]: "House Sitting",
  [ServiceType.DoggyDayCare]: "Doggy Day Care",
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
    const serviceType = resolveServiceType(rate);
    if (
      serviceType === ServiceType.DogWalking ||
      serviceType === ServiceType.PetSitting ||
      serviceType === ServiceType.HouseSitting ||
      serviceType === ServiceType.DoggyDayCare
    ) {
      return "perHour";
    }
    if (serviceType === ServiceType.Boarding) return "perNight";
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
  fixedDurationMinutes?: number | null,
  pricingUnit?: string | number,
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
      if (fixedDurationMinutes && fixedDurationMinutes > 0) {
        const rawUnit = String(pricingUnit ?? "").replace(/\s+/g, "").toLowerCase();
        if (rawUnit === "persession" || rawUnit === "3") {
          const total = rate * (fixedDurationMinutes / 60);
          return Math.round(total * 100) / 100;
        }
      }
      return rate;
  }
}

function getFixedDurationMinutes(rate: any): number | null {
  const raw = rate?.fixedDurationMinutes ?? rate?.FixedDurationMinutes;
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function isDogPet(pet: PetDto): boolean {
  const raw = pet.species as PetSpecies | string | number;
  return raw === PetSpecies.Dog || String(raw).toLowerCase() === "dog" || String(raw) === "1";
}

function petSpeciesLabel(pet: PetDto): string {
  const raw = pet.species as PetSpecies | string | number;
  if (typeof raw === "string" && raw.length > 0) return raw;
  return PetSpecies[raw as PetSpecies] ?? "Pet";
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
  fixedDurationMinutes?: number | null,
): { start: Date; end: Date } | null {
  if (!startDate || !startTime) return null;
  const start = new Date(combineDateAndTime(startDate, startTime));
  if (isNaN(start.getTime())) return null;

  if (fixedDurationMinutes && fixedDurationMinutes > 0) {
    return { start, end: new Date(start.getTime() + fixedDurationMinutes * 60000) };
  }

  if (!endTime) return null;
  const resolvedEndDate = endDate || startDate;
  let end = new Date(combineDateAndTime(resolvedEndDate, endTime));
  if (isNaN(end.getTime())) return null;
  if (end <= start) {
    end = new Date(end.getTime() + 86400000);
  }
  if (end <= start) return null;
  return { start, end };
}

/** Resolve API `ServiceType` to the exact PascalCase enum string expected by the backend. */
function resolveServiceType(rate: any): ServiceType | null {
  if (typeof rate?.serviceType === "number" && !Number.isNaN(rate.serviceType)) {
    return SERVICE_TYPE_BY_ORDINAL[rate.serviceType] ?? null;
  }

  const label = rate?.service ?? rate?.serviceType;
  if (typeof label !== "string") return null;

  const trimmed = label.trim();
  const numeric = Number(trimmed);
  if (Number.isInteger(numeric)) return SERVICE_TYPE_BY_ORDINAL[numeric] ?? null;

  const enumMatch = Object.values(ServiceType).find((type) => type === trimmed);
  if (enumMatch) return enumMatch;

  const compact = trimmed.replace(/[\s-]/g, "").toLowerCase();
  const compactEnumMatch = Object.values(ServiceType).find(
    (type) => type.toLowerCase() === compact,
  );
  if (compactEnumMatch) return compactEnumMatch;

  const displayMatch = Object.entries(SERVICE_TYPE_NAMES).find(
    ([, displayName]) => displayName.replace(/[\s-]/g, "").toLowerCase() === compact,
  );
  return displayMatch ? displayMatch[0] as ServiceType : null;
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
  const fetchPets = usePetsStore((s) => s.fetchPets);

  useEffect(() => {
    if (pets.length === 0) void fetchPets();
  }, [fetchPets, pets.length]);

  const showPetsLoading = petsLoading && pets.length === 0;
  const hasPets = pets.length > 0;

  const [selectedRateIdx, setSelectedRateIdx] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(prefillDate);
  const [startTime, setStartTime] = useState(prefillTime);
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [startAvailableTimes, setStartAvailableTimes] = useState<string[]>([]);
  const [startAvailabilityLoading, setStartAvailabilityLoading] = useState(false);
  const [endAvailableTimes, setEndAvailableTimes] = useState<string[]>([]);
  const [endAvailabilityLoading, setEndAvailabilityLoading] = useState(false);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const submitLockRef = useRef(false);

  const selectedRate = selectedRateIdx !== null ? profile.serviceRates[selectedRateIdx] : null;
  const sr = selectedRate as any;
  const selectedServiceType = useMemo(
    () => (selectedRate ? resolveServiceType(sr) : null),
    [selectedRate, sr],
  );
  const selectedBillingMode = useMemo(
    () => (sr ? getBillingMode(sr) : null),
    [sr],
  );
  const fixedDurationMinutes = useMemo(
    () => (sr ? getFixedDurationMinutes(sr) : null),
    [sr],
  );
  const isFixedDuration = fixedDurationMinutes !== null;
  const isDogOnlyService = selectedServiceType === ServiceType.DogWalking
    || selectedServiceType === ServiceType.DoggyDayCare;

  useEffect(() => {
    if (!isDogOnlyService) return;
    setSelectedPetIds((ids) =>
      ids.filter((id) => pets.some((pet) => pet.id === id && isDogPet(pet))),
    );
  }, [isDogOnlyService, pets]);

  useEffect(() => {
    let cancelled = false;

    setStartAvailableTimes([]);
    if (!startDate || !selectedServiceType) {
      setStartAvailabilityLoading(false);
      return;
    }

    setStartAvailabilityLoading(true);
    mapApi
      .getProviderAvailability(profile.providerId, startDate, selectedServiceType)
      .then((times) => {
        if (!cancelled) setStartAvailableTimes(times);
      })
      .catch(() => {
        if (!cancelled) setStartAvailableTimes([]);
      })
      .finally(() => {
        if (!cancelled) setStartAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile.providerId, selectedServiceType, startDate]);

  useEffect(() => {
    let cancelled = false;

    setEndAvailableTimes([]);
    if (isFixedDuration || selectedBillingMode !== "perNight" || !endDate || !selectedServiceType) {
      setEndAvailabilityLoading(false);
      return;
    }

    setEndAvailabilityLoading(true);
    mapApi
      .getProviderAvailability(profile.providerId, endDate, selectedServiceType)
      .then((times) => {
        if (!cancelled) setEndAvailableTimes(times);
      })
      .catch(() => {
        if (!cancelled) setEndAvailableTimes([]);
      })
      .finally(() => {
        if (!cancelled) setEndAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile.providerId, isFixedDuration, selectedBillingMode, selectedServiceType, endDate]);

  useEffect(() => {
    if (
      startTime &&
      selectedServiceType &&
      !startAvailabilityLoading &&
      !startAvailableTimes.includes(startTime)
    ) {
      setStartTime("");
      setEndTime("");
    }
  }, [selectedServiceType, startAvailabilityLoading, startAvailableTimes, startTime]);

  /** End-time slots must be after start only on the same calendar day; multi-day boarding allows early pickup on the last day. */
  const endTimeDisableAtOrBefore = useMemo(() => {
    if (!sr) return undefined;
    if (fixedDurationMinutes) return undefined;
    const mode = getBillingMode(sr);
    if (mode === "perNight") {
      const resolvedEnd = endDate || startDate;
      if (resolvedEnd === startDate && startTime) return startTime;
      return undefined;
    }
    return startTime || undefined;
  }, [sr, fixedDurationMinutes, startTime, startDate, endDate]);

  /** True when a prefill time was requested but falls outside this provider's working hours */
  const prefillTimeInvalid = useMemo(() => {
    if (!prefillTime || !prefillDate || prefillDate !== startDate || startAvailabilityLoading) return false;
    return selectedServiceType !== null && !startAvailableTimes.includes(prefillTime);
  }, [prefillTime, prefillDate, startDate, startAvailabilityLoading, selectedServiceType, startAvailableTimes]);

  /** True when the selected start time is no longer returned by real-time availability. */
  const startTimeInvalid = useMemo(() => {
    if (!startTime || !startDate || !selectedServiceType || startAvailabilityLoading) return false;
    return !startAvailableTimes.includes(startTime);
  }, [startTime, startDate, selectedServiceType, startAvailabilityLoading, startAvailableTimes]);

  const togglePetSelection = (petId: string) => {
    setSelectedPetIds((ids) =>
      ids.includes(petId)
        ? ids.filter((id) => id !== petId)
        : [...ids, petId],
    );
  };

  const estimatedPrice = useMemo(() => {
    if (!selectedRate || !startDate || !startTime) return null;
    const billingMode = getBillingMode(sr);
    if (!fixedDurationMinutes) {
      if (billingMode === "perNight" && (!endDate || !endTime)) return null;
      if (billingMode !== "perNight" && !endTime) return null;
    }
    const range = resolveBookingRange(startDate, startTime, endDate, endTime, fixedDurationMinutes);
    if (!range) return null;
    const total = calculateBookingTotal(
      billingMode,
      sr?.rate ?? 0,
      range.start,
      range.end,
      fixedDurationMinutes,
      sr?.pricingUnit ?? sr?.PricingUnit,
    );
    return total > 0 ? total : null;
  }, [selectedRate, sr, startDate, startTime, endDate, endTime, fixedDurationMinutes]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (selectedRateIdx === null) {
      showGlobalAlertCompat(t("errorTitle"), t("selectServiceFirst"));
      return;
    }
    if (selectedPetIds.length === 0) {
      showGlobalAlertCompat(t("errorTitle"), t("bookingSelectPetRequired"));
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
    if (!fixedDurationMinutes) {
      if (billingMode === "perNight" && (!endDate || !endTime)) {
        showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
        return;
      }
      if (billingMode !== "perNight" && !endTime) {
        showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
        return;
      }
    }
    const range = resolveBookingRange(startDate, startTime, endDate, endTime, fixedDurationMinutes);
    if (!range) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }
    const startISO = range.start.toISOString();
    const endISO = range.end.toISOString();
    const clientTotal = calculateBookingTotal(
      billingMode,
      sr?.rate ?? 0,
      range.start,
      range.end,
      fixedDurationMinutes,
      sr?.pricingUnit ?? sr?.PricingUnit,
    );
    if (clientTotal <= 0) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }

    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      // Server recomputes `totalPrice` from the same start/end window and provider rate; keep client range in sync with the estimate above.
      const serviceType = resolveServiceType(sr);
      if (!serviceType) {
        showGlobalAlertCompat(t("errorTitle"), t("selectServiceFirst"));
        return;
      }

      await bookingsApi.create({
        providerId: profile.providerId,
        serviceType,
        petIds: selectedPetIds,
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
            const serviceType = resolveServiceType(rate);
            const name = rate.service ?? (serviceType ? SERVICE_TYPE_NAMES[serviceType] : `Service ${rate.serviceType}`);
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

        {/* Pet Selection */}
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
          <Text style={[rtlText, { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 6 }]}>
            {t("bookingSelectPets")}
          </Text>
          {isDogOnlyService ? (
            <Text style={[rtlText, { color: colors.textMuted, fontSize: 12, marginBottom: 12 }]}>
              {t("bookingDogServiceOnlyDogs")}
            </Text>
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 10,
              flexDirection: rowDirectionForAppLayout(isRTL),
              paddingVertical: 2,
            }}
          >
            {pets.map((pet) => {
              const isSelected = selectedPetIds.includes(pet.id);
              const disabled = isDogOnlyService && !isDogPet(pet);
              return (
                <Pressable
                  key={pet.id}
                  onPress={() => {
                    if (disabled) {
                      showGlobalAlertCompat(t("errorTitle"), t("bookingDogServiceOnlyDogs"));
                      return;
                    }
                    togglePetSelection(pet.id);
                  }}
                  style={{
                    width: 112,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    backgroundColor: isSelected ? colors.primaryLight : colors.surfaceTertiary,
                    padding: 12,
                    alignItems: "center",
                    opacity: disabled ? 0.38 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 27,
                      backgroundColor: colors.surface,
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      marginBottom: 8,
                    }}
                  >
                    {pet.imageUrl ? (
                      <Image source={{ uri: pet.imageUrl }} style={{ width: 54, height: 54 }} />
                    ) : (
                      <Ionicons name="paw" size={26} color={disabled ? colors.textMuted : colors.primary} />
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.text, fontSize: 13, fontWeight: "700", textAlign: "center", maxWidth: 88 }}
                  >
                    {pet.name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    {petSpeciesLabel(pet)}
                  </Text>
                  {isSelected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.primary}
                      style={{ position: "absolute", top: 6, right: 6 }}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
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
              {!selectedServiceType ? (
                <Text style={[rtlText, { color: colors.textMuted, fontSize: 13, paddingVertical: 10 }]}>
                  {t("bookingSelectServiceForTimes")}
                </Text>
              ) : (
                <TimeSlotSelector
                  availableTimes={startAvailableTimes}
                  selectedDate={startDate}
                  selectedTime={startTime}
                  onTimeSelect={setStartTime}
                  loading={startAvailabilityLoading}
                />
              )}
            </>
          ) : null}

          {fixedDurationMinutes ? (
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                gap: 8,
                backgroundColor: colors.primaryLight,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginTop: 18,
              }}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={[rtlText, { color: colors.primary, fontSize: 14, fontWeight: "700", flex: 1 }]}>
                משך הטיול: {fixedDurationMinutes} דקות
              </Text>
            </View>
          ) : sr && (sr.pricingUnit === 1 || sr.unit === "night") ? (
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
                    availableTimes={endAvailableTimes}
                    selectedDate={endDate}
                    selectedTime={endTime}
                    onTimeSelect={setEndTime}
                    loading={endAvailabilityLoading}
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
                  availableTimes={startAvailableTimes}
                  selectedDate={startDate}
                  selectedTime={endTime}
                  onTimeSelect={(t) => {
                    setEndTime(t);
                    setEndDate(startDate);
                  }}
                  loading={startAvailabilityLoading}
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
