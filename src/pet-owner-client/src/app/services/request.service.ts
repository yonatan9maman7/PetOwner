import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ServiceRequest,
  CreateRequestPayload,
} from '../models/service-request.model';

@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/requests';

  getAll(): Observable<ServiceRequest[]> {
    return this.http.get<ServiceRequest[]>(this.baseUrl);
  }

  create(payload: CreateRequestPayload): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(this.baseUrl, payload);
  }

  accept(requestId: string): Observable<ServiceRequest> {
    return this.http.put<ServiceRequest>(`${this.baseUrl}/${requestId}/accept`, {});
  }

  reject(requestId: string): Observable<ServiceRequest> {
    return this.http.put<ServiceRequest>(`${this.baseUrl}/${requestId}/reject`, {});
  }

  complete(requestId: string): Observable<ServiceRequest> {
    return this.http.put<ServiceRequest>(`${this.baseUrl}/${requestId}/complete`, {});
  }

  cancel(requestId: string, reason?: string): Observable<ServiceRequest> {
    return this.http.put<ServiceRequest>(`${this.baseUrl}/${requestId}/cancel`, { reason });
  }
}
