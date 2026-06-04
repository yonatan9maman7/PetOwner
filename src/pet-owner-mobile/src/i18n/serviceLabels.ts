import type { TranslationKey } from "./index";

/** Map API English service labels to i18n keys (aligned with Explore filter chips). */
export const SERVICE_I18N_MAP: Record<string, TranslationKey> = {
  boarding: "serviceBoarding",
  "dog walker": "serviceDogWalking",
  "dog walking": "serviceDogWalking",
  "drop-in visit": "serviceDropInVisit",
  "drop in visit": "serviceDropInVisit",
  "pet insurance": "serviceInsurance",
  "pet sitter": "servicePetSitting",
  "pet sitting": "servicePetSitting",
  "pet store": "servicePetStore",
  "pet trainer": "serviceTraining",
  training: "serviceTraining",
  insurance: "serviceInsurance",
  "house sitting": "serviceHouseSitting",
  "doggy day care": "serviceDoggyDayCare",
  grooming: "serviceGrooming",
  "pet grooming": "serviceGrooming",
  veterinary: "serviceVeterinary",
  vet: "serviceVeterinary",
  "vet clinic": "serviceVeterinary",
  clinic: "serviceVeterinary",
};

export function serviceLabelKeyFromApiName(name: string): TranslationKey | undefined {
  const normalized = name.toLowerCase().trim().replace(/\s+/g, " ");
  return SERVICE_I18N_MAP[normalized];
}

export function translateServiceLabel(
  name: string,
  t: (key: TranslationKey) => string,
): string {
  const key = serviceLabelKeyFromApiName(name);
  return key ? t(key) : name;
}
