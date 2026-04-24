using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using PetOwner.Api.DTOs;
using PetOwner.Api.Infrastructure;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/map")]
public class MapController : ControllerBase
{
    private readonly IMapService _mapService;
    private readonly ApplicationDbContext _db;

    public MapController(IMapService mapService, ApplicationDbContext db)
    {
        _mapService = mapService;
        _db = db;
    }

    private static bool IsInMemoryDatabase(ApplicationDbContext db) =>
        db.Database.ProviderName?.Contains("InMemory", StringComparison.Ordinal) == true;

    /// <summary>
    /// InMemory EF provider does not translate ExecuteUpdate with column-based increments.
    /// </summary>
    private async Task IncrementSearchAppearanceCountsAsync(IReadOnlyList<Guid> userIds, CancellationToken cancellationToken = default)
    {
        if (userIds.Count == 0)
            return;

        if (IsInMemoryDatabase(_db))
        {
            var profiles = await _db.ProviderProfiles
                .Where(p => userIds.Contains(p.UserId))
                .ToListAsync(cancellationToken);
            foreach (var p in profiles)
                p.SearchAppearanceCount++;
            await _db.SaveChangesAsync(cancellationToken);
        }
        else
        {
            await _db.ProviderProfiles
                .Where(p => userIds.Contains(p.UserId))
                .ExecuteUpdateAsync(
                    s => s.SetProperty(p => p.SearchAppearanceCount, p => p.SearchAppearanceCount + 1),
                    cancellationToken);
        }
    }

    private async Task IncrementProfileViewCountAsync(Guid providerUserId, CancellationToken cancellationToken = default)
    {
        if (IsInMemoryDatabase(_db))
        {
            var profile = await _db.ProviderProfiles
                .FirstOrDefaultAsync(p => p.UserId == providerUserId, cancellationToken);
            if (profile is null)
                return;
            profile.ProfileViewCount++;
            await _db.SaveChangesAsync(cancellationToken);
        }
        else
        {
            await _db.ProviderProfiles
                .Where(p => p.UserId == providerUserId)
                .ExecuteUpdateAsync(
                    s => s.SetProperty(p => p.ProfileViewCount, p => p.ProfileViewCount + 1),
                    cancellationToken);
        }
    }

    [HttpGet("pins")]
    public async Task<IActionResult> GetPins(
        [FromQuery] DateTime? requestedTime,
        [FromQuery] string? serviceType,
        [FromQuery] double? minRating,
        [FromQuery] decimal? maxRate,
        [FromQuery] double? radiusKm,
        [FromQuery] double? latitude,
        [FromQuery] double? longitude,
        [FromQuery] string? searchTerm,
        [FromQuery] ProviderType? providerType = null)
    {
        var filter = new MapSearchFilter(
            requestedTime, serviceType, minRating, maxRate, radiusKm, latitude, longitude, searchTerm, providerType);
        var pins = await _mapService.SearchProvidersAsync(filter);

        // Search-appearance tracking — increment per returned provider for the stats dashboard.
        // Done as a single atomic UPDATE so we don't pay the cost of round-tripping each entity.
        if (pins.Count > 0)
        {
            var ids = pins.Select(p => p.ProviderId).ToList();
            await IncrementSearchAppearanceCountsAsync(ids, HttpContext.RequestAborted);
        }

        return Ok(pins);
    }

    [Authorize]
    [HttpGet("playdate-pins")]
    public async Task<IActionResult> GetPlaydatePins(
        [FromQuery] double? latitude,
        [FromQuery] double? longitude,
        [FromQuery] double? radiusKm,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var now = DateTime.UtcNow;
        var startFrom = from.HasValue ? DateTime.SpecifyKind(from.Value.ToUniversalTime(), DateTimeKind.Utc) : now;
        var endTo = to.HasValue ? DateTime.SpecifyKind(to.Value.ToUniversalTime(), DateTimeKind.Utc) : now.AddDays(30);

        var query = _db.PlaydateEvents
            .AsNoTracking()
            .Include(e => e.Rsvps)
            .Where(e => e.CancelledAt == null
                        && e.ScheduledFor >= startFrom
                        && e.ScheduledFor <= endTo);

        if (latitude.HasValue && longitude.HasValue && radiusKm.HasValue && !IsInMemoryDatabase(_db))
        {
            var center = new Point(longitude.Value, latitude.Value) { SRID = 4326 };
            var radiusMeters = radiusKm.Value * 1000;
            query = query.Where(e => e.GeoLocation.Distance(center) <= radiusMeters);
        }

        var raw = await query
            .Select(e => new
            {
                e.Id,
                e.HostUserId,
                HostName = e.Host.Name,
                e.Title,
                e.LocationName,
                Latitude = e.GeoLocation.Y,
                Longitude = e.GeoLocation.X,
                e.ScheduledFor,
                e.EndsAt,
                e.AllowedSpeciesCsv,
                GoingCount = e.Rsvps.Count(r => r.Status == RsvpStatus.Going),
            })
            .ToListAsync();

        // In-memory Haversine fallback for dev/test
        IEnumerable<dynamic> filtered = raw;
        if (latitude.HasValue && longitude.HasValue && radiusKm.HasValue && IsInMemoryDatabase(_db))
        {
            filtered = raw.Where(e =>
                HaversineKm(latitude.Value, longitude.Value, (double)e.Latitude, (double)e.Longitude) <= radiusKm.Value);
        }

        var pins = filtered.Select(e => new PlaydateMapPinDto(
            e.Id,
            e.HostUserId,
            (string)e.HostName,
            (string)e.Title,
            (string)e.LocationName,
            (double)e.Latitude,
            (double)e.Longitude,
            (DateTime)e.ScheduledFor,
            (DateTime?)e.EndsAt,
            (int)e.GoingCount,
            string.IsNullOrEmpty((string)e.AllowedSpeciesCsv)
                ? (IReadOnlyList<string>)Array.Empty<string>()
                : (IReadOnlyList<string>)((string)e.AllowedSpeciesCsv).Split(',', StringSplitOptions.RemoveEmptyEntries),
            latitude.HasValue && longitude.HasValue
                ? Math.Round(HaversineKm(latitude.Value, longitude.Value, (double)e.Latitude, (double)e.Longitude) * 2, MidpointRounding.AwayFromZero) / 2
                : (double?)null))
        .ToList();

        return Ok(pins);
    }

