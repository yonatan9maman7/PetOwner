export interface ServicesAndRates {
  dogWalker: boolean;
  petSitter: boolean;
  boarding: boolean;
  hourlyRate: number | null;
}

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
  services: ServicesAndRates;
  bio: MagicBio;
  latitude: number | null;
  longitude: number | null;
  structuredAddress: StructuredAddress;
  verification: TrustVerification;
}

export interface OnboardingApiPayload {
  services: string[];
  hourlyRate: number | null;
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
