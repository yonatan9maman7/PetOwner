namespace PetOwner.Api.DTOs;

public record MapPinDto(
    Guid ProviderId,
    string Name,
    double Latitude,
    double Longitude,
    decimal HourlyRate,
    string? ProfileImageUrl,
    string Services,
    decimal? AverageRating,
    int ReviewCount,
    bool AcceptsOffHoursRequests);

public record ProviderPublicProfileDto(
    Guid ProviderId,
    string Name,
    string? Bio,
    string? ProfileImageUrl,
    decimal HourlyRate,
    decimal? AverageRating,
    int ReviewCount,
    bool IsAvailableNow,
    bool AcceptsOffHoursRequests,
    List<string> Services,
    List<PublicAvailabilitySlotDto> AvailabilitySlots,
    List<ReviewDto> RecentReviews
);

public record PublicAvailabilitySlotDto(int DayOfWeek, string StartTime, string EndTime);

public record UserMiniProfileDto(
    Guid Id,
    string Name,
    string? ProfileImageUrl,
    string? Bio,
    string Role,
    DateTime MemberSince,
    bool IsProvider,
    List<string>? Services,
    decimal? AverageRating,
    int? ReviewCount
);
