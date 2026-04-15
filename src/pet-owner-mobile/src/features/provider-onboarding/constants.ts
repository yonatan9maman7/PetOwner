import type { TranslationKey } from "../../i18n";

export const NAVY = "#001a5a";
export const DEFAULT_LAT = 32.0809;
export const DEFAULT_LNG = 34.7749;

export interface ServiceDef {
  serviceType: number;
  pricingUnit: number;
  nameKey: TranslationKey;
  unitKey: TranslationKey;
  icon: string;
  bgColor: string;
  iconColor: string;
}

export const SERVICES: ServiceDef[] = [
  { serviceType: 0, pricingUnit: 0, nameKey: "serviceDogWalking", unitKey: "perHour", icon: "footsteps", bgColor: "rgba(15,47,127,0.08)", iconColor: NAVY },
  { serviceType: 1, pricingUnit: 0, nameKey: "servicePetSitting", unitKey: "perHour", icon: "home", bgColor: "rgba(211,232,215,0.3)", iconColor: "#506356" },
  { serviceType: 2, pricingUnit: 1, nameKey: "serviceBoarding", unitKey: "perNight", icon: "bed", bgColor: "rgba(233,226,209,0.3)", iconColor: "#242116" },
  { serviceType: 3, pricingUnit: 2, nameKey: "serviceDropInVisit", unitKey: "perVisit", icon: "paw", bgColor: "rgba(15,47,127,0.04)", iconColor: NAVY },
  { serviceType: 4, pricingUnit: 3, nameKey: "serviceTraining", unitKey: "perSession", icon: "school", bgColor: "rgba(211,232,215,0.15)", iconColor: "#506356" },
  { serviceType: 5, pricingUnit: 4, nameKey: "serviceInsurance", unitKey: "perPackage", icon: "shield-checkmark", bgColor: "rgba(233,226,209,0.15)", iconColor: "#242116" },
  { serviceType: 6, pricingUnit: 4, nameKey: "servicePetStore", unitKey: "perPackage", icon: "storefront", bgColor: "rgba(15,47,127,0.06)", iconColor: NAVY },
];

export const DAY_KEYS: TranslationKey[] = [
  "daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat",
];

export const INDIVIDUAL_STEPS = [0, 1, 2, 3] as const;
export const BUSINESS_STEPS = [0, 3] as const;
export const DESCRIPTION_MAX_LENGTH = 2000;
