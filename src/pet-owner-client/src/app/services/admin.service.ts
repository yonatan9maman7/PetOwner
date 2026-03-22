import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PendingProvider } from '../models/pending-provider.model';

export interface AdminStats {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
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

  getBookings(): Observable<AdminBooking[]> {
    return this.http.get<AdminBooking[]>(`${this.baseUrl}/bookings`);
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
}
