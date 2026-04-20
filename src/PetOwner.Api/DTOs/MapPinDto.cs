using PetOwner.Data.Models;

namespace PetOwner.Api.DTOs;

public record MapPinDto(
    Guid ProviderId,
    string Name,
    double Latitude,
    double Longitude,
    decimal MinRate,
    string? ProfileImageUrl,
    string Services,
    decimal? AverageRating,
    int ReviewCount,
    bool AcceptsOffHoursRequests,
    string ProviderType,
    string? WhatsAppNumber,
    string? WebsiteUrl,
    bool IsEmergencyService);

public record ProviderPublicProfileDto(
    Guid ProviderId,
    string Name,
    string? Bio,
    string? ProfileImageUrl,
    List<ServiceRateDto> ServiceRates,
    decimal? AverageRating,
    int ReviewCount,
    bool IsAvailableNow,
    bool AcceptsOffHoursRequests,
    List<string> Services,
    List<PublicAvailabilitySlotDto> AvailabilitySlots,
    List<ReviewDto> RecentReviews,
    string ProviderType,
    string? WhatsAppNumber,
    string? WebsiteUrl,
    string? OpeningHours,
    bool IsEmergencyService,
    List<DogSize> AcceptedDogSizes,
    int? MaxDogsCapacity
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
