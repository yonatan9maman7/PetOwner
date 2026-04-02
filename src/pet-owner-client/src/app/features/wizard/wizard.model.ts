export type ServiceType = 'DogWalking' | 'PetSitting' | 'Boarding' | 'DropInVisit' | 'Training' | 'Insurance';
export type PricingUnit = 'PerHour' | 'PerNight' | 'PerVisit' | 'PerSession' | 'PerPackage';

export const SERVICE_TYPE_INT: Record<ServiceType, number> = {
  DogWalking: 0,
  PetSitting: 1,
  Boarding: 2,
  DropInVisit: 3,
  Training: 4,
  Insurance: 5,
};

export const PRICING_UNIT_INT: Record<PricingUnit, number> = {
  PerHour: 0,
  PerNight: 1,
  PerVisit: 2,
  PerSession: 3,
  PerPackage: 4,
};

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
  {
    type: 'Training',
    label: 'Pet Training',
    description: 'Professional training sessions for obedience, behavior, and socialization.',
    pricingUnit: 'PerSession',
    rateLabel: 'Price per session',
  },
  {
    type: 'Insurance',
    label: 'Pet Insurance',
    description: 'Comprehensive insurance packages for your pet\'s health and wellbeing.',
    pricingUnit: 'PerPackage',
    rateLabel: 'Price per package',
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

export interface ServiceRateApiDto {
  serviceType: number;
  rate: number;
  pricingUnit: number;
}

export interface OnboardingApiPayload {
  selectedServices: ServiceRateApiDto[];
  bio: string;
  latitude: number | null;
  longitude: number | null;
  city: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string | null;
  referenceName: string;
  referenceContact: string;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}
