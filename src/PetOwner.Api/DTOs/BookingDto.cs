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
    /// <see cref="PetOwner.Data.Models.Booking.BasePrice"/>
    decimal BasePrice,
    /// <see cref="PetOwner.Data.Models.Booking.ClientFee"/> — 10 % customer fee
    decimal ClientFee,
    decimal TotalPrice,
    /// <see cref="PetOwner.Data.Models.Booking.ProviderFee"/> — 4 % platform commission
    decimal ProviderFee,
    decimal ProviderNetAmount,
    string PricingUnit,
    string Status,
    string PaymentStatus,
    string? PaymentUrl,
    DateTime CreatedAt,
    string? Notes,
    string? ProviderPhone,
    string? OwnerPhone,
    bool HasReview,
    string? CancellationReason,
    string? Location
);
