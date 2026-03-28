using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using PetOwner.Api.DTOs;
using PetOwner.Api.Infrastructure;
using PetOwner.Data;
using PetOwner.Data.Models;

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
                l.User.ProviderProfile.Status == ProviderStatus.Approved &&
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

        var parsedServiceType = ServiceTypeCatalog.TryParseDisplayName(filter.ServiceType);
        if (parsedServiceType.HasValue)
        {
            var st = parsedServiceType.Value;
            query = query.Where(l =>
                l.User!.ProviderProfile!.ServiceRates.Any(r => r.Service == st));
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
            if (parsedServiceType.HasValue)
            {
                var svc = parsedServiceType.Value;
                query = query.Where(l => l.User!.ProviderProfile!.ServiceRates
                    .Any(r => r.Service == svc && r.Rate <= filter.MaxRate.Value));
            }
            else
            {
                query = query.Where(l => l.User!.ProviderProfile!.ServiceRates
                    .Any(r => r.Rate <= filter.MaxRate.Value));
            }
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
            var matchingTypes = ServiceTypeCatalog.ServiceTypesWithDisplayNameContaining(term);
            if (matchingTypes.Count > 0)
            {
                query = query.Where(l =>
                    l.User!.Name.Contains(term) ||
                    l.User.ProviderProfile!.ServiceRates.Any(r => matchingTypes.Contains(r.Service)));
            }
            else
            {
                query = query.Where(l => l.User!.Name.Contains(term));
            }
        }

        // Avoid string.Join / enum formatting inside EF projection (often fails SQL translation).
        var rows = await query
            .Select(l => new
            {
                l.UserId,
                Name = l.User!.Name,
                Latitude = l.GeoLocation!.Y,
                Longitude = l.GeoLocation.X,
                MinRate = l.User.ProviderProfile!.ServiceRates.Any()
                    ? l.User.ProviderProfile.ServiceRates.Min(r => r.Rate)
                    : 0m,
                l.User.ProviderProfile.ProfileImageUrl,
                ServiceKinds = l.User.ProviderProfile.ServiceRates.Select(r => r.Service),
                l.User.ProviderProfile.AverageRating,
                l.User.ProviderProfile.ReviewCount,
                l.User.ProviderProfile.AcceptsOffHoursRequests,
                l.User.ProviderProfile.Type,
                l.User.ProviderProfile.WhatsAppNumber,
                l.User.ProviderProfile.WebsiteUrl,
                l.User.ProviderProfile.IsEmergencyService,
            })
            .ToListAsync();

        return rows.Select(r => new MapPinDto(
            r.UserId,
            r.Name,
            r.Latitude,
            r.Longitude,
            r.MinRate,
            r.ProfileImageUrl,
            string.Join(", ", r.ServiceKinds.OrderBy(s => s).Select(ServiceTypeCatalog.ToDisplayName)),
            r.AverageRating,
            r.ReviewCount,
            r.AcceptsOffHoursRequests,
            r.Type.ToString(),
            r.WhatsAppNumber,
            r.WebsiteUrl,
            r.IsEmergencyService))
            .ToList();
    }
}
