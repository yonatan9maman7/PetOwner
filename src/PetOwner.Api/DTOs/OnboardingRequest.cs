namespace PetOwner.Api.DTOs;

public record ProviderOnboardingRequest(
    List<string> Services,
    decimal HourlyRate,
    string Bio,
    double? Latitude,
    double? Longitude,
    string? Address
);

public record ProviderMeResponse(
    string Status,
    bool IsAvailableNow,
    string UserName,
    string? Bio,
    decimal HourlyRate,
    string? Address,
    double? Latitude,
    double? Longitude,
    List<int> ServiceIds,
    List<string> Services,
    string? ProfileImageUrl,
    decimal? AverageRating,
    int ReviewCount,
    bool AcceptsOffHoursRequests
);

public record GenerateBioRequest(string UserNotes);

public record GenerateBioResponse(string Bio);

public record UpdateAvailabilityRequest(bool IsAvailable);

public record UpdateProfileDto(
    string Bio,
    decimal HourlyRate,
    List<string> Services,
    double Latitude,
    double Longitude,
    string Address,
    bool? AcceptsOffHoursRequests
);
