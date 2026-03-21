import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BookingDto, CreateBookingPayload } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/bookings';

  create(payload: CreateBookingPayload): Observable<BookingDto> {
    return this.http.post<BookingDto>(this.baseUrl, payload);
  }

  getMine(): Observable<BookingDto[]> {
    return this.http.get<BookingDto[]>(`${this.baseUrl}/mine`);
  }

  getById(id: string): Observable<BookingDto> {
    return this.http.get<BookingDto>(`${this.baseUrl}/${id}`);
  }

  confirm(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/confirm`, {});
  }

  cancel(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/cancel`, {});
  }
}
