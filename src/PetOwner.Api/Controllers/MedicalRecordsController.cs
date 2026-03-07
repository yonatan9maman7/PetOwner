using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/pets/{petId:guid}/medical-records")]
[Authorize]
public class MedicalRecordsController : ControllerBase
{
    private static readonly HashSet<string> ValidTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Vaccination", "Condition", "Medication", "VetVisit"
    };

    private readonly ApplicationDbContext _db;

    public MedicalRecordsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetRecords(Guid petId)
    {
        var userId = GetUserId();

        var pet = await _db.Pets.AsNoTracking().FirstOrDefaultAsync(p => p.Id == petId && p.UserId == userId);
        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        var records = await _db.MedicalRecords
            .AsNoTracking()
            .Where(m => m.PetId == petId)
            .OrderByDescending(m => m.Date)
            .Select(m => new MedicalRecordDto(
                m.Id, m.PetId, m.Type, m.Title, m.Description, m.Date, m.DocumentUrl, m.CreatedAt))
            .ToListAsync();

        return Ok(records);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetRecord(Guid petId, Guid id)
    {
        var userId = GetUserId();

        var pet = await _db.Pets.AsNoTracking().FirstOrDefaultAsync(p => p.Id == petId && p.UserId == userId);
        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        var record = await _db.MedicalRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id && m.PetId == petId);

        if (record is null)
            return NotFound(new { message = "Medical record not found." });

        return Ok(new MedicalRecordDto(
            record.Id, record.PetId, record.Type, record.Title, record.Description,
            record.Date, record.DocumentUrl, record.CreatedAt));
    }

    [HttpPost]
    public async Task<IActionResult> CreateRecord(Guid petId, [FromBody] CreateMedicalRecordDto request)
    {
        var userId = GetUserId();

        var pet = await _db.Pets.FirstOrDefaultAsync(p => p.Id == petId && p.UserId == userId);
        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        if (!ValidTypes.Contains(request.Type))
            return BadRequest(new { message = $"Invalid type. Must be one of: {string.Join(", ", ValidTypes)}." });

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Title is required." });

        var record = new MedicalRecord
        {
            PetId = petId,
            Type = request.Type,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Date = request.Date,
            DocumentUrl = request.DocumentUrl?.Trim(),
        };

        _db.MedicalRecords.Add(record);
        await _db.SaveChangesAsync();

        var dto = new MedicalRecordDto(
            record.Id, record.PetId, record.Type, record.Title, record.Description,
            record.Date, record.DocumentUrl, record.CreatedAt);

        return CreatedAtAction(nameof(GetRecord), new { petId, id = record.Id }, dto);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateRecord(Guid petId, Guid id, [FromBody] UpdateMedicalRecordDto request)
    {
        var userId = GetUserId();

        var pet = await _db.Pets.AsNoTracking().FirstOrDefaultAsync(p => p.Id == petId && p.UserId == userId);
        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        if (!ValidTypes.Contains(request.Type))
            return BadRequest(new { message = $"Invalid type. Must be one of: {string.Join(", ", ValidTypes)}." });

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Title is required." });

        var record = await _db.MedicalRecords.FirstOrDefaultAsync(m => m.Id == id && m.PetId == petId);
        if (record is null)
            return NotFound(new { message = "Medical record not found." });

        record.Type = request.Type;
        record.Title = request.Title.Trim();
        record.Description = request.Description?.Trim();
        record.Date = request.Date;
        record.DocumentUrl = request.DocumentUrl?.Trim();

        await _db.SaveChangesAsync();

        return Ok(new MedicalRecordDto(
            record.Id, record.PetId, record.Type, record.Title, record.Description,
            record.Date, record.DocumentUrl, record.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteRecord(Guid petId, Guid id)
    {
        var userId = GetUserId();

        var pet = await _db.Pets.AsNoTracking().FirstOrDefaultAsync(p => p.Id == petId && p.UserId == userId);
        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        var record = await _db.MedicalRecords.FirstOrDefaultAsync(m => m.Id == id && m.PetId == petId);
        if (record is null)
            return NotFound(new { message = "Medical record not found." });

        _db.MedicalRecords.Remove(record);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("/api/bookings/{bookingId:guid}/medical-records")]
    public async Task<IActionResult> GetSharedRecords(Guid bookingId)
    {
        var userId = GetUserId();

        var booking = await _db.ServiceRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(sr => sr.Id == bookingId);

        if (booking is null)
            return NotFound(new { message = "Booking not found." });

        if (booking.ProviderId != userId)
            return Forbid();

        if (booking.Status is not ("Accepted" or "Completed"))
            return BadRequest(new { message = "Medical records are only accessible for active or completed bookings." });

        if (!booking.ShareMedicalRecords)
            return Ok(new { shared = false, records = Array.Empty<MedicalRecordDto>() });

        if (!booking.PetId.HasValue)
            return Ok(new { shared = true, records = Array.Empty<MedicalRecordDto>() });

        var records = await _db.MedicalRecords
            .AsNoTracking()
            .Where(m => m.PetId == booking.PetId.Value)
            .OrderByDescending(m => m.Date)
            .Select(m => new MedicalRecordDto(
                m.Id, m.PetId, m.Type, m.Title, m.Description, m.Date, m.DocumentUrl, m.CreatedAt))
            .ToListAsync();

        return Ok(new { shared = true, records });
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
