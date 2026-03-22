using PetOwner.Data.Models;

namespace PetOwner.Api.DTOs;

public record CreateBookingRequest(
    Guid ProviderId,
    ServiceType ServiceType,
    DateTime StartDate,
    DateTime EndDate,
    string? Notes = null
);

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
    string PricingUnit,
    string Status,
    string PaymentStatus,
    string? PaymentUrl,
    DateTime CreatedAt,
    string? Notes,
    string? ProviderPhone,
    string? OwnerPhone,
    bool HasReview
);
