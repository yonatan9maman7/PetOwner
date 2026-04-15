import apiClient from "./client";
import type {
  CreateBookingReviewRequest,
  CreateServiceRequestReviewRequest,
  ReviewDto,
} from "../types/api";

/**
 * REST: `/api/reviews` (+ `.../service-request`, `.../provider/{id}`).
 * @see ReviewsController.cs
 */
export const reviewsApi = {
  getProviderReviews: (providerId: string) =>
    apiClient.get<ReviewDto[]>(`/reviews/provider/${providerId}`).then((r) => r.data),

  createBookingReview: (data: CreateBookingReviewRequest) =>
    apiClient.post<{ id: string }>("/reviews", data).then((r) => r.data),

  createServiceRequestReview: (data: CreateServiceRequestReviewRequest) =>
    apiClient.post<{ id: string }>("/reviews/service-request", data).then((r) => r.data),
};
