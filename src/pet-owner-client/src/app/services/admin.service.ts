import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PendingProvider } from '../models/pending-provider.model';

export interface AdminStats {
  totalUsers: number;
  totalPets: number;
  totalProviders: number;
  totalBookings: number;
  activeSOSReports: number;
  pendingProviders: number;
  totalPlatformRevenue: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  isActive: boolean;
  providerStatus: string | null;
}

export interface AdminBooking {
  id: string;
  ownerName: string;
  providerName: string;
  service: string;
  status: string;
  totalPrice: number;
  startDate: string;
  createdAt: string;
}

export interface AdminPet {
  id: string;
  name: string;
  breed: string | null;
  species: string;
  age: number;
  imageUrl: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerId: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin';

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.baseUrl}/stats`);
  }

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/users`);
  }

  toggleUserStatus(userId: string): Observable<{ message: string; isActive: boolean }> {
    return this.http.put<{ message: string; isActive: boolean }>(`${this.baseUrl}/users/${userId}/toggle-status`, {});
  }

  updateUserRole(userId: string, role: string): Observable<{ message: string; role: string }> {
    return this.http.patch<{ message: string; role: string }>(`${this.baseUrl}/users/${userId}/role`, { role });
  }

  getBookings(): Observable<AdminBooking[]> {
    return this.http.get<AdminBooking[]>(`${this.baseUrl}/bookings`);
  }

  getPets(): Observable<AdminPet[]> {
    return this.http.get<AdminPet[]>(`${this.baseUrl}/pets`);
  }

  adminDeletePet(petId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/pets/${petId}`);
  }

  getPendingProviders(): Observable<PendingProvider[]> {
    return this.http.get<PendingProvider[]>(`${this.baseUrl}/pending`);
  }

  approveProvider(providerId: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/approve/${providerId}`, {});
  }

  revokeSitterStatus(providerId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/users/${providerId}/revoke-sitter`, {});
  }

  seedDummyData(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/seed-dummy-data`, {});
  }

  seedBogusPets(): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(`${this.baseUrl}/seed-bogus-pets`, {});
  }

  clearAllSOSReports(): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(`${this.baseUrl}/clear-sos`, {});
  }

  suspendProvider(providerId: string, reason?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/providers/${providerId}/suspend`, { reason });
  }

  banProvider(providerId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/providers/${providerId}/ban`, {});
  }

  reactivateProvider(providerId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/providers/${providerId}/reactivate`, {});
  }
}
