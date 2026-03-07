namespace PetOwner.Api.DTOs;

public record CreateServiceRequestDto(
    Guid ProviderId,
    Guid? PetId,
    int? ServiceId = null,
    DateTime? ScheduledStart = null,
    DateTime? ScheduledEnd = null,
    string? Notes = null,
    bool ShareMedicalRecords = false
);

public record ServiceRequestDto(
    Guid Id,
    Guid OwnerId,
    string OwnerName,
    Guid ProviderId,
    string ProviderName,
    Guid? PetId,
    string? PetName,
    string Status,
    DateTime CreatedAt,
    string? ProviderPhone,
    bool HasReview,
    int? ServiceId,
    string? ServiceName,
    DateTime? ScheduledStart,
    DateTime? ScheduledEnd,
    decimal? TotalPrice,
    string? Notes,
    string? CancellationReason,
    string? PaymentStatus,
    bool ShareMedicalRecords
);

public record CancelRequestDto(
    string? Reason = null
);
