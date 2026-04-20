import { create } from "zustand";
import { reviewsApi } from "../api/reviewsApi";
import type {
  CreateBookingReviewRequest,
  CreateDirectReviewRequest,
  ReviewDto,
} from "../types/api";
import { useAuthStore } from "./authStore";

type ProviderBucket = {
  reviews: ReviewDto[];
  loading: boolean;
  error: string | null;
};

function emptyBucket(): ProviderBucket {
  return { reviews: [], loading: false, error: null };
}

interface ReviewsState {
  byProviderId: Record<string, ProviderBucket>;
  submitting: boolean;
  submitError: string | null;

  fetchProviderReviews: (providerId: string) => Promise<void>;
  submitBookingReview: (
    payload: CreateBookingReviewRequest,
    providerId: string,
  ) => Promise<boolean>;
  submitDirectReview: (
    payload: CreateDirectReviewRequest,
    providerId: string,
  ) => Promise<ReviewDto | null>;
  clearProvider: (providerId: string) => void;
  clearSubmitError: () => void;
}

function ensureBucket(
  byProviderId: Record<string, ProviderBucket>,
  providerId: string,
): { next: Record<string, ProviderBucket>; bucket: ProviderBucket } {
  const existing = byProviderId[providerId];
  if (existing) return { next: byProviderId, bucket: existing };
  const bucket = emptyBucket();
  return { next: { ...byProviderId, [providerId]: bucket }, bucket };
}

export const useReviewsStore = create<ReviewsState>((set, get) => ({
  byProviderId: {},
  submitting: false,
  submitError: null,

  fetchProviderReviews: async (providerId) => {
    const { next, bucket } = ensureBucket(get().byProviderId, providerId);
    set({
      byProviderId: {
        ...next,
        [providerId]: { ...bucket, loading: true, error: null },
      },
    });
    try {
      const reviews = await reviewsApi.getProviderReviews(providerId);
      set((s) => ({
        byProviderId: {
          ...s.byProviderId,
          [providerId]: {
            ...(s.byProviderId[providerId] ?? emptyBucket()),
            reviews,
            loading: false,
            error: null,
          },
        },
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load reviews";
      set((s) => ({
        byProviderId: {
          ...s.byProviderId,
          [providerId]: {
            ...(s.byProviderId[providerId] ?? emptyBucket()),
            loading: false,
            error: msg,
          },
        },
      }));
    }
  },

  submitBookingReview: async (payload, providerId) => {
    set({ submitting: true, submitError: null });
    try {
      const { id } = await reviewsApi.createBookingReview(payload);
      const user = useAuthStore.getState().user;
      const optimistic: ReviewDto = {
        id,
        bookingId: payload.bookingId,
        reviewerId: user?.id ?? "",
        reviewerName: user?.name ?? "",
        reviewerAvatar: undefined,
        revieweeId: providerId,
        rating: payload.rating,
        comment: payload.comment,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      set((s) => {
        const b = s.byProviderId[providerId] ?? emptyBucket();
        const exists = b.reviews.some((r) => r.id === id);
        return {
          submitting: false,
          submitError: null,
          byProviderId: {
            ...s.byProviderId,
            [providerId]: {
              ...b,
              reviews: exists ? b.reviews : [optimistic, ...b.reviews],
            },
          },
        };
      });
      return true;
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (e instanceof Error ? e.message : "Failed to submit review");
      set({ submitting: false, submitError: String(msg) });
      return false;
    }
  },

  submitDirectReview: async (payload, providerId) => {
    set({ submitting: true, submitError: null });
    try {
      const dto = await reviewsApi.createDirectReview(payload);
      set((s) => {
        const b = s.byProviderId[providerId] ?? emptyBucket();
        const exists = b.reviews.some((r) => r.id === dto.id);
        return {
          submitting: false,
          submitError: null,
          byProviderId: {
            ...s.byProviderId,
            [providerId]: {
              ...b,
              reviews: exists ? b.reviews : [dto, ...b.reviews],
            },
          },
        };
      });
      return dto;
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (e instanceof Error ? e.message : "Failed to submit review");
      set({ submitting: false, submitError: String(msg) });
      return null;
    }
  },

  clearProvider: (providerId) => {
    set((s) => {
      const { [providerId]: _, ...rest } = s.byProviderId;
      return { byProviderId: rest };
    });
  },

  clearSubmitError: () => set({ submitError: null }),
}));
