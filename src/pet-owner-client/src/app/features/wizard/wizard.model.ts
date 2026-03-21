export type ServiceType = 'DogWalking' | 'PetSitting' | 'Boarding' | 'DropInVisit';
export type PricingUnit = 'PerHour' | 'PerNight' | 'PerVisit';

export interface ServiceRateDto {
  serviceType: ServiceType;
  rate: number;
  pricingUnit: PricingUnit;
}

export interface ServiceCardConfig {
  type: ServiceType;
  label: string;
  description: string;
  pricingUnit: PricingUnit;
  rateLabel: string;
}

export const SERVICE_CARDS: ServiceCardConfig[] = [
  {
    type: 'DogWalking',
    label: 'Dog Walking',
    description: 'Leashed walks and exercise for pups in your neighborhood.',
    pricingUnit: 'PerHour',
    rateLabel: 'Price per hour',
  },
  {
    type: 'PetSitting',
    label: 'Pet Sitting',
    description: 'In-home care and companionship while owners are away.',
    pricingUnit: 'PerHour',
    rateLabel: 'Price per hour',
  },
  {
    type: 'Boarding',
    label: 'Boarding',
    description: 'Overnight stays in a trusted, comfortable environment.',
    pricingUnit: 'PerNight',
    rateLabel: 'Price per night',
  },
  {
    type: 'DropInVisit',
    label: 'Drop-in Visit',
    description: 'Short pop-in visits for feeding, potty breaks, and peace of mind.',
    pricingUnit: 'PerVisit',
    rateLabel: 'Price per visit',
  },
];

export interface MagicBio {
  userNotes: string;
  generatedBio: string;
}

export interface TrustVerification {
  referenceName: string;
  referenceContact: string;
}

export interface StructuredAddress {
  city: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string;
}

export interface OnboardingPayload {
  selectedServices: ServiceRateDto[];
  bio: MagicBio;
  latitude: number | null;
  longitude: number | null;
  structuredAddress: StructuredAddress;
  verification: TrustVerification;
}

export interface OnboardingApiPayload {
  selectedServices: ServiceRateDto[];
  bio: string;
  latitude: number | null;
  longitude: number | null;
  city: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string | null;
  referenceName: string;
  referenceContact: string;
}
