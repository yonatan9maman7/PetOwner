import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MapPin } from '../models/map-pin.model';

export interface ProviderPublicProfile {
  providerId: string;
  name: string;
  bio: string | null;
  profileImageUrl: string | null;
  hourlyRate: number;
  averageRating: number | null;
  reviewCount: number;
  isAvailableNow: boolean;
  acceptsOffHoursRequests: boolean;
  services: string[];
  availabilitySlots: { dayOfWeek: number; startTime: string; endTime: string }[];
  recentReviews: {
    id: string;
    serviceRequestId: string;
    reviewerId: string;
    reviewerName: string;
    revieweeId: string;
    rating: number;
    comment: string;
    isVerified: boolean;
    communicationRating: number | null;
    reliabilityRating: number | null;
    photoUrl: string | null;
    createdAt: string;
  }[];
}

export interface MapSearchFilters {
  requestedTime?: string;
  serviceType?: string;
  minRating?: number;
  maxRate?: number;
  radiusKm?: number;
  latitude?: number;
  longitude?: number;
}

@Injectable({ providedIn: 'root' })
export class MapService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/map';

  fetchPins(filters: MapSearchFilters = {}): Observable<MapPin[]> {
    let params = new HttpParams();
    if (filters.requestedTime) params = params.set('requestedTime', filters.requestedTime);
    if (filters.serviceType) params = params.set('serviceType', filters.serviceType);
    if (filters.minRating != null) params = params.set('minRating', filters.minRating.toString());
    if (filters.maxRate != null) params = params.set('maxRate', filters.maxRate.toString());
    if (filters.radiusKm != null) params = params.set('radiusKm', filters.radiusKm.toString());
    if (filters.latitude != null) params = params.set('latitude', filters.latitude.toString());
    if (filters.longitude != null) params = params.set('longitude', filters.longitude.toString());
    return this.http.get<MapPin[]>(`${this.baseUrl}/pins`, { params });
  }

  getServiceTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/service-types`);
  }

  getProviderProfile(providerId: string): Observable<ProviderPublicProfile> {
    return this.http.get<ProviderPublicProfile>(`/api/providers/${providerId}/profile`);
  }
}
