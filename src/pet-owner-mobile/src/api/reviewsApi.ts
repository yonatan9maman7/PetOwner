import apiClient from "./client";
import type {
  CreateBookingReviewRequest,
  CreateDirectReviewRequest,
  ReviewDto,
} from "../types/api";

/**
 * REST: `/api/reviews` (+ `.../provider/{id}`).
 * @see ReviewsController.cs
 */
export const reviewsApi = {
  getProviderReviews: (providerId: string) =>
    apiClient.get<ReviewDto[]>(`/reviews/provider/${providerId}`).then((r) => r.data),

  createBookingReview: (data: CreateBookingReviewRequest) =>
    apiClient.post<{ id: string }>("/reviews", data).then((r) => r.data),

  createDirectReview: (data: CreateDirectReviewRequest) =>
    apiClient.post<ReviewDto>("/reviews/direct", data).then((r) => r.data),
};
