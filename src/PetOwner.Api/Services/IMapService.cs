using PetOwner.Api.DTOs;
using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

public record MapSearchFilter(
    DateTime? RequestedTime = null,
    string? ServiceType = null,
    double? MinRating = null,
    decimal? MaxRate = null,
    double? RadiusKm = null,
    double? Latitude = null,
    double? Longitude = null,
    string? SearchTerm = null,
    ProviderType? ProviderTypeFilter = null
);

public interface IMapService
{
    Task<List<MapPinDto>> GetApprovedAvailableProvidersAsync(DateTime? requestedTime = null);
    Task<List<MapPinDto>> SearchProvidersAsync(MapSearchFilter filter);
}
