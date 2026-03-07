import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export interface AddressSuggestion {
  displayName: string;
  lat: number;
  lon: number;
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';

  search(query: string): Observable<AddressSuggestion[]> {
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    const params = {
      format: 'json',
      q: query.trim(),
      countrycodes: 'il',
      limit: '5',
    };

    return this.http
      .get<NominatimResult[]>(this.baseUrl, { params })
      .pipe(
        map((results) =>
          results.map((r) => ({
            displayName: r.display_name,
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
          })),
        ),
        catchError(() => of([])),
      );
  }
}
