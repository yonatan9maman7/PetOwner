using System.ComponentModel.DataAnnotations;

namespace PetOwner.Api.DTOs;

public record ProviderOnboardingRequest(
    List<string> Services,
    decimal HourlyRate,
    string Bio,
    [Required] double Latitude,
    [Required] double Longitude,
    [Required] string Address,
    [Required] string ReferenceName,
    [Required] string ReferenceContact,
    [Required]
    [StringLength(9, MinimumLength = 9)]
    [RegularExpression("^[0-9]{9}$", ErrorMessage = "ID Number must be exactly 9 digits.")]
    string IdNumber
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
