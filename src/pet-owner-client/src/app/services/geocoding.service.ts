import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/** Subset of Nominatim `address` object (addressdetails=1). */
export interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  city_district?: string;
  state?: string;
  country?: string;
}

export interface NominatimResult {
  place_id?: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
  error?: string;
}

export interface AddressSuggestion {
  displayName: string;
  lat: number;
  lon: number;
  /** From Nominatim addressdetails when available */
  city?: string;
  street?: string;
  buildingNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';
  private readonly reverseUrl = 'https://nominatim.openstreetmap.org/reverse';

  search(query: string): Observable<AddressSuggestion[]> {
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    const params = {
      format: 'json',
      q: query.trim(),
      countrycodes: 'il',
      limit: '5',
      addressdetails: '1',
    };

    return this.http
      .get<NominatimResult[]>(this.baseUrl, { params })
      .pipe(
        map((results) =>
          results.map((r) => {
            const parts = nominatimAddressToParts(r.address);
            return {
              displayName: r.display_name,
              lat: parseFloat(r.lat),
              lon: parseFloat(r.lon),
              ...parts,
            };
          }),
        ),
        catchError(() => of([])),
      );
  }

  /** Reverse geocode coordinates (e.g. GPS) into an address + structured fields. */
  reverse(lat: number, lon: number): Observable<AddressSuggestion | null> {
    const params = {
      format: 'json',
      lat: String(lat),
      lon: String(lon),
      addressdetails: '1',
    };

    return this.http.get<NominatimResult>(this.reverseUrl, { params }).pipe(
      map((r) => {
        if (!r || r.error || !r.display_name) {
          return null;
        }
        const parts = nominatimAddressToParts(r.address);
        return {
          displayName: r.display_name,
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          ...parts,
        };
      }),
      catchError(() => of(null)),
    );
  }
}

function nominatimAddressToParts(
  addr: NominatimAddress | undefined,
): Pick<AddressSuggestion, 'city' | 'street' | 'buildingNumber'> {
  if (!addr) {
    return {};
  }
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.city_district ||
    addr.suburb ||
    '';
  const street = addr.road || addr.pedestrian || addr.neighbourhood || '';
  const buildingNumber = addr.house_number || '';
  return {
    city: city.trim() || undefined,
    street: street.trim() || undefined,
    buildingNumber: buildingNumber.trim() || undefined,
  };
}
