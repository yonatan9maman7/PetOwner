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
import { useTranslation, rowDirectionForAppLayout, type TranslationKey } from "../../i18n";
import {
  pricingUnitShortLabel,
  resolveServiceType,
  serviceRateDisplayName,
} from "../../i18n/serviceRateDisplay";
import { useTheme } from "../../theme/ThemeContext";
import { bookingsApi, mapApi } from "../../api/client";
import {
  PetSpecies,
  ServiceType,
  type PetDto,
  type ProviderPublicProfileDto,
} from "../../types/api";
import { SmartCalendarPicker } from "../../components/shared/SmartCalendarPicker";
import { TimeSlotSelector } from "../../components/shared/TimeSlotSelector";
import { ScreenLoadingCenter } from "../../components/shared/ScreenLoadingCenter";
import { StackBackHeader } from "../../components/StackBackHeader";
import { usePetsStore } from "../../store/petsStore";
import { customerBreakdownFromProviderNet } from "../../utils/pricingDisplay";
import Toast from "react-native-toast-message";

const PET_SPECIES_TO_KEY: Partial<Record<PetSpecies, TranslationKey>> = {
  [PetSpecies.Dog]: "speciesDog",
  [PetSpecies.Cat]: "speciesCat",
  [PetSpecies.Bird]: "speciesBird",
  [PetSpecies.Rabbit]: "speciesRabbit",
  [PetSpecies.Reptile]: "speciesReptile",
  [PetSpecies.Other]: "speciesOther",
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

/** Boarding / pet sitting: hotel-style check-in and check-out (date range), regardless of per-hour vs per-night API pricing. */
function isMultiDayStayService(serviceType: ServiceType | null): boolean {
  return serviceType === ServiceType.Boarding || serviceType === ServiceType.PetSitting;
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

/** Matches web `booking-modal`: line total × number of pets on the booking. */
function applyPetMultiplier(total: number, petCount: number): number {
  return total * Math.max(1, petCount);
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

function petSpeciesDisplay(pet: PetDto, t: (key: TranslationKey) => string): string {
  const raw = pet.species as PetSpecies | string | number;
  if (typeof raw === "number") {
    const key = PET_SPECIES_TO_KEY[raw as PetSpecies];
    if (key) return t(key);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return t("speciesOther");
    const lower = s.toLowerCase();
    if (lower === "dog" || lower === "1") return t("speciesDog");
    if (lower === "cat" || lower === "2") return t("speciesCat");
    if (lower === "bird" || lower === "3") return t("speciesBird");
    if (lower === "rabbit" || lower === "4") return t("speciesRabbit");
    if (lower === "reptile" || lower === "5") return t("speciesReptile");
    if (lower === "other" || lower === "6") return t("speciesOther");
    const fromEnum = (PetSpecies as Record<string, unknown>)[s];
    if (typeof fromEnum === "number") {
      const key = PET_SPECIES_TO_KEY[fromEnum as PetSpecies];
      if (key) return t(key);
    }
    return s;
  }
  return t("speciesOther");
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

const FLAT_BOOKING_DAY_START = "00:00";
const FLAT_BOOKING_DAY_END = "23:59";

/** Hourly, nightly, fixed-duration walks, and multi-day stays need explicit time slots. */
function serviceNeedsTimeSelection(
  rate: any,
  serviceType: ServiceType | null,
): boolean {
  if (getFixedDurationMinutes(rate)) return true;
  const mode = getBillingMode(rate);
  if (mode === "perHour" || mode === "perNight") return true;
  if (isMultiDayStayService(serviceType)) return true;
  return false;
}

/** Package / visit / insurance-style services: date only, default day window for the API. */
function resolveFlatBookingRange(startDate: string): { start: Date; end: Date } | null {
  if (!startDate) return null;
  const start = new Date(combineDateAndTime(startDate, FLAT_BOOKING_DAY_START));
  let end = new Date(combineDateAndTime(startDate, FLAT_BOOKING_DAY_END));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (end <= start) {
    end = new Date(start.getTime() + 60_000);
  }
  return { start, end };
}

function resolveBookingRangeForRate(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  fixedDurationMinutes: number | null | undefined,
  needsTime: boolean,
): { start: Date; end: Date } | null {
  if (!needsTime) return resolveFlatBookingRange(startDate);
  return resolveBookingRange(startDate, startTime, endDate, endTime, fixedDurationMinutes);
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
  const [startAvailabilityError, setStartAvailabilityError] = useState(false);
  const [endAvailableTimes, setEndAvailableTimes] = useState<string[]>([]);
  const [endAvailabilityLoading, setEndAvailabilityLoading] = useState(false);
  const [endAvailabilityError, setEndAvailabilityError] = useState(false);
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
  const isMultiDayService = isMultiDayStayService(selectedServiceType);
  const needsTimeSelection = useMemo(
    () => (sr ? serviceNeedsTimeSelection(sr, selectedServiceType) : false),
    [sr, selectedServiceType],
  );

  useEffect(() => {
    if (!isDogOnlyService) return;
    setSelectedPetIds((ids) =>
      ids.filter((id) => pets.some((pet) => pet.id === id && isDogPet(pet))),
    );
  }, [isDogOnlyService, pets]);

  useEffect(() => {
    let cancelled = false;

    setStartAvailableTimes([]);
    setStartAvailabilityError(false);
    if (!needsTimeSelection || !startDate || !selectedServiceType) {
      setStartAvailabilityLoading(false);
      return;
    }

    setStartAvailabilityLoading(true);
    mapApi
      .getProviderAvailability(profile.providerId, startDate, selectedServiceType)
      .then((times) => {
        if (!cancelled) {
          setStartAvailableTimes(times);
          setStartAvailabilityError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStartAvailableTimes([]);
          setStartAvailabilityError(true);
          Toast.show({
            type: "error",
            text1: t("errorTitle"),
            text2: t("bookingAvailabilityLoadFailed"),
            position: "top",
            visibilityTime: 5500,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setStartAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [needsTimeSelection, profile.providerId, selectedServiceType, startDate, t]);

  useEffect(() => {
    let cancelled = false;

    setEndAvailableTimes([]);
    setEndAvailabilityError(false);
    const needsCheckoutDaySlots =
      needsTimeSelection
      && !isFixedDuration
      && !!endDate
      && !!selectedServiceType
      && (isMultiDayService || selectedBillingMode === "perNight");
    if (!needsCheckoutDaySlots) {
      setEndAvailabilityLoading(false);
      return;
    }

    setEndAvailabilityLoading(true);
    mapApi
      .getProviderAvailability(profile.providerId, endDate, selectedServiceType)
      .then((times) => {
        if (!cancelled) {
          setEndAvailableTimes(times);
          setEndAvailabilityError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEndAvailableTimes([]);
          setEndAvailabilityError(true);
          Toast.show({
            type: "error",
            text1: t("errorTitle"),
            text2: t("bookingAvailabilityLoadFailed"),
            position: "top",
            visibilityTime: 5500,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setEndAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    needsTimeSelection,
    profile.providerId,
    isFixedDuration,
    isMultiDayService,
    selectedBillingMode,
    selectedServiceType,
    endDate,
    t,
  ]);

  useEffect(() => {
    if (
      needsTimeSelection
      && startTime
      && selectedServiceType
      && !startAvailabilityLoading
      && !startAvailableTimes.includes(startTime)
    ) {
      setStartTime("");
      setEndTime("");
    }
  }, [
    needsTimeSelection,
    selectedServiceType,
    startAvailabilityLoading,
    startAvailableTimes,
    startTime,
  ]);

  /** End-time slots must be after start only on the same calendar day; multi-day boarding allows early pickup on the last day. */
  const endTimeDisableAtOrBefore = useMemo(() => {
    if (!sr) return undefined;
    if (fixedDurationMinutes) return undefined;
    const mode = getBillingMode(sr);
    if (mode === "perNight" || isMultiDayService) {
      const resolvedEnd = endDate || startDate;
      if (resolvedEnd === startDate && startTime) return startTime;
      return undefined;
    }
    return startTime || undefined;
  }, [sr, fixedDurationMinutes, isMultiDayService, startTime, startDate, endDate]);

  /** True when a prefill time was requested but falls outside this provider's working hours */
  const prefillTimeInvalid = useMemo(() => {
    if (!needsTimeSelection) return false;
    if (!prefillTime || !prefillDate || prefillDate !== startDate || startAvailabilityLoading) return false;
    return selectedServiceType !== null && !startAvailableTimes.includes(prefillTime);
  }, [
    needsTimeSelection,
    prefillTime,
    prefillDate,
    startDate,
    startAvailabilityLoading,
    selectedServiceType,
    startAvailableTimes,
  ]);

  /** True when the selected start time is no longer returned by real-time availability. */
  const startTimeInvalid = useMemo(() => {
    if (!needsTimeSelection) return false;
    if (!startTime || !startDate || !selectedServiceType || startAvailabilityLoading) return false;
    return !startAvailableTimes.includes(startTime);
  }, [
    needsTimeSelection,
    startTime,
    startDate,
    selectedServiceType,
    startAvailabilityLoading,
    startAvailableTimes,
  ]);

  const togglePetSelection = (petId: string) => {
    setSelectedPetIds((ids) =>
      ids.includes(petId)
        ? ids.filter((id) => id !== petId)
        : [...ids, petId],
    );
  };

  const estimatedPricing = useMemo(() => {
    if (!selectedRate || !startDate) return null;
    if (needsTimeSelection && !startTime) return null;
    const billingMode = getBillingMode(sr);
    if (needsTimeSelection && !fixedDurationMinutes) {
      const needsExplicitCheckoutRange = billingMode === "perNight" || isMultiDayService;
      if (needsExplicitCheckoutRange && (!endDate || !endTime)) return null;
      if (!needsExplicitCheckoutRange && !endTime) return null;
    }
    const range = resolveBookingRangeForRate(
      startDate,
      startTime,
      endDate,
      endTime,
      fixedDurationMinutes,
      needsTimeSelection,
    );
    if (!range) return null;
    const lineTotal = calculateBookingTotal(
      billingMode,
      sr?.rate ?? 0,
      range.start,
      range.end,
      fixedDurationMinutes,
      sr?.pricingUnit ?? sr?.PricingUnit,
    );
    const providerNet = applyPetMultiplier(lineTotal, selectedPetIds.length);
    if (providerNet <= 0) return null;
    const breakdown = customerBreakdownFromProviderNet(providerNet);
    return { providerNet, ...breakdown };
  }, [
    selectedRate,
    sr,
    startDate,
    startTime,
    endDate,
    endTime,
    fixedDurationMinutes,
    isMultiDayService,
    needsTimeSelection,
    selectedPetIds.length,
  ]);

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
    if (!startDate) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }
    if (needsTimeSelection && !startTime) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }
    if (startTimeInvalid) {
      showGlobalAlertCompat(t("errorTitle"), t("timeSlotUnavailable"));
      return;
    }
    if (
      isMultiDayService
      && !fixedDurationMinutes
      && startDate
      && endDate
      && endDate < startDate
    ) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }
    if (
      isMultiDayService
      && !fixedDurationMinutes
      && startDate
      && endDate
      && startDate === endDate
      && startTime
      && endTime
      && endTime <= startTime
    ) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }
    const billingMode = getBillingMode(sr);
    if (needsTimeSelection && !fixedDurationMinutes) {
      const needsExplicitCheckoutRange = billingMode === "perNight" || isMultiDayService;
      if (needsExplicitCheckoutRange && (!endDate || !endTime)) {
        showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
        return;
      }
      if (!needsExplicitCheckoutRange && !endTime) {
        showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
        return;
      }
    }
    const range = resolveBookingRangeForRate(
      startDate,
      startTime,
      endDate,
      endTime,
      fixedDurationMinutes,
      needsTimeSelection,
    );
    if (!range) {
      showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
      return;
    }
    const startISO = range.start.toISOString();
    const endISO = range.end.toISOString();
    const lineTotal = calculateBookingTotal(
      billingMode,
      sr?.rate ?? 0,
      range.start,
      range.end,
      fixedDurationMinutes,
      sr?.pricingUnit ?? sr?.PricingUnit,
    );
    const clientTotal = applyPetMultiplier(lineTotal, selectedPetIds.length);
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
          text: t("alertDismissOk"),
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
      <StackBackHeader
        title={`${t("bookNow")} — ${profile.name}`}
        onBack={() => navigation.goBack()}
      />

      {showPetsLoading ? (
        <ScreenLoadingCenter />
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
            const name = serviceRateDisplayName(rate, t);
            const unit = pricingUnitShortLabel(rate, t);
            const selected = selectedRateIdx === idx;

            return (
              <Pressable
                key={idx}
                onPress={() => {
                  setSelectedRateIdx(idx);
                  const type = resolveServiceType(rate);
                  if (!serviceNeedsTimeSelection(rate, type)) {
                    setStartTime("");
                    setEndTime("");
                  }
                }}
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
                  ₪{rate.rate}
                  {unit ? (
                    <Text style={{ fontSize: 12, fontWeight: "500", color: colors.textMuted }}>
                      {" "}/ {unit}
                    </Text>
                  ) : null}
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
                    {petSpeciesDisplay(pet, t)}
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
            {isMultiDayService ? t("bookingCheckInDate") : t("startDate")}
          </Text>
          <SmartCalendarPicker
            availabilitySlots={profile.availabilitySlots ?? []}
            selectedDate={startDate}
            onDateSelect={(d) => {
              setStartDate(d);
              // Auto-set end date to start date for single-day services;
              // for stay services the user sets check-out on the second calendar.
              if (!endDate || endDate < d) setEndDate(d);
              // Clear time selections so user picks fresh slots for the new day
              setStartTime("");
              setEndTime("");
            }}
          />

          {startDate && needsTimeSelection ? (
            <>
              <Text style={[rtlText, { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 18, marginBottom: 10 }]}>
                {isMultiDayService ? t("bookingCheckInTime") : t("startTime")}
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
                  emptyMessage={
                    startAvailabilityError
                      ? t("bookingAvailabilityLoadFailed")
                      : t("bookingNoTimeSlotsForDate")
                  }
                />
              )}
            </>
          ) : null}

          {startDate && !needsTimeSelection ? (
            <Text
              style={[
                rtlText,
                {
                  color: colors.textMuted,
                  fontSize: 13,
                  marginTop: 14,
                  lineHeight: 20,
                },
              ]}
            >
              {t("bookingDateOnlyHint")}
            </Text>
          ) : null}

          {needsTimeSelection && fixedDurationMinutes ? (
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
                {t("bookingWalkDuration").replace("{{minutes}}", String(fixedDurationMinutes))}
              </Text>
            </View>
          ) : needsTimeSelection && sr && isMultiDayService ? (
            <>
              <Text style={[rtlText, { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 22, marginBottom: 14 }]}>
                {t("bookingCheckOutDate")}
              </Text>
              <SmartCalendarPicker
                availabilitySlots={profile.availabilitySlots ?? []}
                selectedDate={endDate}
                onDateSelect={(d) => {
                  if (startDate && d < startDate) {
                    showGlobalAlertCompat(t("errorTitle"), t("invalidDates"));
                    return;
                  }
                  setEndDate(d);
                  setEndTime("");
                }}
              />
              {endDate ? (
                <>
                  <Text style={[rtlText, { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 18, marginBottom: 10 }]}>
                    {t("bookingCheckOutTime")}
                  </Text>
                  <TimeSlotSelector
                    availableTimes={endAvailableTimes}
                    selectedDate={endDate}
                    selectedTime={endTime}
                    onTimeSelect={setEndTime}
                    loading={endAvailabilityLoading}
                    disableTimesAtOrBefore={endTimeDisableAtOrBefore}
                    emptyMessage={
                      endAvailabilityError
                        ? t("bookingAvailabilityLoadFailed")
                        : t("bookingNoTimeSlotsForDate")
                    }
                  />
                </>
              ) : null}
            </>
          ) : needsTimeSelection ? (
            /* Hourly services: end time on the same day */
            startDate && startTime ? (
              <>
                <Text style={[rtlText, { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 18, marginBottom: 10 }]}>
                  {t("endTime")}
                </Text>
                <TimeSlotSelector
                  availableTimes={startAvailableTimes}
                  selectedDate={startDate}
                  selectedTime={endTime}
                  onTimeSelect={(time) => {
                    setEndTime(time);
                    setEndDate(startDate);
                  }}
                  loading={startAvailabilityLoading}
                  disableTimesAtOrBefore={endTimeDisableAtOrBefore}
                  emptyMessage={
                    startAvailabilityError
                      ? t("bookingAvailabilityLoadFailed")
                      : t("bookingNoTimeSlotsForDate")
                  }
                />
              </>
            ) : null
          ) : null}
        </View>

        {/* Price estimate (server: same base from provider net + 4% customer fee) */}
        {estimatedPricing !== null && (
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
            <Text style={[rtlText, { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: 12 }]}>
              {t("estimatedPrice")}
            </Text>
            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={[rtlText, { flex: 1, fontSize: 14, color: colors.textSecondary, paddingEnd: 8 }]}>
                  {t("bookingBreakdownBase")}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                  ₪{estimatedPricing.basePrice.toFixed(2)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={[rtlText, { flex: 1, fontSize: 14, color: colors.textSecondary, paddingEnd: 8 }]}>
                  {t("bookingBreakdownFee")}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                  ₪{estimatedPricing.customerServiceFee.toFixed(2)}
                </Text>
              </View>
              <View
                style={{
                  marginTop: 4,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.borderLight,
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={[rtlText, { flex: 1, fontSize: 15, fontWeight: "800", color: colors.text, paddingEnd: 8 }]}>
                  {t("bookingBreakdownTotal")}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.primary }}>
                  ₪{estimatedPricing.finalTotal.toFixed(2)}
                </Text>
              </View>
            </View>
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
          disabled={submitting || (needsTimeSelection && startTimeInvalid)}
          style={{
            backgroundColor:
              submitting || (needsTimeSelection && startTimeInvalid)
                ? colors.textMuted
                : colors.text,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity:
              submitting || (needsTimeSelection && startTimeInvalid) ? 0 : 0.25,
            shadowRadius: 12,
            elevation:
              submitting || (needsTimeSelection && startTimeInvalid) ? 0 : 6,
            opacity: needsTimeSelection && startTimeInvalid ? 0.55 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : needsTimeSelection && startTimeInvalid ? (
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
                {estimatedPricing !== null ? ` — ₪${estimatedPricing.finalTotal.toFixed(2)}` : ""}
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
