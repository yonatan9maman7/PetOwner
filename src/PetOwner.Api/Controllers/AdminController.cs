using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly DatabaseSeeder _seeder;
    private readonly INotificationService _notifications;
    private readonly ILogger<AdminController> _logger;
    private readonly IHostEnvironment _hostEnvironment;
    // private readonly IEmailService _emailService;
    private const decimal PlatformFeePercent = 0.10m;

    public AdminController(
        ApplicationDbContext db,
        DatabaseSeeder seeder,
        INotificationService notifications,
        ILogger<AdminController> logger,
        IHostEnvironment hostEnvironment
        // IEmailService emailService
    )
    {
        _db = db;
        _seeder = seeder;
        _notifications = notifications;
        _logger = logger;
        _hostEnvironment = hostEnvironment;
        // _emailService = emailService;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalUsers = await _db.Users.CountAsync();
        var totalPets = await _db.Pets.CountAsync();
        var totalProviders = await _db.ProviderProfiles
            .CountAsync(p => p.Status == ProviderStatus.Approved);
        var totalBookings = await _db.Bookings.CountAsync();
        var activeSOSReports = await _db.Pets
            .CountAsync(p => p.IsLost);
        var pendingProviders = await _db.ProviderProfiles
            .CountAsync(p => p.Status == ProviderStatus.Pending);

        var revenueBookings = await _db.Bookings
            .Where(b => b.Status == BookingStatus.Completed ||
                        b.PaymentStatus == PaymentStatus.Paid)
            .SumAsync(b => b.TotalPrice);

        var unreadInquiries = await _db.ContactInquiries
            .CountAsync(c => c.ReadAt == null);

        return Ok(new AdminStatsDto
        {
            TotalUsers = totalUsers,
            TotalPets = totalPets,
            TotalProviders = totalProviders,
            TotalBookings = totalBookings,
            ActiveSOSReports = activeSOSReports,
            PendingProviders = pendingProviders,
            TotalPlatformRevenue = revenueBookings * PlatformFeePercent,
            UnreadContactInquiries = unreadInquiries
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _db.Users
            .Include(u => u.ProviderProfile)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new AdminUserDto
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                Phone = u.Phone,
                Role = u.Role,
                CreatedAt = u.CreatedAt,
                IsActive = u.IsActive,
                ProviderStatus = u.ProviderProfile != null
                    ? (u.ProviderProfile.IsSuspended ? "Suspended" : u.ProviderProfile.Status.ToString())
                    : null,
                ProviderType = u.ProviderProfile != null
                    ? u.ProviderProfile.Type.ToString()
                    : null,
                WhatsAppNumber = u.ProviderProfile != null
                    ? u.ProviderProfile.WhatsAppNumber
                    : null,
                WebsiteUrl = u.ProviderProfile != null
                    ? u.ProviderProfile.WebsiteUrl
                    : null
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPatch("users/{id:guid}/role")]
    public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateRoleRequest request)
    {
        var allowedRoles = new[] { "Owner", "Provider", "Admin" };
        if (!allowedRoles.Contains(request.Role))
            return BadRequest(new { message = $"Invalid role. Allowed: {string.Join(", ", allowedRoles)}" });

        var user = await _db.Users
            .Include(u => u.ProviderProfile)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null)
            return NotFound(new { message = "User not found." });

        if (request.Role == "Provider" && user.ProviderProfile is null)
            return BadRequest(new { message = "Cannot promote to Provider without a business profile." });

        user.Role = request.Role;
        await _db.SaveChangesAsync();

        return Ok(new { message = $"User role updated to {request.Role}.", role = request.Role });
    }

    [HttpPut("users/{id:guid}/toggle-status")]
    public async Task<IActionResult> ToggleUserStatus(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { message = "User not found." });

        user.IsActive = !user.IsActive;
        await _db.SaveChangesAsync();

        return Ok(new { message = user.IsActive ? "User unblocked." : "User blocked.", isActive = user.IsActive });
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings()
    {
        var bookings = await _db.Bookings
            .Include(b => b.Owner)
            .Include(b => b.ProviderProfile)
                .ThenInclude(p => p.User)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new AdminBookingDto
            {
                Id = b.Id,
                OwnerName = b.Owner.Name,
                ProviderName = b.ProviderProfile.User.Name,
                Service = b.Service.ToString(),
                Status = b.Status.ToString(),
                TotalPrice = b.TotalPrice,
                StartDate = b.StartDate,
                CreatedAt = b.CreatedAt
            })
            .ToListAsync();

        return Ok(bookings);
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingProviders()
    {
        var pending = await _db.ProviderProfiles
            .Where(p => p.Status == ProviderStatus.Pending)
            .Include(p => p.User)
            .Include(p => p.ProviderServices)
                .ThenInclude(ps => ps.Service)
            .Include(p => p.ServiceRates)
            .Select(p => new
            {
                p.UserId,
                p.User.Name,
                p.User.Phone,
                ProviderType = p.Type.ToString(),
                p.BusinessName,
                p.PhoneNumber,
                p.WhatsAppNumber,
                p.WebsiteUrl,
                p.OpeningHours,
                p.IsEmergencyService,
                p.Description,
                p.Bio,
                ServiceRates = p.ServiceRates.Select(r => new { r.Service, r.Rate, r.Unit }).ToList(),
                p.ProfileImageUrl,
                p.User.CreatedAt,
                Address = p.Street + " " + p.BuildingNumber
                    + (p.ApartmentNumber != null ? ", Apt " + p.ApartmentNumber : "")
                    + ", " + p.City,
                p.Latitude,
                p.Longitude,
                Services = p.ProviderServices.Select(ps => ps.Service.Name).ToList(),
                p.ReferenceName,
                p.ReferenceContact,
            })
            .ToListAsync();

        return Ok(pending);
    }

    [HttpPut("approve/{providerId:guid}")]
    public async Task<IActionResult> ApproveProvider(Guid providerId)
    {
        var profile = await _db.ProviderProfiles.FindAsync(providerId);

        if (profile is null)
            return NotFound(new { message = "Provider not found." });

        if (profile.Status == ProviderStatus.Approved)
            return BadRequest(new { message = "Provider is already approved." });

        profile.Status = ProviderStatus.Approved;
        profile.IsAvailableNow = true;

        var user = await _db.Users.FindAsync(providerId);
        if (user is not null)
            user.Role = "Provider";

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(
                ex,
                "ApproveProvider: SaveChanges failed for provider {ProviderId}. Inner: {Inner}",
                providerId,
                ex.GetBaseException().Message);

            // Admin-only endpoint: surface SQL/client error so operators can fix schema (e.g. missing migration).
            var sqlHint = _hostEnvironment.IsDevelopment() ? string.Empty
                : " If this mentions an invalid column or object, apply pending EF migrations to the database.";
            var detail = ex.GetBaseException().Message + sqlHint;

            return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
            {
                Title = "Approval could not be saved",
                Detail = detail,
                Status = StatusCodes.Status500InternalServerError,
                Instance = HttpContext.Request.Path.Value,
            });
        }

        try
        {
            await _notifications.CreateAsync(
                profile.UserId,
                "Admin",
                "NOTIFICATIONS.PROVIDER_APPROVED_TITLE",
                "NOTIFICATIONS.PROVIDER_APPROVED",
                profile.UserId);
        }
        catch (Exception ex)
        {
            // Approval is already persisted — do not fail the request if push/SignalR fails.
            _logger.LogWarning(ex, "ApproveProvider: notification delivery failed for user {UserId}", profile.UserId);
        }

        return Ok(new { message = "Provider approved successfully." });
    }

    [HttpPost("users/{providerId:guid}/revoke-sitter")]
    public async Task<IActionResult> RevokeSitter(Guid providerId)
    {
        var user = await _db.Users
            .Include(u => u.ProviderProfile)
            .FirstOrDefaultAsync(u => u.Id == providerId);

        if (user is null)
            return NotFound(new { message = "User not found." });

        if (user.ProviderProfile is null)
            return BadRequest(new { message = "User is not a provider." });

        if (user.ProviderProfile.Status == ProviderStatus.Revoked)
            return BadRequest(new { message = "Provider status is already revoked." });

        user.ProviderProfile.Status = ProviderStatus.Revoked;
        user.ProviderProfile.IsAvailableNow = false;
        user.Role = "Owner";

        await _db.SaveChangesAsync();

        return Ok(new { message = "Sitter status revoked successfully." });
    }

    [HttpPost("providers/{id:guid}/suspend")]
    public async Task<IActionResult> SuspendProvider(Guid id, [FromBody] SuspendProviderRequest? request)
    {
        var user = await _db.Users
            .Include(u => u.ProviderProfile)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null)
            return NotFound(new { message = "User not found." });

        if (user.ProviderProfile is null)
            return BadRequest(new { message = "User is not a provider." });

        if (user.ProviderProfile.IsSuspended)
            return BadRequest(new { message = "Provider is already suspended." });

        user.ProviderProfile.IsSuspended = true;
        user.ProviderProfile.SuspensionReason = request?.Reason;
        user.ProviderProfile.IsAvailableNow = false;
        user.Role = "Owner";

        await _db.SaveChangesAsync();

        await _notifications.CreateAsync(
            user.Id,
            "Admin",
            "NOTIFICATIONS.ACCOUNT_SUSPENDED_TITLE",
            "NOTIFICATIONS.ACCOUNT_SUSPENDED");

        // TODO: Enable email notification once email templates are finalized
        // await _emailService.SendEmailAsync(
        //     user.Email,
        //     "Account Suspended",
        //     $"Dear {user.Name}, your provider account on PetOwner has been suspended. " +
        //     $"Reason: {request?.Reason ?? "Policy violation"}. " +
        //     "If you believe this is an error, please contact our support team.");

        return Ok(new { message = "Provider suspended successfully." });
    }

    [HttpPost("providers/{id:guid}/ban")]
    public async Task<IActionResult> BanProvider(Guid id)
    {
        var user = await _db.Users
            .Include(u => u.ProviderProfile)
                .ThenInclude(p => p!.ServiceRates)
            .Include(u => u.ProviderProfile)
                .ThenInclude(p => p!.ProviderServices)
            .Include(u => u.ProviderProfile)
                .ThenInclude(p => p!.AvailabilitySlots)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null)
            return NotFound(new { message = "User not found." });

        if (user.ProviderProfile is null)
            return BadRequest(new { message = "User is not a provider." });

        _db.ProviderServiceRates.RemoveRange(user.ProviderProfile.ServiceRates);
        _db.ProviderServices.RemoveRange(user.ProviderProfile.ProviderServices);
        _db.AvailabilitySlots.RemoveRange(user.ProviderProfile.AvailabilitySlots);
        _db.ProviderProfiles.Remove(user.ProviderProfile);

        user.Role = "Owner";

        await _db.SaveChangesAsync();

        await _notifications.CreateAsync(
            user.Id,
            "Admin",
            "NOTIFICATIONS.PROVIDER_BANNED_TITLE",
            "NOTIFICATIONS.PROVIDER_BANNED");

        // TODO: Enable email notification once email templates are finalized
        // await _emailService.SendEmailAsync(
        //     user.Email,
        //     "Provider Account Banned",
        //     $"Dear {user.Name}, your provider account on PetOwner has been permanently banned. " +
        //     "Your provider profile and all associated data have been removed. " +
        //     "If you believe this is an error, please contact our support team.");

        return Ok(new { message = "Provider banned and profile deleted." });
    }

    [HttpPost("providers/{id:guid}/reactivate")]
    public async Task<IActionResult> ReactivateProvider(Guid id)
    {
        var user = await _db.Users
            .Include(u => u.ProviderProfile)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null)
            return NotFound(new { message = "User not found." });

        if (user.ProviderProfile is null)
            return BadRequest(new { message = "User is not a provider." });

        if (!user.ProviderProfile.IsSuspended)
            return BadRequest(new { message = "Provider is not suspended." });

        user.ProviderProfile.IsSuspended = false;
        user.ProviderProfile.SuspensionReason = null;
        user.ProviderProfile.IsAvailableNow = true;
        user.Role = "Provider";

        await _db.SaveChangesAsync();

        await _notifications.CreateAsync(
            user.Id,
            "Admin",
            "NOTIFICATIONS.ACCOUNT_REACTIVATED_TITLE",
            "NOTIFICATIONS.ACCOUNT_REACTIVATED");

        return Ok(new { message = "Provider reactivated successfully." });
    }

    [HttpPost("seed-dummy-data")]
    public async Task<IActionResult> SeedDummyData()
    {
        var result = await _seeder.SeedFullDemoEcosystemAsync();
        return Ok(new
        {
            message = $"Demo ecosystem created: {result.Providers} providers, {result.Owners} owners, " +
                      $"{result.Pets} pets, {result.Bookings} bookings, {result.Reviews} reviews, " +
                      $"{result.GroupPosts} community posts, {result.SocialPosts} social posts."
        });
    }

    [HttpPost("seed-bogus-pets")]
    public async Task<IActionResult> SeedBogusPets()
    {
        var count = await _seeder.SeedBogusPetsForUsersWithoutPetsAsync();
        return Ok(new { message = count == 0 ? "No eligible users without pets." : $"Seeded {count} bogus pets.", count });
    }

    [HttpGet("pets")]
    public async Task<IActionResult> GetPets()
    {
        var pets = await _db.Pets
            .Include(p => p.User)
            .OrderByDescending(p => p.Id)
            .Select(p => new AdminPetDto
            {
                Id = p.Id,
                Name = p.Name,
                Breed = p.Breed,
                Species = p.Species.ToString(),
                Age = p.Age,
                ImageUrl = p.ImageUrl,
                OwnerName = p.User.Name,
                OwnerEmail = p.User.Email,
                OwnerId = p.UserId
            })
            .ToListAsync();

        return Ok(pets);
    }

    [HttpDelete("pets/{id:guid}")]
    public async Task<IActionResult> AdminDeletePet(Guid id)
    {
        var pet = await _db.Pets
            .Include(p => p.MedicalRecords)
            .Include(p => p.TeletriageSessions)
            .Include(p => p.Activities)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        _db.MedicalRecords.RemoveRange(pet.MedicalRecords);
        _db.TeletriageSessions.RemoveRange(pet.TeletriageSessions);
        _db.Activities.RemoveRange(pet.Activities);
        _db.Pets.Remove(pet);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Pet '{pet.Name}' deleted successfully." });
    }

    [HttpGet("inquiries")]
    public async Task<IActionResult> GetInquiries()
    {
        var inquiries = await _db.ContactInquiries
            .Include(c => c.User)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new ContactInquiryAdminDto
            {
                Id = c.Id,
                UserId = c.UserId,
                UserName = c.User.Name,
                UserEmail = c.User.Email,
                Topic = c.Topic,
                Subject = c.Subject,
                Message = c.Message,
                AppVersion = c.AppVersion,
                Platform = c.Platform,
                CreatedAt = c.CreatedAt,
                ReadAt = c.ReadAt,
            })
            .ToListAsync();

        return Ok(inquiries);
    }

    [HttpPatch("inquiries/{id:guid}/read")]
    public async Task<IActionResult> MarkInquiryRead(Guid id)
    {
        var inquiry = await _db.ContactInquiries.FindAsync(id);
        if (inquiry is null)
            return NotFound(new { message = "Inquiry not found." });

        inquiry.ReadAt ??= DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Inquiry marked as read." });
    }

    [HttpPost("clear-sos")]
    public async Task<IActionResult> ClearAllSOSReports()
    {
        var sosReports = await _db.TeletriageSessions
            .Where(t => t.IsEmergency)
            .ToListAsync();

        if (sosReports.Count == 0)
            return Ok(new { message = "No active SOS reports to clear.", count = 0 });

        _db.TeletriageSessions.RemoveRange(sosReports);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Cleared {sosReports.Count} SOS reports.", count = sosReports.Count });
    }
}
