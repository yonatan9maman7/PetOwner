import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Review, CreateReviewPayload } from '../models/service-request.model';

export interface ProviderReview {
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
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/reviews';

  create(payload: CreateReviewPayload): Observable<Review> {
    return this.http.post<Review>(this.baseUrl, payload);
  }

  getByProvider(providerId: string): Observable<ProviderReview[]> {
    return this.http.get<ProviderReview[]>(`${this.baseUrl}/provider/${providerId}`);
  }
}
