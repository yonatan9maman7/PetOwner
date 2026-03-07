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

export interface OnboardingPayload {
  services: ServicesAndRates;
  bio: MagicBio;
  latitude: number | null;
  longitude: number | null;
  address: string;
}

export interface OnboardingApiPayload {
  services: string[];
  hourlyRate: number | null;
  bio: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}
