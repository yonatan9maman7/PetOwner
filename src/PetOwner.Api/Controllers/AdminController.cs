using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.Services;
using PetOwner.Data;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly DatabaseSeeder _seeder;

    public AdminController(ApplicationDbContext db, DatabaseSeeder seeder)
    {
        _db = db;
        _seeder = seeder;
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingProviders()
    {
        var pending = await _db.ProviderProfiles
            .Where(p => p.Status == "Pending")
            .Include(p => p.User)
            .Include(p => p.ProviderServices)
                .ThenInclude(ps => ps.Service)
            .Select(p => new
            {
                p.UserId,
                p.User.Name,
                p.User.Phone,
                p.Bio,
                p.HourlyRate,
                p.ProfileImageUrl,
                p.User.CreatedAt,
                Address = _db.Locations
                    .Where(l => l.UserId == p.UserId)
                    .Select(l => l.Address)
                    .FirstOrDefault(),
                Services = p.ProviderServices.Select(ps => ps.Service.Name).ToList()
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
        var count = await _seeder.SeedProvidersAsync();
        return Ok(new { message = $"Successfully seeded {count} dummy providers." });
    }
}
