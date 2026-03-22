using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    private const decimal PlatformFeePercent = 0.10m;

    public AdminController(ApplicationDbContext db, DatabaseSeeder seeder)
    {
        _db = db;
        _seeder = seeder;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalUsers = await _db.Users.CountAsync();
        var totalProviders = await _db.ProviderProfiles
            .CountAsync(p => p.Status == "Approved");
        var totalBookings = await _db.Bookings.CountAsync();

        var revenueBookings = await _db.Bookings
            .Where(b => b.Status == BookingStatus.Completed ||
                        b.PaymentStatus == PaymentStatus.Paid)
            .SumAsync(b => b.TotalPrice);

        return Ok(new AdminStatsDto
        {
            TotalUsers = totalUsers,
            TotalProviders = totalProviders,
            TotalBookings = totalBookings,
            TotalPlatformRevenue = revenueBookings * PlatformFeePercent
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
                ProviderStatus = u.ProviderProfile != null ? u.ProviderProfile.Status : null
            })
            .ToListAsync();

        return Ok(users);
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
            .Where(p => p.Status == "Pending")
            .Include(p => p.User)
            .Include(p => p.ProviderServices)
                .ThenInclude(ps => ps.Service)
            .Include(p => p.ServiceRates)
            .Select(p => new
            {
                p.UserId,
                p.User.Name,
                p.User.Phone,
                p.Bio,
                ServiceRates = p.ServiceRates.Select(r => new { r.Service, r.Rate, r.Unit }).ToList(),
                p.ProfileImageUrl,
                p.User.CreatedAt,
                Address = p.Street + " " + p.BuildingNumber
                    + (p.ApartmentNumber != null ? ", Apt " + p.ApartmentNumber : "")
                    + ", " + p.City,
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

        if (profile.Status == "Approved")
            return BadRequest(new { message = "Provider is already approved." });

        profile.Status = "Approved";

        var user = await _db.Users.FindAsync(providerId);
        if (user is not null)
            user.Role = "Provider";

        await _db.SaveChangesAsync();

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

        if (user.ProviderProfile.Status == "Revoked")
            return BadRequest(new { message = "Provider status is already revoked." });

        user.ProviderProfile.Status = "Revoked";
        user.ProviderProfile.IsAvailableNow = false;
        user.Role = "Owner";

        await _db.SaveChangesAsync();

        return Ok(new { message = "Sitter status revoked successfully." });
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
}
