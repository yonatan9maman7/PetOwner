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
[Route("api/playdates")]
[Authorize]
public class PlaydatesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly INotificationService _notifications;

    public PlaydatesController(ApplicationDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ─── List events ─────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> ListEvents(
        [FromQuery] double? radiusKm,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var meId = GetUserId();
        var me = await _db.Users.AsNoTracking()
            .Where(u => u.Id == meId)
            .Select(u => new { u.Location, Prefs = u.PlaydatePrefs })
            .FirstAsync();

        double? meLat = me.Location?.GeoLocation?.Y;
        double? meLng = me.Location?.GeoLocation?.X;
        double maxKm = Math.Clamp(radiusKm ?? me.Prefs?.MaxDistanceKm ?? 20, 1, 200);

        var now = DateTime.UtcNow;
        var startFrom = from ?? now;
        var endTo = to ?? now.AddDays(30);

        var query = _db.PlaydateEvents.AsNoTracking()
            .Include(e => e.Rsvps)
            .Where(e => e.CancelledAt == null
                        && e.ScheduledFor >= startFrom
                        && e.ScheduledFor <= endTo);

        var raw = await query.Select(e => new
        {
            e.Id, e.HostUserId, HostName = e.Host.Name,
            e.Title, e.Description, e.LocationName,
            e.Latitude, e.Longitude, e.City, e.ScheduledFor, e.EndsAt,
            e.AllowedSpeciesCsv, e.MaxPets, e.CreatedAt,
            GoingCount = e.Rsvps.Count(r => r.Status == RsvpStatus.Going),
            MaybeCount = e.Rsvps.Count(r => r.Status == RsvpStatus.Maybe),
            MyRsvp = e.Rsvps.FirstOrDefault(r => r.UserId == meId),
        }).ToListAsync();

        var results = raw
            .Select(e =>
            {
                double? dist = null;
                if (meLat.HasValue && meLng.HasValue)
                    dist = Math.Round(HaversineKm(meLat.Value, meLng.Value, e.Latitude, e.Longitude) * 2, MidpointRounding.AwayFromZero) / 2;
                return (e, dist);
            })
            .Where(x => !meLat.HasValue || x.dist == null || x.dist <= maxKm)
            .OrderBy(x => x.e.ScheduledFor)
            .Select(x => MapEvent(x.e.Id, x.e.HostUserId, x.e.HostName, x.e.Title, x.e.Description,
                x.e.LocationName, x.e.Latitude, x.e.Longitude, x.e.City, x.e.ScheduledFor, x.e.EndsAt,
                x.e.AllowedSpeciesCsv, x.e.MaxPets, x.e.GoingCount, x.e.MaybeCount,
                x.e.MyRsvp?.Status.ToString(), x.e.MyRsvp?.PetId, x.dist, false))
            .ToList();

        return Ok(results);
    }

    // ─── Get single event ────────────────────────────────────────────────

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetEvent(Guid id)
    {
        var meId = GetUserId();
        var e = await _db.PlaydateEvents.AsNoTracking()
            .Include(ev => ev.Rsvps).ThenInclude(r => r.User)
            .Include(ev => ev.Rsvps).ThenInclude(r => r.Pet)
            .Where(ev => ev.Id == id)
            .Select(ev => new
            {
                ev.Id, ev.HostUserId, HostName = ev.Host.Name,
                ev.Title, ev.Description, ev.LocationName,
                ev.Latitude, ev.Longitude, ev.City, ev.ScheduledFor, ev.EndsAt,
                ev.AllowedSpeciesCsv, ev.MaxPets, ev.CancelledAt,
                GoingCount = ev.Rsvps.Count(r => r.Status == RsvpStatus.Going),
                MaybeCount = ev.Rsvps.Count(r => r.Status == RsvpStatus.Maybe),
                MyRsvp = ev.Rsvps.FirstOrDefault(r => r.UserId == meId),
                Attendees = ev.Rsvps.Select(r => new
                {
                    r.UserId, r.User.Name, Status = r.Status.ToString(),
                    Pet = r.Pet == null ? null : new { r.Pet.Id, r.Pet.Name, Species = r.Pet.Species.ToString(), r.Pet.Breed, r.Pet.Age, r.Pet.ImageUrl, r.Pet.DogSize, r.Pet.Sterilization, r.Pet.TagsCsv }
                }).ToList()
            })
            .FirstOrDefaultAsync();

        if (e is null) return NotFound();

        var eventDto = MapEvent(e.Id, e.HostUserId, e.HostName, e.Title, e.Description,
            e.LocationName, e.Latitude, e.Longitude, e.City, e.ScheduledFor, e.EndsAt,
            e.AllowedSpeciesCsv, e.MaxPets, e.GoingCount, e.MaybeCount,
            e.MyRsvp?.Status.ToString(), e.MyRsvp?.PetId, null, e.CancelledAt.HasValue);

        var attendees = e.Attendees.Select(a => new PlaydateAttendeeDto(
            a.UserId, a.Name, a.Status,
            a.Pet == null ? null : new PalPetDto(a.Pet.Id, a.Pet.Name, a.Pet.Species, a.Pet.Breed, a.Pet.Age, a.Pet.ImageUrl,
                a.Pet.DogSize?.ToString(), a.Pet.Sterilization == SterilizationStatus.Unknown ? null : a.Pet.Sterilization.ToString(),
                string.IsNullOrEmpty(a.Pet.TagsCsv) ? [] : [.. a.Pet.TagsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries)])))
            .ToList();

        return Ok(new PlaydateEventDetailDto(eventDto, attendees));
    }

    // ─── Create event ────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreatePlaydateEventDto dto)
    {
        var meId = GetUserId();

        var hasPet = await _db.Pets.AnyAsync(p => p.UserId == meId);
        if (!hasPet)
            return Conflict(new { code = "NoPetOnProfile", message = "Add a pet before creating events." });

        var prefs = await _db.PlaydatePrefs.FirstOrDefaultAsync(p => p.UserId == meId);
        if (prefs is null || !prefs.OptedIn)
            return Forbid();

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required." });

        if (dto.ScheduledFor <= DateTime.UtcNow)
            return BadRequest(new { message = "ScheduledFor must be in the future." });

        var e = new PlaydateEvent
        {
            Id = Guid.NewGuid(),
            HostUserId = meId,
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim(),
            LocationName = dto.LocationName.Trim(),
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            City = dto.City,
            ScheduledFor = dto.ScheduledFor,
            EndsAt = dto.EndsAt,
            AllowedSpeciesCsv = dto.AllowedSpecies?.Count > 0 ? string.Join(",", dto.AllowedSpecies) : "DOG",
            MaxPets = dto.MaxPets,
            CreatedAt = DateTime.UtcNow,
        };
        _db.PlaydateEvents.Add(e);
        await _db.SaveChangesAsync();

        _ = FanOutNewEventAsync(e.Id, meId, e);

        var result = MapEvent(e.Id, e.HostUserId, "", e.Title, e.Description,
            e.LocationName, e.Latitude, e.Longitude, e.City, e.ScheduledFor, e.EndsAt,
            e.AllowedSpeciesCsv, e.MaxPets, 0, 0, null, null, null, false);
        return Created($"/api/playdates/{e.Id}", result);
    }

    // ─── RSVP ────────────────────────────────────────────────────────────

    [HttpPost("{id:guid}/rsvp")]
    public async Task<IActionResult> Rsvp(Guid id, [FromBody] RsvpDto dto)
    {
        var meId = GetUserId();

        var hasPet = await _db.Pets.AnyAsync(p => p.UserId == meId);
        if (!hasPet)
            return Conflict(new { code = "NoPetOnProfile", message = "Add a pet before RSVPing." });

        if (!Enum.TryParse<RsvpStatus>(dto.Status, true, out var status))
            return BadRequest(new { message = "Invalid status." });

        var e = await _db.PlaydateEvents
            .Include(ev => ev.Rsvps)
            .FirstOrDefaultAsync(ev => ev.Id == id);
        if (e is null || e.CancelledAt.HasValue) return NotFound();

        var existing = e.Rsvps.FirstOrDefault(r => r.UserId == meId);
        bool wasGoing = existing?.Status == RsvpStatus.Going;

        if (existing is null)
        {
            e.Rsvps.Add(new PlaydateRsvp
            {
                EventId = id, UserId = meId, PetId = dto.PetId, Status = status,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            existing.Status = status;
            existing.PetId = dto.PetId;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        if (!wasGoing && status == RsvpStatus.Going && meId != e.HostUserId)
        {
            var meName = await _db.Users.Where(u => u.Id == meId).Select(u => u.Name).FirstAsync();
            await _notifications.CreateAsync(e.HostUserId, "playdate_rsvp",
                $"{meName} is going to {e.Title}",
                $"{meName} has RSVPed Going to your event.", e.Id);
        }

        return NoContent();
    }

    // ─── Cancel event ────────────────────────────────────────────────────

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> CancelEvent(Guid id, [FromBody] CancelEventDto? dto)
    {
        var meId = GetUserId();
        var e = await _db.PlaydateEvents
            .Include(ev => ev.Rsvps)
            .FirstOrDefaultAsync(ev => ev.Id == id);
        if (e is null) return NotFound();
        if (e.HostUserId != meId) return Forbid();
        if (e.CancelledAt.HasValue) return NoContent();

        e.CancelledAt = DateTime.UtcNow;
        e.CancellationReason = dto?.Reason;
        await _db.SaveChangesAsync();

        var goingUserIds = e.Rsvps
            .Where(r => r.Status == RsvpStatus.Going || r.Status == RsvpStatus.Maybe)
            .Select(r => r.UserId)
            .Where(uid => uid != meId)
            .ToList();

        foreach (var uid in goingUserIds)
            await _notifications.CreateAsync(uid, "playdate_cancelled",
                $"{e.Title} was cancelled",
                dto?.Reason ?? "The host has cancelled this event.", e.Id);

        return NoContent();
    }

    // ─── Comments ────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/comments")]
    public async Task<IActionResult> GetComments(Guid id)
    {
        var comments = await _db.PlaydateEventComments.AsNoTracking()
            .Where(c => c.EventId == id)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new PlaydateCommentDto(c.Id, c.UserId, c.User.Name, c.Content, c.CreatedAt))
            .ToListAsync();
        return Ok(comments);
    }

    [HttpPost("{id:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] CreatePlaydateCommentDto dto)
    {
        var meId = GetUserId();
        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Content required." });

        var e = await _db.PlaydateEvents.FirstOrDefaultAsync(ev => ev.Id == id);
        if (e is null || e.CancelledAt.HasValue) return NotFound();

        var c = new PlaydateEventComment
        {
            Id = Guid.NewGuid(),
            EventId = id, UserId = meId,
            Content = dto.Content.Trim(),
            CreatedAt = DateTime.UtcNow,
        };
        _db.PlaydateEventComments.Add(c);
        await _db.SaveChangesAsync();

        var meName = await _db.Users.Where(u => u.Id == meId).Select(u => u.Name).FirstAsync();

        // notify host and previous commenters
        var notifyIds = new HashSet<Guid> { e.HostUserId };
        var prevCommenters = await _db.PlaydateEventComments.AsNoTracking()
            .Where(x => x.EventId == id && x.UserId != meId)
            .Select(x => x.UserId).Distinct().ToListAsync();
        foreach (var uid in prevCommenters) notifyIds.Add(uid);
        notifyIds.Remove(meId);

        foreach (var uid in notifyIds)
            await _notifications.CreateAsync(uid, "playdate_comment",
                $"New comment on {e.Title}", $"{meName}: {dto.Content.Trim()}", id);

        return Created("", new PlaydateCommentDto(c.Id, c.UserId, meName, c.Content, c.CreatedAt));
    }

    [HttpDelete("comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteComment(Guid commentId)
    {
        var meId = GetUserId();
        var c = await _db.PlaydateEventComments
            .Include(x => x.Event)
            .FirstOrDefaultAsync(x => x.Id == commentId);
        if (c is null) return NotFound();
        if (c.UserId != meId && c.Event.HostUserId != meId) return Forbid();
        _db.PlaydateEventComments.Remove(c);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private async Task FanOutNewEventAsync(Guid eventId, Guid hostId, PlaydateEvent e)
    {
        try
        {
            var (latDiff, lngDiff) = BoundingBox(e.Latitude, 10);
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            var nearby = await _db.Users.AsNoTracking()
                .Where(u => u.Id != hostId && u.IsActive
                            && u.PlaydatePrefs != null && u.PlaydatePrefs.OptedIn
                            && u.PlaydatePrefs.LastActiveAt >= thirtyDaysAgo
                            && (u.NotificationPrefs == null || u.NotificationPrefs.Community)
                            && u.Location != null && u.Location.GeoLocation != null
                            && u.Location.GeoLocation.Y >= e.Latitude - latDiff
                            && u.Location.GeoLocation.Y <= e.Latitude + latDiff
                            && u.Location.GeoLocation.X >= e.Longitude - lngDiff
                            && u.Location.GeoLocation.X <= e.Longitude + lngDiff)
                .Select(u => u.Id).Take(50).ToListAsync();

            var hostName = await _db.Users.Where(u => u.Id == hostId).Select(u => u.Name).FirstAsync();
            foreach (var uid in nearby)
                await _notifications.CreateAsync(uid, "playdate_event_new",
                    $"New playdate near you: {e.Title}",
                    $"{hostName} is organizing a playdate at {e.LocationName}.", eventId);
        }
        catch { }
    }

    private static PlaydateEventDto MapEvent(
        Guid id, Guid hostUserId, string hostUserName, string title, string? desc,
        string locationName, double lat, double lng, string? city,
        DateTime scheduledFor, DateTime? endsAt, string allowedSpeciesCsv, int? maxPets,
        int goingCount, int maybeCount, string? myRsvpStatus, Guid? myRsvpPetId,
        double? distanceKm, bool isCancelled) => new(
        id, hostUserId, hostUserName, title, desc, locationName, lat, lng, city,
        scheduledFor, endsAt,
        string.IsNullOrEmpty(allowedSpeciesCsv) ? [] : [.. allowedSpeciesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries)],
        maxPets, goingCount, maybeCount, myRsvpStatus, myRsvpPetId, distanceKm, isCancelled);

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

public record CancelEventDto(string? Reason);
