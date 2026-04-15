import type { ProviderApplicationPayload } from "../../types/api";
import type { OnboardingFormValues } from "./schemas";
import { SERVICES, DESCRIPTION_MAX_LENGTH } from "./constants";

const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function serializeAvailability(
  slots: OnboardingFormValues["availabilitySlots"],
): string {
  if (slots.length === 0) return "";
  const lines = slots.map(
    (s) => `  ${DAY_NAMES_EN[s.dayOfWeek]}: ${s.startTime} – ${s.endTime}`,
  );
  return [
    "",
    "---",
    "Requested hours (applicant preference — not in system yet):",
    ...lines,
  ].join("\n");
}

function serializeSpecialOffers(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return "\n---\nSpecial offers / promotions:\n" + trimmed;
}

function buildDescription(values: OnboardingFormValues): string {
  const extras = serializeAvailability(values.availabilitySlots)
    + serializeSpecialOffers(values.specialOffers);

  let description = values.bio.trim();
  if (extras) {
    const room = DESCRIPTION_MAX_LENGTH - extras.length;
    if (description.length > room) {
      description = description.slice(0, Math.max(room - 3, 0)) + "...";
    }
    description += extras;
  }
  return description;
}

export function formToPayload(values: OnboardingFormValues): ProviderApplicationPayload {
  const isBusiness = values.providerType === 1;

  let selectedServices: ProviderApplicationPayload["selectedServices"] = [];
  let primaryServiceType = 6; // PetStore default for Business

  if (!isBusiness) {
    const enabledServices = SERVICES.filter(
      (svc) => values.services[String(svc.serviceType)]?.enabled,
    );
    selectedServices = enabledServices.map((svc) => {
      const state = values.services[String(svc.serviceType)];
      return {
        serviceType: svc.serviceType,
        rate: Number(state.rate),
        pricingUnit: svc.pricingUnit,
        packages: state.packages
          .filter((p) => p.title.trim())
          .map((p) => ({
            title: p.title.trim(),
            price: Number(p.price),
            description: p.description?.trim() || undefined,
          })),
      };
    });
    primaryServiceType = selectedServices[0]?.serviceType ?? 0;
  }

  return {
    type: values.providerType,
    businessName: isBusiness ? values.businessName.trim() : undefined,
    serviceType: primaryServiceType,
    city: values.city.trim(),
    street: values.street.trim(),
    buildingNumber: values.buildingNumber.trim(),
    apartmentNumber: values.apartmentNumber.trim() || undefined,
    latitude: values.latitude,
    longitude: values.longitude,
    phoneNumber: values.phoneNumber.trim(),
    whatsAppNumber: values.whatsAppNumber.trim() || undefined,
    websiteUrl: values.websiteUrl.trim() || undefined,
    isEmergencyService: values.isEmergencyService,
    description: buildDescription(values),
    imageUrl: values.imageUrl || undefined,
    selectedServices,
    referenceName: values.referenceName.trim() || undefined,
    referenceContact: values.referenceContact.trim() || undefined,
  };
}
