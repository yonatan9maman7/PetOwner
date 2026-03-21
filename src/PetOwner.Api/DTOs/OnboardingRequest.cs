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
    [Required] string ReferenceContact
);

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
    bool AcceptsOffHoursRequests
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
    bool? AcceptsOffHoursRequests
);
