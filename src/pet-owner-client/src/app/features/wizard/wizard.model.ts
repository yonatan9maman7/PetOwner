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
  idNumber: string;
  referenceName: string;
  referenceContact: string;
}

export interface OnboardingPayload {
  services: ServicesAndRates;
  bio: MagicBio;
  latitude: number | null;
  longitude: number | null;
  address: string;
  verification: TrustVerification;
}

export interface OnboardingApiPayload {
  services: string[];
  hourlyRate: number | null;
  bio: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  referenceName: string;
  referenceContact: string;
  idNumber: string;
}
