import { reviewsApi } from "../api/reviewsApi";
import { useAuthStore } from "../store/authStore";
import { useReviewsStore } from "../store/reviewsStore";

jest.mock("../api/reviewsApi", () => ({
  reviewsApi: {
    getProviderReviews: jest.fn(),
    createBookingReview: jest.fn(),
    createDirectReview: jest.fn(),
  },
}));

jest.mock("../store/authStore", () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      user: { id: "reviewer-1", name: "Sam Owner" },
    })),
  },
}));

const reviewsApiMock = reviewsApi as jest.Mocked<typeof reviewsApi>;

describe("reviewsStore", () => {
  beforeEach(() => {
    useReviewsStore.setState({
      byProviderId: {},
      submitting: false,
      submitError: null,
    });
    jest.clearAllMocks();
    jest.mocked(useAuthStore.getState).mockReturnValue({
      user: { id: "reviewer-1", name: "Sam Owner" },
    } as ReturnType<typeof useAuthStore.getState>);
  });

  it("fetchProviderReviews sets loading=false and error when the API rejects", async () => {
    const providerId = "550e8400-e29b-41d4-a716-446655440000";
    reviewsApiMock.getProviderReviews.mockRejectedValue(new Error("network down"));

    await useReviewsStore.getState().fetchProviderReviews(providerId);

    const bucket = useReviewsStore.getState().byProviderId[providerId];
    expect(bucket?.loading).toBe(false);
    expect(bucket?.error).toBe("network down");
    expect(bucket?.reviews).toEqual([]);
  });

  it("submitBookingReview sets submitError and returns false on API failure", async () => {
    reviewsApiMock.createBookingReview.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Booking not found" } },
    });

    const ok = await useReviewsStore.getState().submitBookingReview(
      {
        bookingId: "b1",
        rating: 5,
        comment: "Great",
      },
      "provider-1",
    );

    expect(ok).toBe(false);
    expect(useReviewsStore.getState().submitting).toBe(false);
    expect(useReviewsStore.getState().submitError).toBe("Booking not found");
  });
});
