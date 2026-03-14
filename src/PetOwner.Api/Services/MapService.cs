using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using PetOwner.Api.DTOs;
using PetOwner.Data;

namespace PetOwner.Api.Services;

public class MapService : IMapService
{
    private readonly ApplicationDbContext _db;

    public MapService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<MapPinDto>> GetApprovedAvailableProvidersAsync(DateTime? requestedTime = null)
    {
        return await SearchProvidersAsync(new MapSearchFilter(RequestedTime: requestedTime));
    }

    public async Task<List<MapPinDto>> SearchProvidersAsync(MapSearchFilter filter)
    {
        var query = _db.Locations
            .AsNoTracking()
            .Where(l =>
                l.GeoLocation != null &&
                l.User != null &&
                l.User.ProviderProfile != null &&
                l.User.ProviderProfile.Status == "Approved" &&
                l.User.ProviderProfile.IsAvailableNow);

        if (filter.RequestedTime.HasValue)
        {
            var dayOfWeek = (int)filter.RequestedTime.Value.DayOfWeek;
            var timeOfDay = filter.RequestedTime.Value.TimeOfDay;

            query = query.Where(l =>
                l.User!.ProviderProfile!.AcceptsOffHoursRequests
                || l.User.ProviderProfile.AvailabilitySlots.Any(slot =>
                    slot.DayOfWeek == dayOfWeek
                    && slot.StartTime <= timeOfDay
                    && slot.EndTime > timeOfDay));
        }

        if (!string.IsNullOrWhiteSpace(filter.ServiceType))
        {
            query = query.Where(l =>
                l.User!.ProviderProfile!.ProviderServices.Any(ps => ps.Service.Name == filter.ServiceType));
        }

        if (filter.MinRating.HasValue)
        {
            var minRating = (decimal)filter.MinRating.Value;
            query = query.Where(l =>
                l.User!.ProviderProfile!.AverageRating != null &&
                l.User.ProviderProfile.AverageRating >= minRating);
        }

        if (filter.MaxRate.HasValue)
        {
            query = query.Where(l => l.User!.ProviderProfile!.HourlyRate <= filter.MaxRate.Value);
        }

        if (filter.RadiusKm.HasValue && filter.Latitude.HasValue && filter.Longitude.HasValue)
        {
            var center = new Point(filter.Longitude.Value, filter.Latitude.Value) { SRID = 4326 };
            var radiusDegrees = filter.RadiusKm.Value / 111.32;
            query = query.Where(l => l.GeoLocation!.Distance(center) <= radiusDegrees);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.Trim();
            query = query.Where(l =>
                l.User!.Name.Contains(term) ||
                l.User.ProviderProfile!.ProviderServices.Any(ps => ps.Service.Name.Contains(term)));
        }

        return await query
            .Select(l => new MapPinDto(
                l.UserId,
                l.User!.Name,
                l.GeoLocation!.Y,
                l.GeoLocation.X,
                l.User.ProviderProfile!.HourlyRate,
                l.User.ProviderProfile.ProfileImageUrl,
                string.Join(", ", l.User.ProviderProfile.ProviderServices
                    .Select(ps => ps.Service.Name)),
                l.User.ProviderProfile.AverageRating,
                l.User.ProviderProfile.ReviewCount,
                l.User.ProviderProfile.AcceptsOffHoursRequests))
            .ToListAsync();
    }
}
