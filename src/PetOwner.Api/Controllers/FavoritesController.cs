using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/favorites")]
[Authorize]
public class FavoritesController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public FavoritesController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpPost("{providerProfileId:guid}/toggle")]
    public async Task<IActionResult> Toggle(Guid providerProfileId)
    {
        var userId = GetUserId();

        var providerExists = await _db.ProviderProfiles
            .AnyAsync(p => p.UserId == providerProfileId);

        if (!providerExists)
            return NotFound(new { message = "Provider not found." });

        var existing = await _db.FavoriteProviders
            .FirstOrDefaultAsync(f => f.UserId == userId && f.ProviderProfileId == providerProfileId);

        if (existing is not null)
        {
            _db.FavoriteProviders.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { isFavorited = false });
        }

        _db.FavoriteProviders.Add(new FavoriteProvider
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ProviderProfileId = providerProfileId,
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
        return Ok(new { isFavorited = true });
    }

    [HttpGet]
    public async Task<IActionResult> GetMyFavorites()
    {
        var userId = GetUserId();

        var favorites = await _db.FavoriteProviders
            .AsNoTracking()
            .Where(f => f.UserId == userId)
            .Include(f => f.ProviderProfile)
                .ThenInclude(p => p.User)
            .Include(f => f.ProviderProfile)
                .ThenInclude(p => p.ServiceRates)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new
            {
                f.ProviderProfile.UserId,
                // Explicit id for clients (same as UserId); matches map pins / profile routes.
                ProviderId = f.ProviderProfile.UserId,
                f.ProviderProfile.User.Name,
                f.ProviderProfile.ProfileImageUrl,
                f.ProviderProfile.AverageRating,
                f.ProviderProfile.ReviewCount,
                f.ProviderProfile.IsAvailableNow,
                Services = string.Join(", ", f.ProviderProfile.ServiceRates.Select(r => r.Service.ToString())),
                MinRate = f.ProviderProfile.ServiceRates.Any()
                    ? f.ProviderProfile.ServiceRates.Min(r => r.Rate)
                    : 0m,
                FavoritedAt = f.CreatedAt,
            })
            .ToListAsync();

        return Ok(favorites);
    }

    [HttpGet("check/{providerProfileId:guid}")]
    public async Task<IActionResult> Check(Guid providerProfileId)
    {
        var userId = GetUserId();

        var isFavorited = await _db.FavoriteProviders
            .AnyAsync(f => f.UserId == userId && f.ProviderProfileId == providerProfileId);

        return Ok(new { isFavorited });
    }

    [HttpGet("ids")]
    public async Task<IActionResult> GetFavoriteIds()
    {
        var userId = GetUserId();

        var ids = await _db.FavoriteProviders
            .AsNoTracking()
            .Where(f => f.UserId == userId)
            .Select(f => f.ProviderProfileId)
            .ToListAsync();

        return Ok(ids);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
