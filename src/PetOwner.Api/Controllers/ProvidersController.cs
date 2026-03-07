using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/providers")]
public class ProvidersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IBlobService _blobService;
    private readonly IAiService _aiService;

    public ProvidersController(ApplicationDbContext db, IBlobService blobService, IAiService aiService)
    {
        _db = db;
        _blobService = blobService;
        _aiService = aiService;
    }

    [Authorize]
    [HttpPost("onboarding")]
    public async Task<IActionResult> Onboard([FromBody] ProviderOnboardingRequest request)
    {
        var userId = GetUserId();

        var existingProfile = await _db.ProviderProfiles
            .AnyAsync(p => p.UserId == userId);

        if (existingProfile)
            return Conflict(new { message = "Provider profile already exists." });

        var profile = new ProviderProfile
        {
            UserId = userId,
            Bio = request.Bio,
            HourlyRate = request.HourlyRate,
            Status = "Pending",
            IsAvailableNow = false,
        };

        _db.ProviderProfiles.Add(profile);

        var location = new PetOwner.Data.Models.Location
        {
            UserId = userId,
            GeoLocation = request.Latitude.HasValue && request.Longitude.HasValue
                ? new Point(request.Longitude.Value, request.Latitude.Value) { SRID = 4326 }
                : null,
            Address = request.Address,
        };

        _db.Locations.Add(location);

        var serviceMap = new Dictionary<string, string>
        {
            ["DogWalker"] = "Dog Walker",
            ["PetSitter"] = "Pet Sitter",
            ["Boarding"] = "Boarding",
        };

        foreach (var key in request.Services)
        {
            if (!serviceMap.TryGetValue(key, out var serviceName))
                continue;

            var service = await _db.Services
                .FirstOrDefaultAsync(s => s.Name == serviceName);

            if (service is null)
            {
                service = new Service { Name = serviceName, Category = "PetCare" };
                _db.Services.Add(service);
                await _db.SaveChangesAsync();
            }

            _db.ProviderServices.Add(new ProviderService
            {
                ProviderId = userId,
                ServiceId = service.Id,
            });
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = "Application submitted successfully." });
    }

    [HttpPost("generate-bio")]
    public async Task<IActionResult> GenerateBio([FromBody] GenerateBioRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserNotes))
            return BadRequest(new { message = "UserNotes is required." });

        var bio = await _aiService.GenerateBioAsync(request.UserNotes);
        return Ok(new GenerateBioResponse(bio));
    }

    [Authorize]
    [HttpPut("availability")]
    public async Task<IActionResult> UpdateAvailability(
        [FromBody] UpdateAvailabilityRequest request)
    {
        var userId = GetUserId();

        var profile = await _db.ProviderProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile is null)
            return NotFound(new { message = "Provider profile not found." });

        profile.IsAvailableNow = request.IsAvailable;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Availability updated.", isAvailableNow = profile.IsAvailableNow });
    }

    [Authorize]
    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto request)
    {
        var userId = GetUserId();

        var profile = await _db.ProviderProfiles
            .Include(p => p.ProviderServices)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile is null)
            return NotFound(new { message = "Provider profile not found." });

        var location = await _db.Locations
            .FirstOrDefaultAsync(l => l.UserId == userId);

        if (location is null)
            return NotFound(new { message = "Location not found." });

        profile.Bio = request.Bio;
        profile.HourlyRate = request.HourlyRate;

        if (request.AcceptsOffHoursRequests.HasValue)
            profile.AcceptsOffHoursRequests = request.AcceptsOffHoursRequests.Value;

        var serviceMap = new Dictionary<string, string>
        {
            ["DogWalker"] = "Dog Walker",
            ["PetSitter"] = "Pet Sitter",
            ["Boarding"] = "Boarding",
        };

        _db.ProviderServices.RemoveRange(profile.ProviderServices);
        foreach (var key in request.Services)
        {
            if (!serviceMap.TryGetValue(key, out var serviceName))
                continue;

            var service = await _db.Services
                .FirstOrDefaultAsync(s => s.Name == serviceName);

            if (service is null)
                continue;

            _db.ProviderServices.Add(new ProviderService
            {
                ProviderId = userId,
                ServiceId = service.Id,
            });
        }

        location.Address = request.Address;
        location.GeoLocation = new Point(request.Longitude, request.Latitude) { SRID = 4326 };

        await _db.SaveChangesAsync();

        return Ok(new { message = "Profile updated successfully." });
    }

    [Authorize]
    [HttpGet("me/schedule")]
    public async Task<IActionResult> GetMySchedule()
    {
        var userId = GetUserId();

        var hasProfile = await _db.ProviderProfiles.AnyAsync(p => p.UserId == userId);
        if (!hasProfile)
            return NotFound(new { message = "Provider profile not found." });

        var slots = await _db.AvailabilitySlots
            .AsNoTracking()
            .Where(s => s.ProviderId == userId)
            .OrderBy(s => s.DayOfWeek).ThenBy(s => s.StartTime)
            .Select(s => new AvailabilitySlotDto(s.Id, s.DayOfWeek, s.StartTime, s.EndTime))
            .ToListAsync();

        return Ok(slots);
    }

    [Authorize]
    [HttpPost("me/schedule")]
    public async Task<IActionResult> CreateSlot([FromBody] CreateAvailabilitySlotDto request)
    {
        var userId = GetUserId();

        var hasProfile = await _db.ProviderProfiles.AnyAsync(p => p.UserId == userId);
        if (!hasProfile)
            return NotFound(new { message = "Provider profile not found." });

        var error = ValidateSlotTimes(request.DayOfWeek, request.StartTime, request.EndTime);
        if (error is not null)
            return BadRequest(new { message = error });

        var hasOverlap = await _db.AvailabilitySlots.AnyAsync(s =>
            s.ProviderId == userId
            && s.DayOfWeek == request.DayOfWeek
            && s.StartTime < request.EndTime
            && request.StartTime < s.EndTime);

        if (hasOverlap)
            return Conflict(new { message = "This slot overlaps with an existing slot on the same day." });

        var slot = new AvailabilitySlot
        {
            ProviderId = userId,
            DayOfWeek = request.DayOfWeek,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
        };

        _db.AvailabilitySlots.Add(slot);
        await _db.SaveChangesAsync();

        var dto = new AvailabilitySlotDto(slot.Id, slot.DayOfWeek, slot.StartTime, slot.EndTime);
        return CreatedAtAction(nameof(GetMySchedule), dto);
    }

    [Authorize]
    [HttpPut("me/schedule/{id:guid}")]
    public async Task<IActionResult> UpdateSlot(Guid id, [FromBody] UpdateAvailabilitySlotDto request)
    {
        var userId = GetUserId();

        var slot = await _db.AvailabilitySlots
            .FirstOrDefaultAsync(s => s.Id == id && s.ProviderId == userId);

        if (slot is null)
            return NotFound(new { message = "Availability slot not found." });

        var error = ValidateSlotTimes(request.DayOfWeek, request.StartTime, request.EndTime);
        if (error is not null)
            return BadRequest(new { message = error });

        var hasOverlap = await _db.AvailabilitySlots.AnyAsync(s =>
            s.ProviderId == userId
            && s.Id != id
            && s.DayOfWeek == request.DayOfWeek
            && s.StartTime < request.EndTime
            && request.StartTime < s.EndTime);

        if (hasOverlap)
            return Conflict(new { message = "This slot overlaps with an existing slot on the same day." });

        slot.DayOfWeek = request.DayOfWeek;
        slot.StartTime = request.StartTime;
        slot.EndTime = request.EndTime;
        await _db.SaveChangesAsync();

        return Ok(new AvailabilitySlotDto(slot.Id, slot.DayOfWeek, slot.StartTime, slot.EndTime));
    }

    [Authorize]
    [HttpDelete("me/schedule/{id:guid}")]
    public async Task<IActionResult> DeleteSlot(Guid id)
    {
        var userId = GetUserId();

        var slot = await _db.AvailabilitySlots
            .FirstOrDefaultAsync(s => s.Id == id && s.ProviderId == userId);

        if (slot is null)
            return NotFound(new { message = "Availability slot not found." });

        _db.AvailabilitySlots.Remove(slot);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [Authorize]
    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not (".jpg" or ".jpeg" or ".png" or ".gif" or ".webp"))
            return BadRequest(new { message = "Only image files (jpg, png, gif, webp) are allowed." });

        using var stream = file.OpenReadStream();
        var result = await _blobService.UploadAsync(stream, file.FileName, "profiles", generateThumbnail: true);

        return Ok(new { Url = result.Url, ThumbnailUrl = result.ThumbnailUrl });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = GetUserId();

        var profile = await _db.ProviderProfiles
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.ProviderServices)
                .ThenInclude(ps => ps.Service)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile is null)
            return NotFound(new { message = "Provider profile not found." });

        var location = await _db.Locations
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.UserId == userId);

        return Ok(new ProviderMeResponse(
            profile.Status,
            profile.IsAvailableNow,
            profile.User.Name,
            profile.Bio,
            profile.HourlyRate,
            location?.Address,
            location?.GeoLocation?.Y,
            location?.GeoLocation?.X,
            profile.ProviderServices.Select(ps => ps.ServiceId).ToList(),
            profile.ProviderServices.Select(ps => ps.Service.Name).ToList(),
            profile.ProfileImageUrl,
            profile.AverageRating,
            profile.ReviewCount,
            profile.AcceptsOffHoursRequests
        ));
    }

    [Authorize]
    [HttpGet("me/earnings")]
    public async Task<IActionResult> GetEarnings()
    {
        var userId = GetUserId();

        var hasProfile = await _db.ProviderProfiles.AnyAsync(p => p.UserId == userId);
        if (!hasProfile)
            return NotFound(new { message = "Provider profile not found." });

        var payments = await _db.Payments
            .AsNoTracking()
            .Where(p => p.ServiceRequest.ProviderId == userId)
            .ToListAsync();

        var captured = payments.Where(p => p.Status == "Captured").ToList();
        var pending = payments.Where(p => p.Status == "Authorized").ToList();

        var totalEarned = captured.Sum(p => p.Amount);
        var platformFees = captured.Sum(p => p.PlatformFee);
        var pendingAmount = pending.Sum(p => p.Amount - p.PlatformFee);

        return Ok(new EarningsSummaryDto(
            totalEarned,
            platformFees,
            totalEarned - platformFees,
            captured.Count,
            pending.Count,
            pendingAmount));
    }

    [Authorize]
    [HttpGet("me/earnings/transactions")]
    public async Task<IActionResult> GetEarningsTransactions()
    {
        var userId = GetUserId();

        var transactions = await _db.Payments
            .AsNoTracking()
            .Where(p => p.ServiceRequest.ProviderId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new EarningsTransactionDto(
                p.Id,
                p.ServiceRequestId,
                p.ServiceRequest.PetOwner.Name,
                p.ServiceRequest.Pet != null ? p.ServiceRequest.Pet.Name : null,
                p.Amount,
                p.PlatformFee,
                p.Amount - p.PlatformFee,
                p.Status,
                p.CreatedAt,
                p.CapturedAt))
            .Take(50)
            .ToListAsync();

        return Ok(transactions);
    }

    [Authorize]
    [HttpGet("me/stripe-connect")]
    public async Task<IActionResult> GetStripeConnectStatus()
    {
        var userId = GetUserId();

        var profile = await _db.ProviderProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile is null)
            return NotFound(new { message = "Provider profile not found." });

        return Ok(new StripeConnectStatusDto(
            !string.IsNullOrEmpty(profile.StripeConnectAccountId),
            profile.StripeConnectAccountId));
    }

    [Authorize]
    [HttpGet("me/stats")]
    public async Task<IActionResult> GetStats()
    {
        var userId = GetUserId();
        var profile = await _db.ProviderProfiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Status == "Approved");
        if (profile is null)
            return NotFound(new { message = "Provider profile not found." });

        var allRequests = await _db.ServiceRequests
            .AsNoTracking()
            .Where(sr => sr.ProviderId == userId)
            .Select(sr => new { sr.Id, sr.Status, sr.TotalPrice, sr.ScheduledStart, sr.ScheduledEnd, sr.CreatedAt,
                PetOwnerName = sr.PetOwner.Name, PetName = sr.Pet != null ? sr.Pet.Name : null,
                ServiceName = sr.Service != null ? sr.Service.Name : null })
            .ToListAsync();

        var total = allRequests.Count;
        var completed = allRequests.Count(r => r.Status == "Completed");
        var pending = allRequests.Count(r => r.Status == "Pending");
        var cancelled = allRequests.Count(r => r.Status == "Cancelled");
        var completionRate = total > 0 ? Math.Round((decimal)completed / total * 100, 1) : 0;

        var totalEarnings = allRequests.Where(r => r.Status == "Completed" && r.TotalPrice.HasValue).Sum(r => r.TotalPrice!.Value);
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var thisMonth = allRequests.Where(r => r.CreatedAt >= monthStart).ToList();
        var monthlyEarnings = thisMonth.Where(r => r.Status == "Completed" && r.TotalPrice.HasValue).Sum(r => r.TotalPrice!.Value);

        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var todaySchedule = allRequests
            .Where(r => r.ScheduledStart.HasValue && r.ScheduledStart.Value.Date == today && r.Status is "Accepted" or "Completed")
            .OrderBy(r => r.ScheduledStart)
            .Select(r => new TodayScheduleDto(
                r.Id, r.PetOwnerName, r.PetName,
                $"{r.ScheduledStart!.Value:HH:mm} – {(r.ScheduledEnd.HasValue ? r.ScheduledEnd.Value.ToString("HH:mm") : "?")}",
                r.Status))
            .ToList();

        var upcoming = allRequests
            .Where(r => r.ScheduledStart.HasValue && r.ScheduledStart.Value >= now && r.Status is "Pending" or "Accepted")
            .OrderBy(r => r.ScheduledStart)
            .Take(10)
            .Select(r => new UpcomingBookingDto(
                r.Id, r.PetOwnerName, r.PetName, r.ServiceName, r.ScheduledStart, r.ScheduledEnd, r.TotalPrice, r.Status))
            .ToList();

        return Ok(new ProviderStatsDto(
            total, completed, pending, cancelled, completionRate,
            totalEarnings, monthlyEarnings, thisMonth.Count,
            (decimal)(profile.AverageRating ?? 0), profile.ReviewCount,
            upcoming, todaySchedule
        ));
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private static string? ValidateSlotTimes(int dayOfWeek, TimeSpan start, TimeSpan end)
    {
        if (dayOfWeek is < 0 or > 6)
            return "DayOfWeek must be between 0 (Sunday) and 6 (Saturday).";

        if (start >= end)
            return "StartTime must be before EndTime.";

        return null;
    }
}
