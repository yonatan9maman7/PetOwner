import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TeletriageResponse {
  id: string;
  petId: string;
  petName: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  assessment: string;
  recommendations: string | null;
  isEmergency: boolean;
  createdAt: string;
}

export interface TeletriageHistory {
  id: string;
  petId: string;
  petName: string;
  symptoms: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  assessment: string;
  recommendations: string | null;
  isEmergency: boolean;
  createdAt: string;
}

export interface NearbyVet {
  providerId: string;
  name: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  distanceKm: number;
  profileImageUrl: string | null;
  services: string;
  hourlyRate: number;
  averageRating: number;
  reviewCount: number;
}

@Injectable({ providedIn: 'root' })
export class TeletriageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/teletriage';

  assess(petId: string, symptoms: string): Observable<TeletriageResponse> {
    return this.http.post<TeletriageResponse>(`${this.baseUrl}/assess`, { petId, symptoms });
  }

  getHistory(petId: string): Observable<TeletriageHistory[]> {
    return this.http.get<TeletriageHistory[]>(`${this.baseUrl}/history/${petId}`);
  }

  getSession(id: string): Observable<TeletriageHistory> {
    return this.http.get<TeletriageHistory>(`${this.baseUrl}/${id}`);
  }

  getNearbyVets(latitude: number, longitude: number, maxResults = 5): Observable<NearbyVet[]> {
    return this.http.get<NearbyVet[]>(
      `${this.baseUrl}/nearby-vets?latitude=${latitude}&longitude=${longitude}&maxResults=${maxResults}`
    );
  }
}
