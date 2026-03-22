import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MapPin } from '../models/map-pin.model';
import { ServiceRateDto } from '../features/wizard/wizard.model';

export interface ProviderPublicProfile {
  providerId: string;
  name: string;
  bio: string | null;
  profileImageUrl: string | null;
  serviceRates: ServiceRateDto[];
  averageRating: number | null;
  reviewCount: number;
  isAvailableNow: boolean;
  acceptsOffHoursRequests: boolean;
  services: string[];
  availabilitySlots: { dayOfWeek: number; startTime: string; endTime: string }[];
  recentReviews: {
    id: string;
    serviceRequestId: string | null;
    bookingId: string | null;
    reviewerId: string;
    reviewerName: string;
    reviewerAvatar: string | null;
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

export interface UserMiniProfile {
  id: string;
  name: string;
  profileImageUrl: string | null;
  bio: string | null;
  role: string;
  memberSince: string;
  isProvider: boolean;
  services: string[] | null;
  averageRating: number | null;
  reviewCount: number | null;
}

export interface MapSearchFilters {
  requestedTime?: string;
  serviceType?: string;
  minRating?: number;
  maxRate?: number;
  radiusKm?: number;
  latitude?: number;
  longitude?: number;
  searchTerm?: string;
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
    if (filters.searchTerm) params = params.set('searchTerm', filters.searchTerm);
    return this.http.get<MapPin[]>(`${this.baseUrl}/pins`, { params });
  }

  getServiceTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/service-types`);
  }

  getProviderProfile(providerId: string): Observable<ProviderPublicProfile> {
    return this.http.get<ProviderPublicProfile>(`/api/providers/${providerId}/profile`);
  }

  getUserMiniProfile(userId: string): Observable<UserMiniProfile> {
    return this.http.get<UserMiniProfile>(`/api/users/${userId}/mini-profile`);
  }

  getProviderContact(providerId: string): Observable<{ phone: string }> {
    return this.http.get<{ phone: string }>(`/api/providers/${providerId}/contact`);
  }
}
