using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;
using System.Security.Claims;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/pals")]
[Authorize]
public class PalsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly INotificationService _notifications;

    public PalsController(ApplicationDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ─── Prefs ───────────────────────────────────────────────────────────

    [HttpGet("me/prefs")]
    public async Task<IActionResult> GetMyPrefs()
    {
        var meId = GetUserId();

        var prefs = await _db.PlaydatePrefs.FirstOrDefaultAsync(p => p.UserId == meId);
        if (prefs is null)
        {
            prefs = new PlaydatePrefs
            {
                UserId = meId,
                OptedIn = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow,
            };
            _db.PlaydatePrefs.Add(prefs);
            await _db.SaveChangesAsync();
        }

        var isProvider = await _db.ProviderProfiles.AnyAsync(p => p.UserId == meId);
        var hasPet = await _db.Pets.AnyAsync(p => p.UserId == meId);

        return Ok(MapPrefs(prefs, isProvider, hasPet));
    }

    [HttpPut("me/prefs")]
    public async Task<IActionResult> UpdateMyPrefs([FromBody] UpdatePlaydatePrefsDto dto)
    {
        var meId = GetUserId();

        if (dto.OptedIn)
        {
            var hasPet = await _db.Pets.AnyAsync(p => p.UserId == meId);
            if (!hasPet)
                return Conflict(new { code = "NoPetOnProfile", message = "Add a pet before joining Pals." });
        }

        var prefs = await _db.PlaydatePrefs.FirstOrDefaultAsync(p => p.UserId == meId);
        if (prefs is null)
        {
            prefs = new PlaydatePrefs { UserId = meId, CreatedAt = DateTime.UtcNow };
            _db.PlaydatePrefs.Add(prefs);
        }

        prefs.OptedIn = dto.OptedIn;
        prefs.MaxDistanceKm = Math.Clamp(dto.MaxDistanceKm, 1, 50);
        prefs.Bio = dto.Bio?.Trim().Length > 280 ? dto.Bio.Trim()[..280] : dto.Bio?.Trim();
        if (dto.PreferredSpecies != null)
            prefs.PreferredSpeciesCsv = string.Join(",", dto.PreferredSpecies);
        if (dto.PreferredDogSizes != null)
            prefs.PreferredDogSizesCsv = string.Join(",", dto.PreferredDogSizes);
        if (dto.IncludeAsProvider.HasValue)
            prefs.IncludeAsProvider = dto.IncludeAsProvider.Value;
        prefs.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var isProvider = await _db.ProviderProfiles.AnyAsync(p => p.UserId == meId);
        var hasPet2 = await _db.Pets.AnyAsync(p => p.UserId == meId);
        return Ok(MapPrefs(prefs, isProvider, hasPet2));
    }

    // ─── Nearby ──────────────────────────────────────────────────────────

    [HttpGet("nearby")]
    public async Task<IActionResult> GetNearby(
        [FromQuery] double? radiusKm,
        [FromQuery] string? species,
        [FromQuery] string? size)
    {
        var meId = GetUserId();

        var me = await _db.Users.AsNoTracking()
            .Where(u => u.Id == meId)
            .Select(u => new
            {
                u.Location,
                Prefs = u.PlaydatePrefs,
                PetCount = u.Pets.Count(),
            })
            .FirstAsync();

        if (me.PetCount == 0)
            return Conflict(new { code = "NoPetOnProfile", message = "Add a pet to use Pals." });

        if (me.Prefs is null || !me.Prefs.OptedIn)
            return Forbid();

        if (me.Location?.GeoLocation is null)
            return Conflict(new { code = "LocationRequired", message = "Set your location first." });

        var meLat = me.Location.GeoLocation.Y;
        var meLng = me.Location.GeoLocation.X;
        var maxKm = Math.Clamp(radiusKm ?? me.Prefs.MaxDistanceKm, 1, 50);
        var (latDiff, lngDiff) = BoundingBox(meLat, maxKm);
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

        var query = _db.Users.AsNoTracking()
            .Where(u => u.Id != meId
                        && u.IsActive
                        && u.PlaydatePrefs != null
                        && u.PlaydatePrefs.OptedIn
                        && u.PlaydatePrefs.LastActiveAt >= thirtyDaysAgo
                        && u.Pets.Any()
                        && (u.ProviderProfile == null || u.PlaydatePrefs.IncludeAsProvider)
                        && u.Location != null
                        && u.Location.GeoLocation != null
                        && u.Location.GeoLocation.Y >= meLat - latDiff
                        && u.Location.GeoLocation.Y <= meLat + latDiff
                        && u.Location.GeoLocation.X >= meLng - lngDiff
                        && u.Location.GeoLocation.X <= meLng + lngDiff);

        if (!string.IsNullOrWhiteSpace(species))
            query = query.Where(u => u.Pets.Any(p => p.Species.ToString() == species));

        if (!string.IsNullOrWhiteSpace(size))
        {
            var sizes = size.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => Enum.TryParse<DogSize>(s, true, out var v) ? (DogSize?)v : null)
                .Where(v => v.HasValue).Select(v => v!.Value).ToArray();
            if (sizes.Length > 0)
                query = query.Where(u => u.Pets.Any(p => p.Species == PetSpecies.Dog && p.DogSize.HasValue && sizes.Contains(p.DogSize.Value)));
        }

        var raw = await query.Select(u => new
        {
            u.Id, u.Name,
            u.PlaydatePrefs!.Bio, u.PlaydatePrefs.LastActiveAt,
            Lat = u.Location!.GeoLocation!.Y,
            Lng = u.Location.GeoLocation.X,
            Pets = u.Pets.Select(p => new { p.Id, p.Name, Species = p.Species, p.Breed, p.Age, p.ImageUrl, p.DogSize, p.Sterilization, p.TagsCsv }).ToList()
        }).Take(150).ToListAsync();

        // bump heartbeat
        var myPrefs = await _db.PlaydatePrefs.FirstAsync(p => p.UserId == meId);
        myPrefs.LastActiveAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var results = raw
            .Select(u => new { u, dist = HaversineKm(meLat, meLng, u.Lat, u.Lng) })
            .Where(x => x.dist <= maxKm)
            .OrderBy(x => x.dist)
            .Take(100)
            .Select(x => new PalDto(
                x.u.Id, x.u.Name,
                Math.Round(x.dist * 2, MidpointRounding.AwayFromZero) / 2,
                null,
                x.u.Bio,
                x.u.Pets.Select(p => MapPet(p.Id, p.Name, p.Species.ToString(), p.Breed, p.Age, p.ImageUrl, p.DogSize, p.Sterilization, p.TagsCsv)).ToList(),
                x.u.LastActiveAt))
            .ToList();

        return Ok(results);
    }

    // ─── Playdate Request ────────────────────────────────────────────────

    [HttpPost("{userId:guid}/playdate-request")]
    public async Task<IActionResult> SendPlaydateRequest(Guid userId, [FromBody] PlaydateRequestDto dto)
    {
        var meId = GetUserId();
        if (meId == userId) return BadRequest();

        var iHavePet = await _db.Pets.AnyAsync(p => p.UserId == meId);
        if (!iHavePet)
            return Conflict(new { code = "NoPetOnProfile", message = "Add a pet before sending playdate requests." });

        // Rate limit: max 5 unique playdate-request notifications sent per 24h
        var dayAgo = DateTime.UtcNow.AddHours(-24);
        var sentToday = await _db.Notifications
            .CountAsync(n => n.RelatedEntityId == meId && n.Type == "playdate_request" && n.CreatedAt >= dayAgo);
        if (sentToday >= 5)
            return StatusCode(429, new { message = "Daily limit reached." });

        var target = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId && u.IsActive
                        && u.PlaydatePrefs != null && u.PlaydatePrefs.OptedIn
                        && u.Pets.Any()
                        && (u.ProviderProfile == null || u.PlaydatePrefs.IncludeAsProvider))
            .Select(u => new { u.Id, u.Name })
            .FirstOrDefaultAsync();
        if (target is null)
            return NotFound(new { message = "User not available for playdates." });

        var meName = await _db.Users.Where(u => u.Id == meId).Select(u => u.Name).FirstAsync();

        var body = dto.Message?.Trim()
            ?? $"Hi {target.Name.Split(' ')[0]}! Would our pets like to meet for a playdate? 🐾";

        await _notifications.CreateAsync(
            target.Id,
            "playdate_request",
            $"{meName} wants a playdate",
            body,
            meId);  // RelatedEntityId = sender's ID for rate-limit queries

        return Ok(new PlaydateRequestResponse(target.Id, target.Name, body));
    }

    // ─── Live Beacons ────────────────────────────────────────────────────

    [HttpPost("beacons")]
    public async Task<IActionResult> StartBeacon([FromBody] CreateLiveBeaconDto dto)
    {
        var meId = GetUserId();

        var myPets = await _db.Pets.AsNoTracking()
            .Where(p => p.UserId == meId)
            .Select(p => new { p.Id, p.Species, p.Name, p.Breed, p.Age, p.ImageUrl, p.DogSize, p.Sterilization, p.TagsCsv })
            .ToListAsync();
        if (myPets.Count == 0)
            return Conflict(new { code = "NoPetOnProfile", message = "Add a pet before starting a beacon." });

        var prefs = await _db.PlaydatePrefs.FirstOrDefaultAsync(p => p.UserId == meId);
        if (prefs is null || !prefs.OptedIn)
            return Forbid();

        var requestedIds = dto.PetIds.Distinct().ToHashSet();
        if (requestedIds.Count == 0 || !requestedIds.All(id => myPets.Any(p => p.Id == id)))
            return BadRequest(new { message = "Invalid pet selection." });

        var duration = Math.Clamp(dto.DurationMinutes, 15, 180);
        var now = DateTime.UtcNow;

        // end any existing active beacon
        var existing = await _db.PlaydateBeacons
            .Where(b => b.UserId == meId && b.EndedAt == null && b.ExpiresAt > now)
            .ToListAsync();
        foreach (var b in existing) b.EndedAt = now;

        var beacon = new PlaydateBeacon
        {
            Id = Guid.NewGuid(),
            UserId = meId,
            PlaceName = dto.PlaceName.Trim(),
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            City = dto.City,
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(duration),
            PetIdsCsv = string.Join(",", requestedIds),
            Species = dto.Species.ToUpperInvariant(),
        };
        _db.PlaydateBeacons.Add(beacon);
        await _db.SaveChangesAsync();

        var meName = await _db.Users.Where(u => u.Id == meId).Select(u => u.Name).FirstAsync();
        var beaconPets = myPets.Where(p => requestedIds.Contains(p.Id))
            .Select(p => MapPet(p.Id, p.Name, p.Species.ToString(), p.Breed, p.Age, p.ImageUrl, p.DogSize, p.Sterilization, p.TagsCsv))
            .ToList();

        // Fire-and-forget fan-out to nearby pals
        _ = FanOutBeaconAsync(beacon.Id, meId, meName, beacon, beaconPets);

        return Ok(new LiveBeaconDto(beacon.Id, meId, meName, beacon.PlaceName,
            beacon.Latitude, beacon.Longitude, beacon.City,
            beacon.CreatedAt, beacon.ExpiresAt, beacon.Species, beaconPets, 0));
    }

    [HttpGet("beacons/active")]
    public async Task<IActionResult> GetActiveBeacons(
        [FromQuery] double? radiusKm,
        [FromQuery] string? species)
    {
        var meId = GetUserId();

        var me = await _db.Users.AsNoTracking()
            .Where(u => u.Id == meId)
            .Select(u => new { u.Location, Prefs = u.PlaydatePrefs, PetCount = u.Pets.Count() })
            .FirstAsync();

        if (me.PetCount == 0)
            return Conflict(new { code = "NoPetOnProfile", message = "Add a pet to use Pals." });

        if (me.Prefs is null || !me.Prefs.OptedIn)
            return Forbid();

        if (me.Location?.GeoLocation is null)
            return Conflict(new { code = "LocationRequired", message = "Set your location first." });

        var meLat = me.Location.GeoLocation.Y;
        var meLng = me.Location.GeoLocation.X;
        var maxKm = Math.Clamp(radiusKm ?? me.Prefs.MaxDistanceKm, 1, 50);
        var (latDiff, lngDiff) = BoundingBox(meLat, maxKm);
        var now = DateTime.UtcNow;

        var raw = await _db.PlaydateBeacons.AsNoTracking()
            .Where(b => b.UserId != meId
                        && b.EndedAt == null
                        && b.ExpiresAt > now
                        && b.Latitude >= meLat - latDiff
                        && b.Latitude <= meLat + latDiff
                        && b.Longitude >= meLng - lngDiff
                        && b.Longitude <= meLng + lngDiff
                        && (species == null || b.Species == species.ToUpperInvariant())
                        && (b.User.ProviderProfile == null || b.User.PlaydatePrefs!.IncludeAsProvider))
            .Select(b => new
            {
                b.Id, b.UserId, HostName = b.User.Name, b.PlaceName,
                b.Latitude, b.Longitude, b.City, b.CreatedAt, b.ExpiresAt, b.Species, b.PetIdsCsv,
                Pets = b.User.Pets.Select(p => new { p.Id, p.Name, Species = p.Species, p.Breed, p.Age, p.ImageUrl, p.DogSize, p.Sterilization, p.TagsCsv }).ToList()
            })
            .ToListAsync();

        var results = raw
            .Select(b => new { b, dist = HaversineKm(meLat, meLng, b.Latitude, b.Longitude) })
            .Where(x => x.dist <= maxKm)
            .OrderBy(x => x.dist)
            .Select(x =>
            {
                var petIds = x.b.PetIdsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => Guid.TryParse(s, out var g) ? g : (Guid?)null)
                    .Where(g => g.HasValue).Select(g => g!.Value).ToHashSet();
                var pets = x.b.Pets
                    .Where(p => petIds.Count == 0 || petIds.Contains(p.Id))
                    .Select(p => MapPet(p.Id, p.Name, p.Species.ToString(), p.Breed, p.Age, p.ImageUrl, p.DogSize, p.Sterilization, p.TagsCsv))
                    .ToList();
                var roundedDist = Math.Round(x.dist * 2, MidpointRounding.AwayFromZero) / 2;
                return new LiveBeaconDto(x.b.Id, x.b.UserId, x.b.HostName, x.b.PlaceName,
                    x.b.Latitude, x.b.Longitude, x.b.City,
                    x.b.CreatedAt, x.b.ExpiresAt, x.b.Species, pets, roundedDist);
            })
            .ToList();

        return Ok(results);
    }

    [HttpDelete("beacons/{id:guid}")]
    public async Task<IActionResult> EndBeacon(Guid id)
    {
        var meId = GetUserId();
        var beacon = await _db.PlaydateBeacons.FirstOrDefaultAsync(b => b.Id == id);
        if (beacon is null) return NotFound();
        if (beacon.UserId != meId) return Forbid();
        if (beacon.EndedAt is not null) return NoContent();
        beacon.EndedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private async Task FanOutBeaconAsync(Guid beaconId, Guid hostId, string hostName, PlaydateBeacon beacon, List<PalPetDto> pets)
    {
        try
        {
            var (latDiff, lngDiff) = BoundingBox(beacon.Latitude, 10); // notify within 10 km
            var now = DateTime.UtcNow;
            var thirtyDaysAgo = now.AddDays(-30);

            var nearby = await _db.Users.AsNoTracking()
                .Where(u => u.Id != hostId
                            && u.IsActive
                            && u.PlaydatePrefs != null && u.PlaydatePrefs.OptedIn
                            && u.PlaydatePrefs.LastActiveAt >= thirtyDaysAgo
                            && u.NotificationPrefs == null || u.NotificationPrefs!.Community
                            && u.Location != null && u.Location.GeoLocation != null
                            && u.Location.GeoLocation.Y >= beacon.Latitude - latDiff
                            && u.Location.GeoLocation.Y <= beacon.Latitude + latDiff
                            && u.Location.GeoLocation.X >= beacon.Longitude - lngDiff
                            && u.Location.GeoLocation.X <= beacon.Longitude + lngDiff)
                .Select(u => u.Id)
                .Take(50)
                .ToListAsync();

            var petName = pets.FirstOrDefault()?.Name ?? hostName;
            var title = $"{petName} & {hostName} are at {beacon.PlaceName} now!";
            var msg = $"Tap to say hi · {(int)(beacon.ExpiresAt - now).TotalMinutes}m left";

            foreach (var uid in nearby)
                await _notifications.CreateAsync(uid, "playdate_beacon_live", title, msg, beaconId);
        }
        catch { /* background fire-and-forget — log swallowed intentionally */ }
    }

    private static PlaydatePrefsDto MapPrefs(PlaydatePrefs p, bool isProvider, bool hasPet) => new(
        p.OptedIn, p.MaxDistanceKm, p.Bio,
        string.IsNullOrEmpty(p.PreferredSpeciesCsv) ? [] : [.. p.PreferredSpeciesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries)],
        string.IsNullOrEmpty(p.PreferredDogSizesCsv) ? [] : [.. p.PreferredDogSizesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries)],
        p.IncludeAsProvider, isProvider, hasPet, p.LastActiveAt == default ? null : p.LastActiveAt);

    private static PalPetDto MapPet(Guid id, string name, string species, string? breed, int age, string? imageUrl,
        DogSize? dogSize, SterilizationStatus sterilization, string tagsCsv) => new(
        id, name, species, breed, age, imageUrl,
        dogSize?.ToString(),
        sterilization == SterilizationStatus.Unknown ? null : sterilization.ToString(),
        string.IsNullOrEmpty(tagsCsv) ? [] : [.. tagsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)]);

    private static (double latDiff, double lngDiff) BoundingBox(double lat, double km)
    {
        var latDiff = km / 111.0;
        var lngDiff = km / (111.0 * Math.Cos(lat * Math.PI / 180.0));
        return (latDiff, lngDiff);
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
