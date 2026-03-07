using PetOwner.Api.DTOs;

namespace PetOwner.Api.Services;

public record MapSearchFilter(
    DateTime? RequestedTime = null,
    string? ServiceType = null,
    double? MinRating = null,
    decimal? MaxRate = null,
    double? RadiusKm = null,
    double? Latitude = null,
    double? Longitude = null
);

public interface IMapService
{
    Task<List<MapPinDto>> GetApprovedAvailableProvidersAsync(DateTime? requestedTime = null);
    Task<List<MapPinDto>> SearchProvidersAsync(MapSearchFilter filter);
}
