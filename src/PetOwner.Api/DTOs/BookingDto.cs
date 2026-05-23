using PetOwner.Data.Models;

namespace PetOwner.Api.DTOs;

public record CreateBookingRequest(
    Guid ProviderId,
    ServiceType ServiceType,
    List<Guid> PetIds,
    DateTime StartDate,
    DateTime EndDate,
    string? Notes = null
);

/// <summary>Body sent when an owner or provider cancels/declines a booking.</summary>
/// <param name="Reason">
/// Required non-empty reason. This may be a predefined label (sent verbatim from the mobile predefined list)
/// or free text when the user selects "Other".
/// </param>
public record CancelBookingRequest(string Reason);

public record BookingDto(
    Guid Id,
    Guid OwnerId,
    Guid ProviderProfileId,
    string ProviderName,
    string OwnerName,
    string Service,
    DateTime StartDate,
    DateTime EndDate,
    decimal TotalPrice,
    decimal ProviderNetAmount,
    decimal GrossAmount,
    decimal ServiceFee,
    string PricingUnit,
    string Status,
    string PaymentStatus,
    string? PaymentUrl,
    DateTime CreatedAt,
    string? Notes,
    string? ProviderPhone,
    string? OwnerPhone,
    bool HasReview,
    string? CancellationReason
);
