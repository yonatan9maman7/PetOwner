import { z } from "zod";
import type { DogSize } from "../../types/api";
import { SERVICES, DOG_CARE_SERVICE_TYPES } from "./constants";
import {
  isIsraeliBusinessPhoneValid,
  isIsraeliMobileValid,
  isPhoneInputEmpty,
  normalizePhoneForCompare,
} from "./phoneUtils";

export type OnboardingFormSchemaMessages = {
  validationPhoneRequired: string;
  validationPhoneInvalid: string;
  validationPhoneInvalidBusiness: string;
};

const packageSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.string(),
  description: z.string(),
});

const serviceStateSchema = z.object({
  enabled: z.boolean(),
  rate: z.string(),
  packages: z.array(packageSchema),
});

const slotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
});

export function createOnboardingFormSchema(msgs: OnboardingFormSchemaMessages) {
  return z
    .object({
    providerType: z.number(),
    businessName: z.string(),
    bio: z.string(),
    imageUri: z.string(),
    imageUrl: z.string(),
    phoneNumber: z.string(),
    whatsAppNumber: z.string(),
    websiteUrl: z.string(),
    city: z.string(),
    street: z.string(),
    buildingNumber: z.string(),
    apartmentNumber: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    services: z.record(z.string(), serviceStateSchema),
    isEmergencyService: z.boolean(),
    referenceName: z.string(),
    referenceContact: z.string(),
    availabilitySlots: z.array(slotSchema),
    specialOffers: z.string(),
    acceptedDogSizes: z.array(z.enum(["SMALL", "MEDIUM", "LARGE", "GIANT"])),
    maxDogsCapacity: z.string(),
  })
    .superRefine((data, ctx) => {
      if (isPhoneInputEmpty(data.phoneNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msgs.validationPhoneRequired,
          path: ["phoneNumber"],
        });
        return;
      }
      if (data.providerType === 1) {
        if (!isIsraeliBusinessPhoneValid(data.phoneNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: msgs.validationPhoneInvalidBusiness,
            path: ["phoneNumber"],
          });
        }
      } else if (!isIsraeliMobileValid(data.phoneNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msgs.validationPhoneInvalid,
          path: ["phoneNumber"],
        });
      }
    });
}

export type OnboardingFormSchema = ReturnType<typeof createOnboardingFormSchema>;
export type OnboardingFormValues = z.infer<OnboardingFormSchema>;

export function buildDefaultValues(): OnboardingFormValues {
  const services: OnboardingFormValues["services"] = {};
  for (const svc of SERVICES) {
    services[String(svc.serviceType)] = { enabled: false, rate: "", packages: [] };
  }
  return {
    providerType: 0,
    businessName: "",
    bio: "",
    imageUri: "",
    imageUrl: "",
    phoneNumber: "",
    whatsAppNumber: "",
    websiteUrl: "",
    city: "",
    street: "",
    buildingNumber: "",
    apartmentNumber: "",
    latitude: 0,
    longitude: 0,
    services,
    isEmergencyService: false,
    referenceName: "",
    referenceContact: "",
    availabilitySlots: [],
    specialOffers: "",
    acceptedDogSizes: [] as DogSize[],
    maxDogsCapacity: "",
  };
}

export function validateStep1(values: OnboardingFormValues): string | null {
  if (!values.bio || values.bio.trim().length < 10) return "bioMinLength";
  if (isPhoneInputEmpty(values.phoneNumber)) return "validationPhoneRequired";
  if (values.providerType === 1) {
    if (!isIsraeliBusinessPhoneValid(values.phoneNumber)) return "validationPhoneInvalidBusiness";
  } else if (!isIsraeliMobileValid(values.phoneNumber)) {
    return "validationPhoneInvalid";
  }
  if (!values.city.trim()) return "cityRequired";
  if (!values.street.trim()) return "streetRequired";
  if (!values.buildingNumber.trim()) return "buildingRequired";
  if (values.latitude === 0 && values.longitude === 0) return "addressRequired";
  if (values.providerType === 1 && !values.businessName.trim()) return "businessNameRequired";
  if (values.websiteUrl.trim() && !/^https?:\/\/.+/.test(values.websiteUrl.trim())) return "invalidUrl";
  return null;
}

export function validateStep2(values: OnboardingFormValues): string | null {
  const enabled = Object.values(values.services).filter((s) => s.enabled);
  if (enabled.length === 0) return "atLeastOneService";
  for (const s of enabled) {
    const rate = Number(s.rate);
    if (!s.rate || isNaN(rate) || rate <= 0) return "serviceRateRequired";
  }
  const needsDogPrefs = [...DOG_CARE_SERVICE_TYPES].some(
    (id) => values.services[String(id)]?.enabled,
  );
  if (needsDogPrefs) {
    if (!values.acceptedDogSizes?.length) return "acceptedSizesRequired";
    const cap = Number(values.maxDogsCapacity);
    if (!values.maxDogsCapacity.trim() || isNaN(cap) || cap < 1)
      return "maxCapacityInvalid";
  }
  return null;
}

export function validateStep3(values: OnboardingFormValues): string | null {
  for (const s of Object.values(values.services)) {
    if (!s.enabled) continue;
    for (const pkg of s.packages) {
      if (!pkg.title.trim()) return "packageTitleRequired";
      const price = Number(pkg.price);
      if (!pkg.price || isNaN(price) || price <= 0) return "packagePriceRequired";
    }
  }
  return null;
}

export function validateStep4(values: OnboardingFormValues): string | null {
  if (!values.referenceName.trim()) return "referenceNameRequired";
  if (!values.referenceContact.trim()) return "referenceContactRequired";

  const refNorm = normalizePhoneForCompare(values.referenceContact);
  if (refNorm.length > 0) {
    if (refNorm === normalizePhoneForCompare(values.phoneNumber))
      return "referenceContactOwnNumber";
    const waNorm = normalizePhoneForCompare(values.whatsAppNumber);
    if (waNorm.length > 0 && refNorm === waNorm)
      return "referenceContactOwnNumber";
  }

  return null;
}
