namespace PetOwner.Api.DTOs;

public record CheckoutResponseDto(
    string ClientSecret,
    string PaymentIntentId,
    decimal Amount,
    decimal PlatformFee,
    string Currency
);

public record PaymentStatusDto(
    Guid Id,
    Guid ServiceRequestId,
    string StripePaymentIntentId,
    decimal Amount,
    decimal PlatformFee,
    string Currency,
    string Status,
    DateTime CreatedAt,
    DateTime? CapturedAt,
    DateTime? RefundedAt,
    decimal? RefundAmount
);
