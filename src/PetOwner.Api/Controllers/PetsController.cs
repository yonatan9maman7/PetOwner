using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/pets")]
[Authorize]
public class PetsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly INotificationService _notifications;

    public PetsController(ApplicationDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyPets()
    {
        var userId = GetUserId();

        var pets = await _db.Pets
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => new PetDto(
                p.Id, p.Name, p.Species, p.Breed, p.Age, p.Weight,
                p.Allergies, p.MedicalConditions, p.Notes, p.IsNeutered,
                p.MedicalNotes, p.FeedingSchedule, p.MicrochipNumber,
                p.VetName, p.VetPhone, p.ImageUrl,
                p.IsLost, p.LastSeenLocation, p.LastSeenLat, p.LastSeenLng,
                p.LostAt, p.ContactPhone, p.CommunityPostId))
            .ToListAsync();

        return Ok(pets);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePet([FromBody] CreatePetRequest request)
    {
        var userId = GetUserId();

        var pet = new Pet
        {
            UserId = userId,
            Name = request.Name,
            Species = request.Species,
            Breed = request.Breed,
            Age = request.Age,
            Weight = request.Weight,
            Allergies = request.Allergies,
            MedicalConditions = request.MedicalConditions,
            Notes = request.Notes,
            IsNeutered = request.IsNeutered,
            MedicalNotes = request.MedicalNotes,
            FeedingSchedule = request.FeedingSchedule,
            MicrochipNumber = request.MicrochipNumber,
            VetName = request.VetName,
            VetPhone = request.VetPhone,
            ImageUrl = request.ImageUrl,
        };

        if (request.Weight > 0)
        {
            var weight = (decimal)request.Weight;
            var recordedAt = DateTime.UtcNow.Date;

            pet.Activities.Add(new Activity
            {
                UserId = userId,
                Type = "Weight",
                Value = weight,
                Date = recordedAt,
            });

            pet.WeightLogs.Add(new WeightLog
            {
                Weight = weight,
                DateRecorded = recordedAt,
            });
        }

        _db.Pets.Add(pet);
        await _db.SaveChangesAsync();

        if (request.Weight > 0)
        {
            var initialLog = pet.WeightLogs.First();
            _db.MedicalRecords.Add(new MedicalRecord
            {
                PetId = pet.Id,
                Type = "WeightLog",
                Title = $"Weight: {initialLog.Weight} kg",
                Date = initialLog.DateRecorded,
                WeightLogId = initialLog.Id,
            });
            await _db.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetMyPets), MapToDto(pet));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdatePet(Guid id, [FromBody] UpdatePetRequest request)
    {
        var userId = GetUserId();

        var pet = await _db.Pets
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        pet.Name = request.Name;
        pet.Species = request.Species;
        pet.Breed = request.Breed;
        pet.Age = request.Age;
        pet.Weight = request.Weight;
        pet.Allergies = request.Allergies;
        pet.MedicalConditions = request.MedicalConditions;
        pet.Notes = request.Notes;
        pet.IsNeutered = request.IsNeutered;
        pet.MedicalNotes = request.MedicalNotes;
        pet.FeedingSchedule = request.FeedingSchedule;
        pet.MicrochipNumber = request.MicrochipNumber;
        pet.VetName = request.VetName;
        pet.VetPhone = request.VetPhone;
        pet.ImageUrl = request.ImageUrl;

        await _db.SaveChangesAsync();

        return Ok(MapToDto(pet));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePet(Guid id)
    {
        var userId = GetUserId();

        var pet = await _db.Pets
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        _db.Pets.Remove(pet);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ── SOS / Lost Pet Endpoints ──────────────────────────────────────

    private static readonly TimeSpan SosCooldown = TimeSpan.FromHours(24);

    [HttpPost("{id:guid}/report-lost")]
    public async Task<IActionResult> ReportLost(Guid id, [FromBody] ReportLostRequest request)
    {
        var userId = GetUserId();

        var pet = await _db.Pets
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        if (pet.IsLost)
            return BadRequest(new { message = "Pet is already reported as lost." });

        var cooldownThreshold = DateTime.UtcNow - SosCooldown;
        var lastReport = await _db.Pets
            .Where(p => p.UserId == userId && p.LostAt != null && p.LostAt > cooldownThreshold)
            .OrderByDescending(p => p.LostAt)
            .Select(p => p.LostAt)
            .FirstOrDefaultAsync();

        if (lastReport.HasValue)
        {
            var nextAllowed = lastReport.Value + SosCooldown;
            var remaining = nextAllowed - DateTime.UtcNow;
            return BadRequest(new
            {
                message = "You can only send one SOS report every 24 hours.",
                code = "SOS_COOLDOWN",
                cooldownEndsAt = nextAllowed,
                remainingMinutes = (int)Math.Ceiling(remaining.TotalMinutes),
            });
        }

        pet.IsLost = true;
        pet.LastSeenLocation = request.LastSeenLocation;
        pet.LastSeenLat = request.LastSeenLat;
        pet.LastSeenLng = request.LastSeenLng;
        pet.LostAt = DateTime.UtcNow;
        pet.ContactPhone = request.ContactPhone;

        var preferredLanguage = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.PreferredLanguage)
            .FirstOrDefaultAsync();

        var postImage = !string.IsNullOrEmpty(request.ImageUrl) ? request.ImageUrl : pet.ImageUrl;
        var baseContent = !string.IsNullOrWhiteSpace(request.Content)
            ? request.Content.Trim()
            : SosPostContentFormatter.BuildLostPetContent(
                pet.Name,
                request.LastSeenLocation,
                request.ContactPhone,
                request.Description,
                preferredLanguage);
        var sosPost = new Post
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Content = baseContent,
            ImageUrl = postImage,
            Latitude = request.LastSeenLat,
            Longitude = request.LastSeenLng,
            Category = "lost_and_found",
            CreatedAt = DateTime.UtcNow,
        };

        _db.Posts.Add(sosPost);
        pet.CommunityPostId = sosPost.Id;

        await _db.SaveChangesAsync();

        await _notifications.NotifyUsersNearLocationAsync(
            request.LastSeenLat,
            request.LastSeenLng,
            radiusKm: 7,
            type: "sos",
            title: "NOTIFICATIONS.SOS_ALERT_TITLE",
            message: "NOTIFICATIONS.SOS_ALERT",
            relatedEntityId: sosPost.Id);

        return Ok(MapToDto(pet));
    }

    [HttpPost("{id:guid}/mark-found")]
    public async Task<IActionResult> MarkFound(Guid id)
    {
        var userId = GetUserId();

        var pet = await _db.Pets
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        if (!pet.IsLost)
            return BadRequest(new { message = "Pet is not currently reported as lost." });

        pet.IsLost = false;

        // Update the linked SOS community post in a single transaction.
        if (pet.CommunityPostId.HasValue)
        {
            var sosPost = await _db.Posts.FirstOrDefaultAsync(p => p.Id == pet.CommunityPostId.Value);
            if (sosPost is not null && sosPost.SosResolvedAt is null)
            {
                const string foundPrefixEn = "✅ [FOUND] ";
                const string foundPrefixHe = "✅ [נמצא] ";
                var prefix = foundPrefixEn;
                if (!sosPost.Content.StartsWith(foundPrefixEn, StringComparison.Ordinal)
                    && !sosPost.Content.StartsWith(foundPrefixHe, StringComparison.Ordinal))
                {
                    sosPost.Content = prefix + sosPost.Content;
                }
                sosPost.SosResolvedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();

        await _notifications.BroadcastAsync(
            "sos_resolved",
            "NOTIFICATIONS.SOS_RESOLVED_TITLE",
            "NOTIFICATIONS.SOS_RESOLVED",
            pet.CommunityPostId ?? pet.Id);

        return Ok(MapToDto(pet));
    }

    [AllowAnonymous]
    [HttpGet("lost")]
    public async Task<IActionResult> GetLostPets()
    {
        var lostPets = await _db.Pets
            .AsNoTracking()
            .Where(p => p.IsLost)
            .Include(p => p.User)
            .Select(p => new LostPetDto(
                p.Id,
                p.Name,
                p.Species,
                p.Breed,
                p.ImageUrl,
                p.LastSeenLocation!,
                p.LastSeenLat!.Value,
                p.LastSeenLng!.Value,
                p.LostAt,
                p.ContactPhone!,
                p.User.Name))
            .ToListAsync();

        return Ok(lostPets);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private static PetDto MapToDto(Pet p) => new(
        p.Id, p.Name, p.Species, p.Breed, p.Age, p.Weight,
        p.Allergies, p.MedicalConditions, p.Notes, p.IsNeutered,
        p.MedicalNotes, p.FeedingSchedule, p.MicrochipNumber,
        p.VetName, p.VetPhone, p.ImageUrl,
        p.IsLost, p.LastSeenLocation, p.LastSeenLat, p.LastSeenLng,
        p.LostAt, p.ContactPhone, p.CommunityPostId);

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
