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

        // Materialize after spatial/basic filters only. Min(Rate) + service lists in the projection
        // become per-row CASE/EXISTS subqueries and multiply joins; compute those in memory instead.
        var baseRows = await query
            .Select(l => new
            {
                l.UserId,
                Name = l.User!.Name,
                Latitude = l.GeoLocation!.Y,
                Longitude = l.GeoLocation.X,
                l.User.ProviderProfile!.ProfileImageUrl,
                l.User.ProviderProfile.AverageRating,
                l.User.ProviderProfile.ReviewCount,
                l.User.ProviderProfile.AcceptsOffHoursRequests,
                l.User.ProviderProfile.Type,
                l.User.ProviderProfile.WhatsAppNumber,
                l.User.ProviderProfile.WebsiteUrl,
                l.User.ProviderProfile.IsEmergencyService,
            })
            .ToListAsync();

        if (baseRows.Count == 0)
            return [];

        var providerIds = baseRows.Select(r => r.UserId).Distinct().ToList();

        var rateRows = await _db.ProviderServiceRates
            .AsNoTracking()
            .Where(r => providerIds.Contains(r.ProviderProfileId))
            .Select(r => new { r.ProviderProfileId, r.Service, r.Rate })
            .ToListAsync();

        var ratesByProvider = rateRows.ToLookup(r => r.ProviderProfileId);

        return baseRows.Select(r =>
        {
            var rates = ratesByProvider[r.UserId];
            var minRate = rates.Any() ? rates.Min(x => x.Rate) : 0m;
            var services = string.Join(
                ", ",
                rates.Select(x => x.Service).Distinct().OrderBy(s => s).Select(ServiceTypeCatalog.ToDisplayName));

            return new MapPinDto(
                r.UserId,
                r.Name,
                r.Latitude,
                r.Longitude,
                minRate,
                r.ProfileImageUrl,
                services,
                r.AverageRating,
                r.ReviewCount,
                r.AcceptsOffHoursRequests,
                r.Type.ToString(),
                r.WhatsAppNumber,
                r.WebsiteUrl,
                r.IsEmergencyService);
        }).ToList();
    }
}
