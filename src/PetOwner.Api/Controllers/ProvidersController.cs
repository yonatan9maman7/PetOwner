using System.Globalization;
using System.Security.Claims;
using System.Text;
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
[Route("api/providers")]
public class ProvidersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IBlobService _blobService;
    private readonly IGeminiAiService _aiService;
    private readonly ITokenService _tokenService;
    private readonly INotificationService _notifications;
    private readonly IProviderShareCardService _shareCard;

    public ProvidersController(
        ApplicationDbContext db,
        IBlobService blobService,
        IGeminiAiService aiService,
        ITokenService tokenService,
        INotificationService notifications,
        IProviderShareCardService shareCard)
    {
        _db = db;
        _blobService = blobService;
        _aiService = aiService;
        _tokenService = tokenService;
        _notifications = notifications;
        _shareCard = shareCard;
    }

    [Authorize]
    [HttpPost("apply")]
    public async Task<IActionResult> Apply([FromBody] ProviderApplicationRequest request)
    {
        var userId = GetUserId();

        if (request.Type == ProviderType.Business)
        {
            if (string.IsNullOrWhiteSpace(request.BusinessName))
                return BadRequest(new { message = "BusinessName is required for Business providers." });
            if (string.IsNullOrWhiteSpace(request.City) || string.IsNullOrWhiteSpace(request.Street) || string.IsNullOrWhiteSpace(request.BuildingNumber))
                return BadRequest(new { message = "Full address (City, Street, BuildingNumber) is required for Business providers." });
        }

        var existingProfile = await _db.ProviderProfiles
            .AnyAsync(p => p.UserId == userId);

        if (existingProfile)
            return BadRequest(new { message = "You already have a provider application on file." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
            return NotFound(new { message = "User not found or invalid token." });

        var phoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber)
            ? user.Phone
            : request.PhoneNumber.Trim();
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return BadRequest(new { message = "Phone number is required. Add it to your account or include phoneNumber in the application." });

        user.Role = "Provider";

        var displayName = request.Type == ProviderType.Business
            ? request.BusinessName!.Trim()
            : user.Name;

        var selectedServiceTypes = request.SelectedServices.Select(s => s.ServiceType).ToList();
        var dogPrefError = ValidateDogWalkingBoardingPrefs(selectedServiceTypes, request.AcceptedDogSizes, request.MaxDogsCapacity);
        if (dogPrefError is not null)
            return dogPrefError;

        var profile = new ProviderProfile
        {
            UserId = userId,
            Type = request.Type,
            BusinessName = request.Type == ProviderType.Business
                ? request.BusinessName!.Trim()
                : null,
            ServiceType = request.ServiceType,
            PhoneNumber = phoneNumber,
            WhatsAppNumber = request.WhatsAppNumber?.Trim(),
            WebsiteUrl = request.WebsiteUrl?.Trim(),
            OpeningHours = request.OpeningHours?.Trim(),
            IsEmergencyService = request.IsEmergencyService,
            Description = request.Description.Trim(),
            Bio = string.IsNullOrWhiteSpace(request.Bio)
                ? request.Description.Trim()
                : request.Bio.Trim(),
            ProfileImageUrl = request.ImageUrl?.Trim(),
            Status = ProviderStatus.Pending,
            IsAvailableNow = false,
            ReferenceName = request.ReferenceName?.Trim(),
            ReferenceContact = request.ReferenceContact?.Trim(),
            City = request.City.Trim(),
            Street = request.Street.Trim(),
            BuildingNumber = request.BuildingNumber.Trim(),
            ApartmentNumber = string.IsNullOrWhiteSpace(request.ApartmentNumber)
                ? null
                : request.ApartmentNumber.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
        };

        if (NeedsDogSizesAndCapacity(selectedServiceTypes))
        {
            profile.AcceptedDogSizes = request.AcceptedDogSizes.ToList();
            profile.MaxDogsCapacity = request.MaxDogsCapacity;
        }

        _db.ProviderProfiles.Add(profile);

        var location = new PetOwner.Data.Models.Location
        {
            UserId = userId,
            GeoLocation = new Point(request.Longitude, request.Latitude) { SRID = 4326 },
        };

        _db.Locations.Add(location);

        foreach (var svcRate in request.SelectedServices)
        {
            var rate = new ProviderServiceRate
            {
                ProviderProfileId = userId,
                Service = svcRate.ServiceType,
                Rate = svcRate.Rate,
                Unit = svcRate.PricingUnit,
            };
            _db.ProviderServiceRates.Add(rate);

            if (svcRate.Packages is { Count: > 0 })
            {
                foreach (var pkg in svcRate.Packages)
                {
                    rate.Packages.Add(new ServicePackage
                    {
                        Title = pkg.Title.Trim(),
                        Price = pkg.Price,
                        Description = string.IsNullOrWhiteSpace(pkg.Description) ? null : pkg.Description.Trim(),
                    });
                }
            }

            if (!ServiceTypeCatalog.TryGetDisplayName(svcRate.ServiceType, out var serviceName))
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

        var admins = await _db.Users
            .Where(u => u.Role == "Admin")
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var adminId in admins)
        {
            await _notifications.CreateAsync(
                adminId,
                "ProviderApplication",
                "New Provider Application",
                $"{displayName} has submitted a provider application ({request.Type}). Review it in the admin panel.",
                userId);
        }

        var newAccessToken = _tokenService.GenerateAccessToken(user);

        return Ok(new ProviderApplicationResponse(
            "Application submitted successfully. You will be notified once reviewed.",
            userId,
            newAccessToken));
    }

    [Authorize]
    [HttpPost("generate-bio")]
    public async Task<IActionResult> GenerateBio([FromBody] GenerateBioRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserNotes))
            return BadRequest(new { message = "UserNotes is required." });

        var bio = await _aiService.GenerateProfileBioAsync(request.UserNotes);
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

        if (profile.Status != ProviderStatus.Approved)
            return BadRequest(new { message = "Only approved providers can change map visibility." });

        if (profile.IsSuspended)
            return BadRequest(new { message = "Suspended providers cannot change availability." });

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
            .Include(p => p.ServiceRates)
                .ThenInclude(r => r.Packages)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile is null)
            return NotFound(new { message = "Provider profile not found." });

        var location = await _db.Locations
            .FirstOrDefaultAsync(l => l.UserId == userId);

        if (location is null)
            return NotFound(new { message = "Location not found." });

        var updateServiceTypes = request.SelectedServices.Select(s => s.ServiceType).ToList();
        var updatePrefError = ValidateDogWalkingBoardingPrefs(updateServiceTypes, request.AcceptedDogSizes, request.MaxDogsCapacity);
        if (updatePrefError is not null)
            return updatePrefError;

        profile.Bio = request.Bio;
        profile.City = request.City.Trim();
        profile.Street = request.Street.Trim();
        profile.BuildingNumber = request.BuildingNumber.Trim();
        profile.ApartmentNumber = string.IsNullOrWhiteSpace(request.ApartmentNumber)
            ? null
            : request.ApartmentNumber.Trim();

        if (request.AcceptsOffHoursRequests.HasValue)
            profile.AcceptsOffHoursRequests = request.AcceptsOffHoursRequests.Value;

        if (NeedsDogSizesAndCapacity(updateServiceTypes))
        {
            profile.AcceptedDogSizes = request.AcceptedDogSizes!.ToList();
            profile.MaxDogsCapacity = request.MaxDogsCapacity;
        }
        else
        {
            profile.AcceptedDogSizes = [];
            profile.MaxDogsCapacity = null;
        }

        _db.ProviderServiceRates.RemoveRange(profile.ServiceRates);
        _db.ProviderServices.RemoveRange(profile.ProviderServices);

        foreach (var svcRate in request.SelectedServices)
        {
            var rate = new ProviderServiceRate
            {
                ProviderProfileId = userId,
                Service = svcRate.ServiceType,
                Rate = svcRate.Rate,
                Unit = svcRate.PricingUnit,
            };
            _db.ProviderServiceRates.Add(rate);

            if (svcRate.Packages is { Count: > 0 })
            {
                foreach (var pkg in svcRate.Packages)
                {
                    rate.Packages.Add(new ServicePackage
                    {
                        Title = pkg.Title.Trim(),
                        Price = pkg.Price,
                        Description = string.IsNullOrWhiteSpace(pkg.Description) ? null : pkg.Description.Trim(),
                    });
                }
            }

            if (!ServiceTypeCatalog.TryGetDisplayName(svcRate.ServiceType, out var serviceName))
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

        var userId = GetUserId();

        using var stream = file.OpenReadStream();
        var result = await _blobService.UploadAsync(stream, file.FileName, userId, "profiles", generateThumbnail: true);

        var profile = await _db.ProviderProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile is not null)
        {
            profile.ProfileImageUrl = result.Url;
            await _db.SaveChangesAsync();
        }

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
            .Include(p => p.ServiceRates)
                .ThenInclude(r => r.Packages)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile is null)
            return NotFound(new { message = "Provider profile not found." });

        var location = await _db.Locations
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.UserId == userId);

        return Ok(new ProviderMeResponse(
            profile.Status.ToString(),
            profile.IsAvailableNow,
            profile.User.Name,
            profile.Bio,
            profile.ServiceRates.Select(r => new ServiceRateDto(
                r.Service, r.Rate, r.Unit,
                r.Packages.Select(p => new ServicePackageDto(p.Id, p.Title, p.Price, p.Description)).ToList()
            )).ToList(),
            profile.City,
            profile.Street,
            profile.BuildingNumber,
            profile.ApartmentNumber,
            location?.GeoLocation?.Y,
            location?.GeoLocation?.X,
            profile.ProviderServices.Select(ps => ps.ServiceId).ToList(),
            profile.ProviderServices.Select(ps => ps.Service.Name).ToList(),
            profile.ProfileImageUrl,
            profile.AverageRating,
            profile.ReviewCount,
            profile.AcceptsOffHoursRequests,
            profile.IsSuspended,
            profile.SuspensionReason,
            profile.Type.ToString(),
            profile.WhatsAppNumber,
            profile.WebsiteUrl,
            profile.OpeningHours,
            profile.IsEmergencyService,
            profile.AcceptedDogSizes,
            profile.MaxDogsCapacity,
            profile.PhoneNumber ?? profile.User.Phone,
            profile.BusinessName
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
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Status == ProviderStatus.Approved);
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

    // ── Provider Stats Dashboard (Booking-based) ───────────────────────────────

    /// <summary>
    /// Booking-based stats for the provider dashboard. Queries the Booking table directly so the
    /// numbers match what the user sees on "My Bookings" (vs the legacy ServiceRequest stats above).
    /// </summary>
    [Authorize]
    [HttpGet("me/booking-stats")]
    public async Task<IActionResult> GetBookingStats([FromQuery] string? range)
    {
        var userId = GetUserId();
        var profile = await _db.ProviderProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile is null)
            return NotFound(new { message = "Provider profile not found." });

        var rangeKey = StatRangeHelper.Normalize(range);
        var (start, _) = StatRangeHelper.Resolve(rangeKey);

        var baseQuery = _db.Bookings
            .AsNoTracking()
            .Where(b => b.ProviderProfileId == userId);

        if (start.HasValue)
            baseQuery = baseQuery.Where(b => b.CreatedAt >= start.Value);

        var bookings = await baseQuery
            .Select(b => new
            {
                b.Id,
                b.OwnerId,
                b.Status,
                b.PaymentStatus,
                b.TotalPrice,
                b.Service,
                b.StartDate,
                b.EndDate,
                b.CreatedAt,
                b.RespondedAt,
                b.CancelledByRole,
            })
            .ToListAsync();

        var paid = bookings.Where(b => b.PaymentStatus == PaymentStatus.Paid).ToList();
        var totalEarned = paid.Sum(b => b.TotalPrice);
        var completedCount = paid.Count;
        var totalCount = bookings.Count;

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var prevMonthStart = monthStart.AddMonths(-1);

        var monthEarned = paid.Where(b => b.CreatedAt >= monthStart).Sum(b => b.TotalPrice);
        var prevMonthEarned = paid.Where(b => b.CreatedAt >= prevMonthStart && b.CreatedAt < monthStart)
            .Sum(b => b.TotalPrice);

        var monthDeltaPct = prevMonthEarned == 0
            ? (monthEarned > 0 ? 100m : 0m)
            : Math.Round((monthEarned - prevMonthEarned) * 100m / prevMonthEarned, 1);

        // Acceptance rate = confirmed-or-completed-or-paid / (confirmed + cancelled-by-me).
        var responded = bookings.Count(b => b.Status != BookingStatus.Pending);
        var declinedByMe = bookings.Count(b =>
            b.Status == BookingStatus.Cancelled && b.CancelledByRole == BookingActorRole.Provider);
        var acceptedByMe = responded - declinedByMe;
        var acceptanceRate = responded == 0
            ? 0m
            : Math.Round((decimal)acceptedByMe * 100 / responded, 1);

        var responseTimes = bookings
            .Where(b => b.RespondedAt.HasValue)
            .Select(b => (b.RespondedAt!.Value - b.CreatedAt).TotalMinutes)
            .Where(m => m >= 0)
            .ToList();
        decimal? avgResponseMinutes = responseTimes.Count == 0
            ? null
            : Math.Round((decimal)responseTimes.Average(), 1);

        var repeatClientsCount = paid
            .GroupBy(b => b.OwnerId)
            .Count(g => g.Count() > 1);

        var hoursWorked = paid
            .Where(b => b.EndDate > b.StartDate)
            .Sum(b => (decimal)(b.EndDate - b.StartDate).TotalHours);
        hoursWorked = Math.Round(hoursWorked, 1);

        // Rough proxy: count distinct owners (we don't have per-pet reference on Booking yet).
        var uniquePetsServed = paid.Select(b => b.OwnerId).Distinct().Count();

        var cancellationByMe = totalCount == 0
            ? 0m
            : Math.Round((decimal)declinedByMe * 100 / totalCount, 1);

        // Pending payouts = paid bookings whose service hasn't ended yet (money received, work outstanding).
        var pendingPayouts = paid
            .Where(b => b.EndDate >= now)
            .Sum(b => b.TotalPrice);

        var rating = profile.AverageRating ?? 0m;
        var isStarSitter = rating >= 4.8m && completedCount >= 10 && profile.ReviewCount >= 5;

        var topService = paid
            .GroupBy(b => b.Service)
            .Select(g => new TopServiceDto(g.Key.ToString(), g.Count(), g.Sum(b => b.TotalPrice)))
            .OrderByDescending(s => s.TotalAmount)
            .FirstOrDefault();

        var achievements = await _db.AchievementsUnlocked
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.Scope == "provider")
            .OrderByDescending(a => a.UnlockedAt)
            .Select(a => new AchievementDto(a.Code, a.Scope, a.UnlockedAt))
            .ToListAsync();

        return Ok(new ProviderBookingStatsDto(
            Range: rangeKey,
            TotalEarned: totalEarned,
            MonthEarned: monthEarned,
            MonthEarnedDeltaPct: monthDeltaPct,
            CompletedBookings: completedCount,
            TotalBookings: totalCount,
            AverageRating: rating,
            ReviewCount: profile.ReviewCount,
            AcceptanceRate: acceptanceRate,
            AvgResponseMinutes: avgResponseMinutes,
            RepeatClientsCount: repeatClientsCount,
            UniquePetsServed: uniquePetsServed,
            HoursWorked: hoursWorked,
            ProfileViewCount: profile.ProfileViewCount,
            SearchAppearanceCount: profile.SearchAppearanceCount,
            CancellationRateByMe: cancellationByMe,
            PendingPayouts: pendingPayouts,
            IsStarSitter: isStarSitter,
            TopService: topService,
            Achievements: achievements));
    }

    /// <summary>
    /// Weekly earnings sparkline (default last 12 weeks). Buckets are returned oldest-first
    /// so the mobile chart can render left-to-right.
    /// </summary>
    [Authorize]
    [HttpGet("me/earnings/sparkline")]
    public async Task<IActionResult> GetEarningsSparkline([FromQuery] int weeks = 12)
    {
        var userId = GetUserId();
        var hasProfile = await _db.ProviderProfiles.AnyAsync(p => p.UserId == userId);
        if (!hasProfile) return NotFound(new { message = "Provider profile not found." });

        weeks = Math.Clamp(weeks, 4, 52);

        var now = DateTime.UtcNow;
        // Anchor on the most recent Monday so weeks align consistently across requests.
        var daysSinceMonday = ((int)now.DayOfWeek + 6) % 7;
        var thisWeekStart = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc).AddDays(-daysSinceMonday);
        var firstWeekStart = thisWeekStart.AddDays(-7 * (weeks - 1));

        var paid = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.ProviderProfileId == userId
                && b.PaymentStatus == PaymentStatus.Paid
                && b.CreatedAt >= firstWeekStart)
            .Select(b => new { b.CreatedAt, b.TotalPrice })
            .ToListAsync();

        var buckets = new List<EarningsSparklinePointDto>(weeks);
        for (int i = 0; i < weeks; i++)
        {
            var bucketStart = firstWeekStart.AddDays(7 * i);
            var bucketEnd = bucketStart.AddDays(7);
            var total = paid
                .Where(b => b.CreatedAt >= bucketStart && b.CreatedAt < bucketEnd)
                .Sum(b => b.TotalPrice);
            buckets.Add(new EarningsSparklinePointDto(bucketStart, total));
        }

        return Ok(new EarningsSparklineDto(buckets));
    }

    /// <summary>
    /// CSV export of the provider's paid bookings (for tax filings, accounting, etc.).
    /// </summary>
    [Authorize]
    [HttpGet("me/booking-stats/export.csv")]
    public async Task<IActionResult> ExportBookingStatsCsv()
    {
        var userId = GetUserId();
        var hasProfile = await _db.ProviderProfiles.AnyAsync(p => p.UserId == userId);
        if (!hasProfile) return NotFound(new { message = "Provider profile not found." });

        var rows = await LoadProviderEarningsExportRowsAsync(userId);

        var sb = new StringBuilder();
        sb.AppendLine("BookingId,CreatedAt,StartDate,EndDate,Service,OwnerName,TotalPriceILS,Status");
        foreach (var r in rows)
        {
            sb.Append(r.BookingId).Append(',')
              .Append(r.CreatedAt.ToString("o", CultureInfo.InvariantCulture)).Append(',')
              .Append(r.StartDate.ToString("o", CultureInfo.InvariantCulture)).Append(',')
              .Append(r.EndDate.ToString("o", CultureInfo.InvariantCulture)).Append(',')
              .Append(UsersController.CsvEscape(r.Service)).Append(',')
              .Append(UsersController.CsvEscape(r.OwnerName)).Append(',')
              .Append(r.TotalPriceIls.ToString(CultureInfo.InvariantCulture)).Append(',')
              .AppendLine(r.Status);
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"my-earnings-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    /// <summary>
    /// Excel export of the provider's paid bookings (same data as CSV).
    /// </summary>
    [Authorize]
    [HttpGet("me/booking-stats/export.xlsx")]
    public async Task<IActionResult> ExportBookingStatsXlsx()
    {
        var userId = GetUserId();
        var hasProfile = await _db.ProviderProfiles.AnyAsync(p => p.UserId == userId);
        if (!hasProfile) return NotFound(new { message = "Provider profile not found." });

        var rows = await LoadProviderEarningsExportRowsAsync(userId);
        var bytes = StatsExportXlsx.BuildProviderEarningsWorkbook(rows);
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"my-earnings-{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }

    /// <summary>
    /// Branded PNG share card (name, rating, service, photo, QR to public profile URL). Public for approved providers only.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("{providerId:guid}/share-card")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> GetProviderShareCard(
        Guid providerId,
        CancellationToken cancellationToken)
    {
        var bytes = await _shareCard.TryGeneratePngAsync(providerId, cancellationToken);
        if (bytes is null) return NotFound();
        return File(bytes, "image/png", $"petowner-provider-{providerId}.png");
    }

    private async Task<List<StatsExportXlsx.ProviderEarningsExportRow>> LoadProviderEarningsExportRowsAsync(Guid userId) =>
        await _db.Bookings
            .AsNoTracking()
            .Where(b => b.ProviderProfileId == userId && b.PaymentStatus == PaymentStatus.Paid)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new StatsExportXlsx.ProviderEarningsExportRow(
                b.Id,
                b.CreatedAt,
                b.StartDate,
                b.EndDate,
                b.Service.ToString(),
                b.Owner.Name,
                b.TotalPrice,
                b.Status.ToString()))
            .ToListAsync();

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private static bool NeedsDogSizesAndCapacity(IEnumerable<ServiceType> serviceTypes) =>
        serviceTypes.Any(s => s is ServiceType.DogWalking
            or ServiceType.Boarding
            or ServiceType.HouseSitting
            or ServiceType.DoggyDayCare);

    private IActionResult? ValidateDogWalkingBoardingPrefs(
        IReadOnlyCollection<ServiceType> selectedServices,
        List<DogSize>? acceptedDogSizes,
        int? maxDogsCapacity)
    {
        if (!NeedsDogSizesAndCapacity(selectedServices))
            return null;
        if (acceptedDogSizes is null || acceptedDogSizes.Count == 0)
            return BadRequest(new { message = "AcceptedDogSizes is required when offering dog walking, boarding, house sitting, or doggy day care." });
        if (maxDogsCapacity is null || maxDogsCapacity < 1)
            return BadRequest(new { message = "MaxDogsCapacity must be at least 1 when offering dog walking, boarding, house sitting, or doggy day care." });
        return null;
    }

    private static string? ValidateSlotTimes(int dayOfWeek, TimeSpan start, TimeSpan end)
    {
        if (dayOfWeek is < 0 or > 6)
            return "DayOfWeek must be between 0 (Sunday) and 6 (Saturday).";

        if (start >= end)
            return "StartTime must be before EndTime.";

        return null;
    }
}
