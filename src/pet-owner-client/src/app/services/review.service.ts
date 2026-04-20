import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
export interface CreateBookingReviewPayload {
  bookingId: string;
  rating: number;
  comment: string;
}

export interface ProviderReview {
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
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/reviews';

  create(payload: CreateBookingReviewPayload): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.baseUrl, payload);
  }

  getByProvider(providerId: string): Observable<ProviderReview[]> {
    return this.http.get<ProviderReview[]>(`${this.baseUrl}/provider/${providerId}`);
  }
}
