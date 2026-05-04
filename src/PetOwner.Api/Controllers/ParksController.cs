using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/parks")]
public class ParksController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly DatabaseSeeder _seeder;
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ParksController> _logger;

    public ParksController(
        ApplicationDbContext db,
        DatabaseSeeder seeder,
        IHttpClientFactory httpFactory,
        IConfiguration configuration,
        ILogger<ParksController> logger)
    {
        _db = db;
        _seeder = seeder;
        _httpFactory = httpFactory;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>Active dog parks for Explore map (no Google Places calls from clients).</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<DogParkDto>>> GetActiveParks(CancellationToken cancellationToken)
    {
        var list = await _db.DogParks
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Name)
            .Select(p => new DogParkDto(p.Id, p.Name, p.Address, p.Latitude, p.Longitude, p.IsActive))
            .ToListAsync(cancellationToken);

        return Ok(list);
    }

    /// <summary>
    /// Admin: import / refresh dog parks from Google Places Text Search (Tel Aviv / Gush Dan area).
    /// When <c>GooglePlaces:ApiKey</c> is empty, only ensures the static seed catalog exists.
    /// </summary>
    [HttpPost("sync-google")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SyncGoogleDogParks(CancellationToken cancellationToken)
    {
        var key = _configuration["GooglePlaces:ApiKey"]?.Trim();
        if (string.IsNullOrEmpty(key))
        {
            var seedAdds = await _seeder.EnsureDogParksSeededAsync();
            return Ok(new
            {
                message = "Google Places API key is not configured. Static catalog rows were ensured.",
                imported = 0,
                updated = 0,
                seedAdds,
                usedSeedFallback = true,
            });
        }

        try
        {
            var (imported, updated) = await ImportFromGooglePlacesAsync(key, cancellationToken);
            return Ok(new
            {
                message = $"Google sync finished. Imported {imported}, updated {updated}.",
                imported,
                updated,
                seedAdds = 0,
                usedSeedFallback = false,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Dog park Google sync failed");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    private async Task<(int Imported, int Updated)> ImportFromGooglePlacesAsync(string apiKey, CancellationToken ct)
    {
        var client = _httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(60);

        var queries = new[]
        {
            "dog parks Tel Aviv Israel",
            "גינות כלבים תל אביב",
            "dog parks Ramat Gan Israel",
        };

        var seenPlaceIds = new HashSet<string>(StringComparer.Ordinal);
        var imported = 0;
        var updated = 0;

        foreach (var query in queries)
        {
            var url =
                "https://maps.googleapis.com/maps/api/place/textsearch/json?" +
                $"query={Uri.EscapeDataString(query)}&region=il&language=he&key={Uri.EscapeDataString(apiKey)}";

            using var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var root = doc.RootElement;

            var status = root.GetProperty("status").GetString() ?? "";
            if (status is not ("OK" or "ZERO_RESULTS"))
            {
                var err = root.TryGetProperty("error_message", out var em) ? em.GetString() : status;
                throw new InvalidOperationException($"Google Places error: {err}");
            }

            if (!root.TryGetProperty("results", out var results))
                continue;

            foreach (var el in results.EnumerateArray())
            {
                if (!el.TryGetProperty("place_id", out var pidEl))
                    continue;
                var placeId = pidEl.GetString();
                if (string.IsNullOrWhiteSpace(placeId) || !seenPlaceIds.Add(placeId))
                    continue;

                if (!el.TryGetProperty("name", out var nameEl))
                    continue;
                var name = Clamp(nameEl.GetString() ?? "Dog park", 200);

                if (!el.TryGetProperty("geometry", out var geom) ||
                    !geom.TryGetProperty("location", out var loc) ||
                    !loc.TryGetProperty("lat", out var latEl) ||
                    !loc.TryGetProperty("lng", out var lngEl))
                    continue;

                var lat = latEl.GetDouble();
                var lng = lngEl.GetDouble();

                var address = "";
                if (el.TryGetProperty("formatted_address", out var fa))
                    address = fa.GetString() ?? "";
                else if (el.TryGetProperty("vicinity", out var vic))
                    address = vic.GetString() ?? "";
                address = Clamp(address, 500);
                if (string.IsNullOrWhiteSpace(address))
                    address = name;

                if (!IsLikelyDogPark(el, name))
                    continue;

                var existing = await _db.DogParks
                    .FirstOrDefaultAsync(p => p.ExternalPlaceId == placeId, ct);

                if (existing is not null)
                {
                    existing.Name = name;
                    existing.Address = address;
                    existing.Latitude = lat;
                    existing.Longitude = lng;
                    existing.IsActive = true;
                    updated++;
                }
                else
                {
                    _db.DogParks.Add(new DogPark
                    {
                        Id = Guid.NewGuid(),
                        ExternalPlaceId = placeId,
                        Name = name,
                        Address = address,
                        Latitude = lat,
                        Longitude = lng,
                        IsActive = true,
                    });
                    imported++;
                }

                if (imported + updated >= 80)
                    break;
            }

            if (imported + updated >= 80)
                break;
        }

        if (imported > 0 || updated > 0)
            await _db.SaveChangesAsync(ct);

        return (imported, updated);
    }

    private static bool IsLikelyDogPark(JsonElement result, string name)
    {
        var lower = name.ToLowerInvariant();
        if (lower.Contains("dog") || lower.Contains("park") || lower.Contains("גינ") || lower.Contains("כלב"))
            return true;

        if (!result.TryGetProperty("types", out var types) || types.ValueKind != JsonValueKind.Array)
            return false;

        foreach (var t in types.EnumerateArray())
        {
            var s = t.GetString();
            if (s is "park" or "point_of_interest" or "establishment")
                return true;
        }

        return false;
    }

    private static string Clamp(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
