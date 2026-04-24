using System.ComponentModel.DataAnnotations;
using PetOwner.Data.Models;

namespace PetOwner.Api.DTOs;

public record ServicePackageDto(
    Guid? Id,
    string Title,
    decimal Price,
    string? Description
);

public record ServiceRateDto(
    ServiceType ServiceType,
    decimal Rate,
    PricingUnit PricingUnit,
    List<ServicePackageDto>? Packages = null
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

    /// <summary>When omitted, the account phone from the user profile is used.</summary>
    [Phone, MaxLength(20)]
    public string? PhoneNumber { get; init; }

    [Phone, MaxLength(20)]
    public string? WhatsAppNumber { get; init; }

    [MaxLength(500), Url]
    public string? WebsiteUrl { get; init; }

    [MaxLength(2000)]
    public string? OpeningHours { get; init; }

    public bool IsEmergencyService { get; init; }

    [Required, MaxLength(2000)]
    public string Description { get; init; } = null!;

    /// <summary>Public-facing bio. When omitted, <see cref="Description"/> is copied after apply.</summary>
    [MaxLength(4000)]
    public string? Bio { get; init; }

    [MaxLength(500)]
    public string? ImageUrl { get; init; }

    public List<ServiceRateDto> SelectedServices { get; init; } = [];

    [MaxLength(200)]
    public string? ReferenceName { get; init; }

    [MaxLength(200)]
    public string? ReferenceContact { get; init; }

    public List<DogSize> AcceptedDogSizes { get; init; } = [];

    public int? MaxDogsCapacity { get; init; }
}

public record ProviderApplicationResponse(
    string Message,
    Guid ApplicationId,
    string? NewAccessToken = null);

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
    List<DogSize> AcceptedDogSizes,
    int? MaxDogsCapacity
);

public record GenerateBioRequest([param: MaxLength(500)] string UserNotes);

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
    List<DogSize>? AcceptedDogSizes = null,
    int? MaxDogsCapacity = null);
