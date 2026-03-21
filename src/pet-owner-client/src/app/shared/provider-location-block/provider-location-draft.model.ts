export interface ProviderLocationDraft {
  latitude: number | null;
  longitude: number | null;
  /** Bound to address autocomplete display text */
  addressSearchText: string;
  city: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string;
}

export function emptyProviderLocationDraft(): ProviderLocationDraft {
  return {
    latitude: null,
    longitude: null,
    addressSearchText: '',
    city: '',
    street: '',
    buildingNumber: '',
    apartmentNumber: '',
  };
}
