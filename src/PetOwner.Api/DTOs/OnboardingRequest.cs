using System.ComponentModel.DataAnnotations;
using PetOwner.Data.Models;

namespace PetOwner.Api.DTOs;

public record ServiceRateDto(
    ServiceType ServiceType,
    decimal Rate,
    PricingUnit PricingUnit
);

public record ProviderOnboardingRequest(
    List<ServiceRateDto> SelectedServices,
    string Bio,
    [Required] double Latitude,
    [Required] double Longitude,
    [Required] string City,
    [Required] string Street,
    [Required] string BuildingNumber,
    string? ApartmentNumber,
    [Required] string ReferenceName,
    [Required] string ReferenceContact,
    [MaxLength(500), Url] string? InstagramUrl = null,
    [MaxLength(500), Url] string? FacebookUrl = null
);

public record ProviderApplicationRequest
{
    [Required]
    public ProviderType Type { get; init; }

    [MaxLength(200)]
    public string? BusinessName { get; init; }

    [Required]
    public ServiceType ServiceType { get; init; }

    [Required, MaxLength(100)]
    public string City { get; init; } = null!;

    [Required, MaxLength(200)]
    public string Street { get; init; } = null!;

    [Required, MaxLength(50)]
    public string BuildingNumber { get; init; } = null!;

    [MaxLength(50)]
    public string? ApartmentNumber { get; init; }

    [Required]
    public double Latitude { get; init; }

    [Required]
    public double Longitude { get; init; }

    [Required, Phone, MaxLength(20)]
    public string PhoneNumber { get; init; } = null!;

    [Phone, MaxLength(20)]
    public string? WhatsAppNumber { get; init; }

    [MaxLength(500), Url]
    public string? WebsiteUrl { get; init; }

    [MaxLength(2000)]
    public string? OpeningHours { get; init; }

    public bool IsEmergencyService { get; init; }

    [Required, MaxLength(2000)]
    public string Description { get; init; } = null!;

    [MaxLength(500)]
    public string? ImageUrl { get; init; }

    public List<ServiceRateDto> SelectedServices { get; init; } = [];

    [MaxLength(200)]
    public string? ReferenceName { get; init; }

    [MaxLength(200)]
    public string? ReferenceContact { get; init; }

    [MaxLength(500), Url]
    public string? InstagramUrl { get; init; }

    [MaxLength(500), Url]
    public string? FacebookUrl { get; init; }
}

public record ProviderApplicationResponse(string Message, Guid ApplicationId);

public record ProviderMeResponse(
    string Status,
    bool IsAvailableNow,
    string UserName,
    string? Bio,
    List<ServiceRateDto> ServiceRates,
    string City,
    string Street,
    string BuildingNumber,
    string? ApartmentNumber,
    double? Latitude,
    double? Longitude,
    List<int> ServiceIds,
    List<string> Services,
    string? ProfileImageUrl,
    decimal? AverageRating,
    int ReviewCount,
    bool AcceptsOffHoursRequests,
    bool IsSuspended,
    string? SuspensionReason,
    string ProviderType,
    string? WhatsAppNumber,
    string? WebsiteUrl,
    string? OpeningHours,
    bool IsEmergencyService,
    string? InstagramUrl,
    string? FacebookUrl
);

public record GenerateBioRequest(string UserNotes);

public record GenerateBioResponse(string Bio);

public record UpdateAvailabilityRequest(bool IsAvailable);

public record UpdateProfileDto(
    string Bio,
    List<ServiceRateDto> SelectedServices,
    double Latitude,
    double Longitude,
    string City,
    string Street,
    string BuildingNumber,
    string? ApartmentNumber,
    bool? AcceptsOffHoursRequests,
    [MaxLength(500), Url] string? InstagramUrl = null,
    [MaxLength(500), Url] string? FacebookUrl = null
);
