import type { TranslationKey } from "./index";
import { translateServiceLabel } from "./serviceLabels";
import { ServiceType } from "../types/api";

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

/** English display names for matching API strings in `resolveServiceType` only */
const SERVICE_TYPE_DISPLAY_NAMES: Record<ServiceType, string> = {
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

const SERVICE_TYPE_TO_TRANSLATION_KEY: Record<ServiceType, TranslationKey> = {
  [ServiceType.DogWalking]: "serviceDogWalking",
  [ServiceType.PetSitting]: "servicePetSitting",
  [ServiceType.Boarding]: "serviceBoarding",
  [ServiceType.DropInVisit]: "serviceDropInVisit",
  [ServiceType.Training]: "serviceTraining",
  [ServiceType.Insurance]: "serviceInsurance",
  [ServiceType.PetStore]: "servicePetStore",
  [ServiceType.HouseSitting]: "serviceHouseSitting",
  [ServiceType.DoggyDayCare]: "serviceDoggyDayCare",
};

const PRICING_UNIT_NUM_TO_KEY: Record<number, TranslationKey> = {
  0: "rateUnitHour",
  1: "rateUnitNight",
  2: "rateUnitVisit",
  3: "rateUnitSession",
  4: "rateUnitPackage",
};

function stripServicePrefix(label: string): string {
  return label.trim().replace(/^service\s+/i, "");
}

/** Resolve API `ServiceType` to the PascalCase enum used by the backend. */
export function resolveServiceType(rate: {
  serviceType?: string | number;
  service?: string;
}): ServiceType | null {
  if (typeof rate?.serviceType === "number" && !Number.isNaN(rate.serviceType)) {
    return SERVICE_TYPE_BY_ORDINAL[rate.serviceType] ?? null;
  }

  const label = rate?.service ?? rate?.serviceType;
  if (typeof label !== "string") return null;

  const trimmed = stripServicePrefix(label);
  const numeric = Number(trimmed);
  if (Number.isInteger(numeric)) return SERVICE_TYPE_BY_ORDINAL[numeric] ?? null;

  const enumMatch = Object.values(ServiceType).find((type) => type === trimmed);
  if (enumMatch) return enumMatch;

  const compact = trimmed.replace(/[\s-]/g, "").toLowerCase();
  const compactEnumMatch = Object.values(ServiceType).find(
    (type) => type.toLowerCase() === compact,
  );
  if (compactEnumMatch) return compactEnumMatch;

  const displayMatch = Object.entries(SERVICE_TYPE_DISPLAY_NAMES).find(
    ([, displayName]) => displayName.replace(/[\s-]/g, "").toLowerCase() === compact,
  );
  return displayMatch ? (displayMatch[0] as ServiceType) : null;
}

export function serviceRateDisplayName(
  rate: { serviceType?: string | number; service?: string },
  t: (key: TranslationKey) => string,
): string {
  const serviceType = resolveServiceType(rate);
  if (serviceType) return t(SERVICE_TYPE_TO_TRANSLATION_KEY[serviceType]);

  const raw = rate?.service;
  if (typeof raw === "string" && raw.trim()) {
    return translateServiceLabel(stripServicePrefix(raw), t);
  }

  return t("bookingServiceFallback").replace("{{n}}", String(rate?.serviceType ?? "?"));
}

export function pricingUnitShortLabel(
  rate: {
    pricingUnit?: string | number;
    unit?: string;
  },
  t: (key: TranslationKey) => string,
): string {
  const rawPu = rate?.pricingUnit;
  if (typeof rawPu === "number" && PRICING_UNIT_NUM_TO_KEY[rawPu]) {
    return t(PRICING_UNIT_NUM_TO_KEY[rawPu]);
  }
  if (typeof rawPu === "string") {
    const s = rawPu.replace(/\s+/g, "").toLowerCase();
    if (s === "perhour" || s === "0") return t("rateUnitHour");
    if (s === "pernight" || s === "1") return t("rateUnitNight");
    if (s === "pervisit" || s === "2") return t("rateUnitVisit");
    if (s === "persession" || s === "3") return t("rateUnitSession");
    if (s === "perpackage" || s === "4") return t("rateUnitPackage");
  }
  const unit = String(rate?.unit ?? "").toLowerCase();
  if (unit === "hour" || unit === "hours") return t("rateUnitHour");
  if (unit === "night" || unit === "nights") return t("rateUnitNight");
  if (unit === "visit") return t("rateUnitVisit");
  if (unit === "session") return t("rateUnitSession");
  if (unit === "package") return t("rateUnitPackage");
  return "";
}
