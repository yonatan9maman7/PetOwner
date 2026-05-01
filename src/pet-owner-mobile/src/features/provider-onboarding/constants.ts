import type { TranslationKey } from "../../i18n";
import { ServiceType } from "../../types/api";

export const NAVY = "#001a5a";
export const DEFAULT_LAT = 32.0809;
export const DEFAULT_LNG = 34.7749;

export interface ServiceDef {
  /** Numeric id retained for form state keys; must match the C# enum ordinal. */
  serviceType: number;
  /** Exact PascalCase C# enum name sent to the API. */
  serviceTypeName: ServiceType;
  pricingUnit: number;
  nameKey: TranslationKey;
  unitKey: TranslationKey;
  icon: string;
  bgColor: string;
  iconColor: string;
}

/**
 * Numeric ids must stay in sync with the C# `ServiceType` enum
 * (PetOwner.Data/Models/ServiceType.cs). Order = enum index.
 *   0 DogWalking, 1 PetSitting, 2 Boarding, 3 DropInVisit, 4 Training,
 *   5 Insurance, 6 PetStore, 7 HouseSitting, 8 DoggyDayCare
 */
export const SERVICES: ServiceDef[] = [
  { serviceType: 0, serviceTypeName: ServiceType.DogWalking, pricingUnit: 0, nameKey: "serviceDogWalking", unitKey: "perHour", icon: "footsteps", bgColor: "rgba(15,47,127,0.08)", iconColor: NAVY },
  { serviceType: 1, serviceTypeName: ServiceType.PetSitting, pricingUnit: 0, nameKey: "servicePetSitting", unitKey: "perHour", icon: "home", bgColor: "rgba(211,232,215,0.3)", iconColor: "#506356" },
  { serviceType: 2, serviceTypeName: ServiceType.Boarding, pricingUnit: 1, nameKey: "serviceBoarding", unitKey: "perNight", icon: "bed", bgColor: "rgba(233,226,209,0.3)", iconColor: "#242116" },
  { serviceType: 3, serviceTypeName: ServiceType.DropInVisit, pricingUnit: 2, nameKey: "serviceDropInVisit", unitKey: "perVisit", icon: "paw", bgColor: "rgba(15,47,127,0.04)", iconColor: NAVY },
  { serviceType: 4, serviceTypeName: ServiceType.Training, pricingUnit: 3, nameKey: "serviceTraining", unitKey: "perSession", icon: "school", bgColor: "rgba(211,232,215,0.15)", iconColor: "#506356" },
  { serviceType: 5, serviceTypeName: ServiceType.Insurance, pricingUnit: 4, nameKey: "serviceInsurance", unitKey: "perPackage", icon: "shield-checkmark", bgColor: "rgba(233,226,209,0.15)", iconColor: "#242116" },
  { serviceType: 6, serviceTypeName: ServiceType.PetStore, pricingUnit: 4, nameKey: "servicePetStore", unitKey: "perPackage", icon: "storefront", bgColor: "rgba(15,47,127,0.06)", iconColor: NAVY },
  { serviceType: 7, serviceTypeName: ServiceType.HouseSitting, pricingUnit: 0, nameKey: "serviceHouseSitting", unitKey: "perHour", icon: "key", bgColor: "rgba(211,232,215,0.25)", iconColor: "#506356" },
  { serviceType: 8, serviceTypeName: ServiceType.DoggyDayCare, pricingUnit: 0, nameKey: "serviceDoggyDayCare", unitKey: "perHour", icon: "sunny", bgColor: "rgba(233,226,209,0.25)", iconColor: "#242116" },
];

/** Individual sitters: dog care + training + visits — not business catalog services. */
const INDIVIDUAL_ALLOWED_SERVICE_TYPES = new Set<ServiceType>([
  ServiceType.DogWalking,
  ServiceType.Boarding,
  ServiceType.DropInVisit,
  ServiceType.Training,
  ServiceType.HouseSitting,
  ServiceType.DoggyDayCare,
]);

/** Business providers: catalog-style services only — no mixing with individual dog-walker services. */
const BUSINESS_ALLOWED_SERVICE_TYPES = new Set<ServiceType>([
  ServiceType.PetSitting,
  ServiceType.Insurance,
  ServiceType.PetStore,
]);

/**
 * Services shown for a provider application type (`0` = individual, `1` = business).
 * Use everywhere onboarding or edit UI lists selectable services.
 */
export function servicesForProviderType(providerType: number): ServiceDef[] {
  if (providerType === 1) {
    return SERVICES.filter((s) => BUSINESS_ALLOWED_SERVICE_TYPES.has(s.serviceTypeName));
  }
  return SERVICES.filter((s) => INDIVIDUAL_ALLOWED_SERVICE_TYPES.has(s.serviceTypeName));
}

/** @alias servicesForProviderType — kept for existing call sites. */
export function servicesForOnboarding(providerType: number): ServiceDef[] {
  return servicesForProviderType(providerType);
}

/** Service ids that require dog-size + capacity preferences. Mirrors API NeedsDogSizesAndCapacity. */
export const DOG_CARE_SERVICE_TYPES = new Set([0, 2, 7, 8]);

export const DAY_KEYS: TranslationKey[] = [
  "daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat",
];

/** Full weekday names for schedules (Sunday = 0 … Saturday = 6). */
export const DAY_FULL_KEYS: TranslationKey[] = [
  "daySunday",
  "dayMonday",
  "dayTuesday",
  "dayWednesday",
  "dayThursday",
  "dayFriday",
  "daySaturday",
];

export const INDIVIDUAL_STEPS = [0, 1, 2, 3] as const;
export const BUSINESS_STEPS = [0, 3] as const;
export const DESCRIPTION_MAX_LENGTH = 2000;
