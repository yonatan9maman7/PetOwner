namespace PetOwner.Api.DTOs;

public record EarningsSummaryDto(
    decimal TotalEarned,
    decimal PlatformFees,
    decimal NetEarnings,
    int CompletedBookings,
    int PendingPayments,
    decimal PendingAmount
);

public record EarningsTransactionDto(
    Guid PaymentId,
    Guid BookingId,
    string OwnerName,
    string? PetName,
    decimal Amount,
    decimal PlatformFee,
    decimal NetAmount,
    string Status,
    DateTime CreatedAt,
    DateTime? CapturedAt
);

public record StripeConnectStatusDto(
    bool IsConnected,
    string? AccountId
);
