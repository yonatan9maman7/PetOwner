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
        // Approved + location + not admin-suspended. Do not require IsAvailableNow — that toggle is for
        // "I'm online right now" and would hide most providers on the explore map (default is false).
        var query = _db.Locations
            .AsNoTracking()
            .Where(l =>
                l.GeoLocation != null &&
                l.User != null &&
                l.User.ProviderProfile != null &&
                l.User.ProviderProfile.Status == ProviderStatus.Approved &&
                !l.User.ProviderProfile.IsSuspended);

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

        var parsedServiceTypes = new List<ServiceType>();
        if (!string.IsNullOrWhiteSpace(filter.ServiceType))
        {
            foreach (var segment in filter.ServiceType.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var parsed = ServiceTypeCatalog.TryParseDisplayName(segment);
                if (parsed.HasValue) parsedServiceTypes.Add(parsed.Value);
            }
        }

        if (parsedServiceTypes.Count > 0)
        {
            query = query.Where(l =>
                l.User!.ProviderProfile!.ServiceRates.Any(r => parsedServiceTypes.Contains(r.Service)));
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
            if (parsedServiceTypes.Count > 0)
            {
                query = query.Where(l => l.User!.ProviderProfile!.ServiceRates
                    .Any(r => parsedServiceTypes.Contains(r.Service) && r.Rate <= filter.MaxRate.Value));
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
            var radiusMeters = filter.RadiusKm.Value * 1000;
            query = query.Where(l => l.GeoLocation!.Distance(center) <= radiusMeters);
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

        if (filter.ProviderTypeFilter.HasValue)
        {
            var wanted = filter.ProviderTypeFilter.Value;
            query = query.Where(l => l.User!.ProviderProfile!.Type == wanted);
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
