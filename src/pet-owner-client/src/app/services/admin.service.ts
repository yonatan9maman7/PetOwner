import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PendingProvider } from '../models/pending-provider.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin';

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
