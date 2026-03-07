namespace PetOwner.Api.DTOs;

public record TeletriageRequestDto(
    Guid PetId,
    string Symptoms
);

public record TeletriageResponseDto(
    Guid Id,
    Guid PetId,
    string PetName,
    string Severity,
    string Assessment,
    string? Recommendations,
    bool IsEmergency,
    DateTime CreatedAt
);

public record TeletriageHistoryDto(
    Guid Id,
    Guid PetId,
    string PetName,
    string Symptoms,
    string Severity,
    string Assessment,
    string? Recommendations,
    bool IsEmergency,
    DateTime CreatedAt
);

public record NearbyVetDto(
    Guid ProviderId,
    string Name,
    string? Phone,
    double Latitude,
    double Longitude,
    string? Address,
    double DistanceKm,
    string? ProfileImageUrl,
    string Services,
    decimal HourlyRate,
    double AverageRating,
    int ReviewCount
);
