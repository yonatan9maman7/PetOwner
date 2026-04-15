using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
public class HealthPassportController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public HealthPassportController(ApplicationDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpPost("api/pets/{petId:guid}/health-passport/share")]
    [Authorize]
    public async Task<IActionResult> CreateShareLink(Guid petId)
    {
        var userId = GetUserId();
        var pet = await _db.Pets.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == petId && p.UserId == userId);

        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(24))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');

        var share = new PetHealthShare
        {
            PetId = petId,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };

        _db.PetHealthShares.Add(share);
        await _db.SaveChangesAsync();

        var baseUrl = _config["App:BaseUrl"]?.TrimEnd('/')
                      ?? $"{Request.Scheme}://{Request.Host}";
        var url = $"{baseUrl}/api/public/health-passport/{token}";

        return Ok(new { share.Token, Url = url, share.ExpiresAt });
    }

    [HttpGet("api/public/health-passport/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSharedPassport(string token)
    {
        var share = await _db.PetHealthShares
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Token == token);

        if (share is null || share.ExpiresAt < DateTime.UtcNow)
            return NotFound(new { message = "Link expired or not found." });

        var pet = await _db.Pets.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == share.PetId);

        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        var owner = await _db.Users.AsNoTracking()
            .Where(u => u.Id == pet.UserId)
            .Select(u => new { u.Name, u.Email, u.Phone })
            .FirstOrDefaultAsync();

        var vaccinations = await _db.Vaccinations
            .AsNoTracking()
            .Where(v => v.PetId == pet.Id)
            .GroupBy(v => v.VaccineName)
            .Select(g => g.OrderByDescending(v => v.DateAdministered).First())
            .ToListAsync();

        var today = DateTime.UtcNow.Date;
        var dueSoonThreshold = today.AddDays(14);

        var vaccineStatuses = vaccinations.Select(v =>
        {
            string status;
            if (v.NextDueDate is null) status = "Up to Date";
            else if (v.NextDueDate.Value.Date < today) status = "Overdue";
            else if (v.NextDueDate.Value.Date <= dueSoonThreshold) status = "Due Soon";
            else status = "Up to Date";
            return new { v.VaccineName, v.DateAdministered, v.NextDueDate, Status = status };
        }).ToList();

        var weights = await _db.WeightLogs
            .AsNoTracking()
            .Where(w => w.PetId == pet.Id)
            .OrderBy(w => w.DateRecorded)
            .Select(w => new { w.Weight, w.DateRecorded })
            .Take(10)
            .ToListAsync();

        var records = await _db.MedicalRecords
            .AsNoTracking()
            .Where(m => m.PetId == pet.Id)
            .OrderByDescending(m => m.Date)
            .Select(m => new { m.Type, m.Title, m.Description, m.Date, m.DocumentUrl })
            .ToListAsync();

        return Ok(new
        {
            pet = new
            {
                pet.Name,
                pet.Species,
                pet.Breed,
                pet.Age,
                pet.Weight,
                pet.Allergies,
                pet.MedicalConditions,
                pet.MedicalNotes,
                pet.FeedingSchedule,
                pet.MicrochipNumber,
                pet.VetName,
                pet.VetPhone,
                pet.IsNeutered,
                pet.ImageUrl,
            },
            owner = new
            {
                owner?.Name,
                owner?.Email,
                owner?.Phone,
            },
            vaccineStatuses,
            weights,
            records,
            expiresAt = share.ExpiresAt,
        });
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