    [HttpGet("service-types")]
    public IActionResult GetServiceTypes() =>
        Ok(ServiceTypeCatalog.AllDisplayNamesOrdered);

    [HttpGet("~/api/providers/{providerId:guid}/profile")]
    public async Task<IActionResult> GetProviderProfile(Guid providerId)
    {
        var provider = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == providerId && u.ProviderProfile != null && u.ProviderProfile.Status == ProviderStatus.Approved)
            .Select(u => new ProviderPublicProfileDto(
                u.Id,
                u.Name,
                u.ProviderProfile!.Bio,
                u.ProviderProfile.ProfileImageUrl,
                u.ProviderProfile.ServiceRates.Select(r => new ServiceRateDto(
                    r.Service, r.Rate, r.Unit,
                    r.Packages.Select(p => new ServicePackageDto(p.Id, p.Title, p.Price, p.Description)).ToList()
                )).ToList(),
                u.ProviderProfile.AverageRating,
                u.ProviderProfile.ReviewCount,
                u.ProviderProfile.IsAvailableNow,
                u.ProviderProfile.AcceptsOffHoursRequests,
                u.ProviderProfile.ProviderServices.Select(ps => ps.Service.Name).ToList(),
                u.ProviderProfile.AvailabilitySlots
                    .OrderBy(a => a.DayOfWeek).ThenBy(a => a.StartTime)
                    .Select(a => new PublicAvailabilitySlotDto(
                        a.DayOfWeek,
                        a.StartTime.ToString(@"hh\:mm"),
                        a.EndTime.ToString(@"hh\:mm")))
                    .ToList(),
                u.ReviewsReceived
                    .OrderByDescending(r => r.CreatedAt)
                    .Take(10)
                    .Select(r => new ReviewDto(
                        r.Id,
                        r.ServiceRequestId,
                        r.BookingId,
                        r.ReviewerId,
                        r.Reviewer.Name,
                        r.Reviewer.ProviderProfile != null ? r.Reviewer.ProviderProfile.ProfileImageUrl : null,
                        r.RevieweeId,
                        r.Rating,
                        r.Comment,
                        r.IsVerified,
                        r.CommunicationRating,
                        r.ReliabilityRating,
                        r.PhotoUrl,
                        r.CreatedAt))
                    .ToList(),
                u.ProviderProfile.Type.ToString(),
                u.ProviderProfile.WhatsAppNumber,
                u.ProviderProfile.WebsiteUrl,
                u.ProviderProfile.OpeningHours,
                u.ProviderProfile.IsEmergencyService,
                u.ProviderProfile.AcceptedDogSizes,
                u.ProviderProfile.MaxDogsCapacity))
            .FirstOrDefaultAsync();

        if (provider is null)
            return NotFound(new { message = "Provider not found." });

        // Profile-view tracking — only count views from a different authenticated user
        // (or anonymous viewers). The provider browsing themselves shouldn't inflate stats.
        var viewerIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isSelfView = Guid.TryParse(viewerIdClaim, out var viewerId) && viewerId == providerId;
        if (!isSelfView)
            await IncrementProfileViewCountAsync(providerId, HttpContext.RequestAborted);

        return Ok(provider);
    }

    [HttpGet("~/api/users/{userId:guid}/mini-profile")]
    public async Task<IActionResult> GetUserMiniProfile(Guid userId)
    {
        var user = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new UserMiniProfileDto(
                u.Id,
                u.Name,
                u.ProviderProfile != null ? u.ProviderProfile.ProfileImageUrl : null,
                u.ProviderProfile != null ? u.ProviderProfile.Bio : null,
                u.Role,
                u.CreatedAt,
                u.ProviderProfile != null && u.ProviderProfile.Status == ProviderStatus.Approved,
                u.ProviderProfile != null && u.ProviderProfile.Status == ProviderStatus.Approved
                    ? u.ProviderProfile.ProviderServices.Select(ps => ps.Service.Name).ToList()
                    : null,
                u.ProviderProfile != null ? u.ProviderProfile.AverageRating : null,
                u.ProviderProfile != null ? u.ProviderProfile.ReviewCount : (int?)null
            ))
            .FirstOrDefaultAsync();

        if (user is null)
            return NotFound(new { message = "User not found." });

        return Ok(user);
    }

    [Authorize]
    [HttpGet("~/api/providers/{providerId:guid}/contact")]
    public async Task<IActionResult> GetProviderContact(Guid providerId)
    {
        var phone = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == providerId && u.ProviderProfile != null && u.ProviderProfile.Status == ProviderStatus.Approved)
            .Select(u => u.Phone)
            .FirstOrDefaultAsync();

        if (phone is null)
            return NotFound(new { message = "Provider contact not found." });

        return Ok(new ContactDto(phone));
    }

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
