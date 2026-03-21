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
[Route("api/teletriage")]
[Authorize]
public class TeletriageController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGeminiAiService _aiService;

    public TeletriageController(ApplicationDbContext db, IGeminiAiService aiService)
    {
        _db = db;
        _aiService = aiService;
    }

    [HttpPost("assess")]
    public async Task<IActionResult> Assess([FromBody] TeletriageRequestDto request)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(request.Symptoms))
            return BadRequest(new { message = "Please describe your pet's symptoms." });

        var pet = await _db.Pets.AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.PetId && p.UserId == userId);
        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        var recentRecords = await _db.MedicalRecords
            .AsNoTracking()
            .Where(m => m.PetId == pet.Id)
            .OrderByDescending(m => m.Date)
            .Take(5)
            .Select(m => $"{m.Type}: {m.Title} ({m.Date:yyyy-MM-dd})")
            .ToListAsync();

        var medicalHistory = recentRecords.Count > 0 ? string.Join("; ", recentRecords) : null;

        var petDetails = $"Pet: {pet.Name}, a {pet.Age}-year-old {pet.Species}."
            + (medicalHistory != null ? $"\nMedical history: {medicalHistory}" : "");

        var result = await _aiService.AssessTeletriageAsync(
            petDetails, request.Symptoms.Trim(), request.ImageBase64);

        var session = new TeletriageSession
        {
            PetId = pet.Id,
            UserId = userId,
            Symptoms = request.Symptoms.Trim(),
            PetContext = $"{pet.Species}, {pet.Age}y" + (medicalHistory != null ? $" | History: {medicalHistory}" : ""),
            Severity = result.Severity,
            Assessment = result.Assessment,
            Recommendations = result.Recommendations,
            IsEmergency = result.IsEmergency,
        };

        _db.TeletriageSessions.Add(session);
        await _db.SaveChangesAsync();

        return Ok(new TeletriageResponseDto(
            session.Id, session.PetId, pet.Name, session.Severity,
            session.Assessment, session.Recommendations, session.IsEmergency, session.CreatedAt));
    }

    [HttpGet("history/{petId:guid}")]
    public async Task<IActionResult> GetHistory(Guid petId)
    {
        var userId = GetUserId();

        var pet = await _db.Pets.AsNoTracking().FirstOrDefaultAsync(p => p.Id == petId && p.UserId == userId);
        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        var sessions = await _db.TeletriageSessions
            .AsNoTracking()
            .Where(t => t.PetId == petId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(20)
            .Select(t => new TeletriageHistoryDto(
                t.Id, t.PetId, pet.Name, t.Symptoms, t.Severity,
                t.Assessment, t.Recommendations, t.IsEmergency, t.CreatedAt))
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSession(Guid id)
    {
        var userId = GetUserId();

        var session = await _db.TeletriageSessions
            .AsNoTracking()
            .Include(t => t.Pet)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (session is null)
            return NotFound(new { message = "Teletriage session not found." });

        return Ok(new TeletriageHistoryDto(
            session.Id, session.PetId, session.Pet.Name, session.Symptoms,
            session.Severity, session.Assessment, session.Recommendations,
            session.IsEmergency, session.CreatedAt));
    }

    [HttpGet("nearby-vets")]
    public async Task<IActionResult> GetNearbyVets([FromQuery] double latitude, [FromQuery] double longitude, [FromQuery] int maxResults = 5)
    {
        var userPoint = new Point(longitude, latitude) { SRID = 4326 };

        var providers = await _db.Locations
            .AsNoTracking()
            .Where(l =>
                l.GeoLocation != null &&
                l.User != null &&
                l.User.ProviderProfile != null &&
                l.User.ProviderProfile.Status == "Approved")
            .OrderBy(l => l.GeoLocation!.Distance(userPoint))
            .Take(Math.Min(maxResults, 10))
            .Select(l => new NearbyVetDto(
                l.UserId,
                l.User!.Name,
                l.User.Phone,
                l.GeoLocation!.Y,
                l.GeoLocation.X,
                l.User.ProviderProfile!.Street + " " + l.User.ProviderProfile.BuildingNumber
                    + (l.User.ProviderProfile.ApartmentNumber != null
                        ? ", Apt " + l.User.ProviderProfile.ApartmentNumber
                        : "")
                    + ", "
                    + l.User.ProviderProfile.City,
                l.GeoLocation.Distance(userPoint) * 111.32,
                l.User.ProviderProfile!.ProfileImageUrl,
                string.Join(", ", l.User.ProviderProfile.ProviderServices.Select(ps => ps.Service.Name)),
                l.User.ProviderProfile.ServiceRates.Any()
                    ? l.User.ProviderProfile.ServiceRates.Min(r => r.Rate)
                    : 0m,
                (double)(l.User.ProviderProfile.AverageRating ?? 0m),
                l.User.ProviderProfile.ReviewCount
            ))
            .ToListAsync();

        return Ok(providers);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
