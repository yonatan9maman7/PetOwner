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
        MapSearchFilter filter = requestedTime.HasValue
            ? new MapSearchFilter(
                RequestedDate: requestedTime.Value.Date,
                RequestedTime: requestedTime.Value.TimeOfDay)
            : new MapSearchFilter();
        return await SearchProvidersAsync(filter);
    }

    public async Task<List<MapPinDto>> SearchProvidersAsync(MapSearchFilter filter)
    {
        ArgumentNullException.ThrowIfNull(filter);

        // Approved providers with a resolvable map pin (business or live GPS). IsAvailableNow is not required.
        var query = _db.ProviderProfiles
            .AsNoTracking()
            .Where(p =>
                p.Status == ProviderStatus.Approved &&
                !p.IsSuspended &&
                (
                    p.BusinessGeoLocation != null
                    || (p.Latitude != null && p.Longitude != null)
                    || (p.UseLiveLocationOnMap
                        && p.User != null
                        && p.User.Location != null
                        && p.User.Location.GeoLocation != null)));

        if (filter.RequestedDate.HasValue)
        {
            var dayOfWeek = (int)filter.RequestedDate.Value.DayOfWeek;

            if (filter.RequestedTime.HasValue)
            {
                var timeOfDay = filter.RequestedTime.Value;
                query = query.Where(p =>
                    p.AcceptsOffHoursRequests
                    || p.AvailabilitySlots.Any(slot =>
                        slot.DayOfWeek == dayOfWeek
                        && slot.StartTime <= timeOfDay
                        && slot.EndTime > timeOfDay));
            }
            else
            {
                query = query.Where(p =>
                    p.AcceptsOffHoursRequests
                    || p.AvailabilitySlots.Any(slot => slot.DayOfWeek == dayOfWeek));
            }
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
            query = query.Where(p =>
                p.ServiceRates.Any(r => parsedServiceTypes.Contains(r.Service)));
        }

        if (filter.MinRating.HasValue)
        {
            var minRating = (decimal)filter.MinRating.Value;
            query = query.Where(p =>
                p.AverageRating != null &&
                p.AverageRating >= minRating);
        }

        if (filter.MaxRate.HasValue)
        {
            if (parsedServiceTypes.Count > 0)
            {
                query = query.Where(p => p.ServiceRates
                    .Any(r => parsedServiceTypes.Contains(r.Service) && r.Rate <= filter.MaxRate.Value));
            }
            else
            {
                query = query.Where(p => p.ServiceRates
                    .Any(r => r.Rate <= filter.MaxRate.Value));
            }
        }

        var applyRadiusInMemory = false;
        double? radiusKmFilter = null;
        double? centerLat = null;
        double? centerLng = null;

        if (filter.RadiusKm.HasValue && filter.Latitude.HasValue && filter.Longitude.HasValue)
        {
            if (IsInMemoryDatabase(_db))
            {
                applyRadiusInMemory = true;
                radiusKmFilter = filter.RadiusKm.Value;
                centerLat = filter.Latitude.Value;
                centerLng = filter.Longitude.Value;
            }
            else
            {
                var center = new Point(filter.Longitude.Value, filter.Latitude.Value) { SRID = 4326 };
                var radiusMeters = filter.RadiusKm.Value * 1000;
                query = query.Where(p =>
                    (p.UseLiveLocationOnMap
                        && p.User!.Location != null
                        && p.User.Location.GeoLocation != null
                        && p.User.Location.GeoLocation.Distance(center) <= radiusMeters)
                    || (!p.UseLiveLocationOnMap
                        && p.BusinessGeoLocation != null
                        && p.BusinessGeoLocation.Distance(center) <= radiusMeters));
            }
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.Trim();
            var matchingTypes = ServiceTypeCatalog.ServiceTypesWithDisplayNameContaining(term);
            if (matchingTypes.Count > 0)
            {
                query = query.Where(p =>
                    p.User!.Name.Contains(term) ||
                    p.ServiceRates.Any(r => matchingTypes.Contains(r.Service)));
            }
            else
            {
                query = query.Where(p => p.User!.Name.Contains(term));
            }
        }

        if (filter.ProviderTypeFilter.HasValue)
        {
            var wanted = filter.ProviderTypeFilter.Value;
            query = query.Where(p => p.Type == wanted);
        }

        var baseRows = await query
            .Select(p => new
            {
                p.UserId,
                Name = p.User!.Name,
                Latitude = p.UseLiveLocationOnMap
                    && p.User.Location != null
                    && p.User.Location.GeoLocation != null
                    ? p.User.Location.GeoLocation.Y
                    : (p.BusinessGeoLocation != null ? p.BusinessGeoLocation.Y : p.Latitude!.Value),
                Longitude = p.UseLiveLocationOnMap
                    && p.User.Location != null
                    && p.User.Location.GeoLocation != null
                    ? p.User.Location.GeoLocation.X
                    : (p.BusinessGeoLocation != null ? p.BusinessGeoLocation.X : p.Longitude!.Value),
                p.ProfileImageUrl,
                p.AverageRating,
                p.ReviewCount,
                p.AcceptsOffHoursRequests,
                p.Type,
                p.WhatsAppNumber,
                p.WebsiteUrl,
                p.IsEmergencyService,
            })
            .ToListAsync();

        if (applyRadiusInMemory && radiusKmFilter.HasValue && centerLat.HasValue && centerLng.HasValue)
        {
            baseRows = baseRows
                .Where(r => HaversineKm(centerLat.Value, centerLng.Value, r.Latitude, r.Longitude) <= radiusKmFilter.Value)
                .ToList();
        }

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
                r.IsEmergencyService,
                rates.Select(x => new MapPinServiceRateDto(ServiceTypeCatalog.ToDisplayName(x.Service), x.Rate)).ToList());
        }).ToList();
    }

    private static bool IsInMemoryDatabase(ApplicationDbContext db) =>
        db.Database.ProviderName?.Contains("InMemory", StringComparison.Ordinal) == true;

    private static double HaversineKm(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6371.0;
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLng = (lng2 - lng1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0)
              * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return 2 * R * Math.Asin(Math.Sqrt(a));
    }
}
