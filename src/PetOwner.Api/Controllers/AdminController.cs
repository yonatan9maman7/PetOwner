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

    [HttpPost("seed-dummy-data")]
    public async Task<IActionResult> SeedDummyData()
    {
        var count = await _seeder.SeedProvidersAsync();
        return Ok(new { message = $"Successfully seeded {count} dummy providers." });
    }
}
