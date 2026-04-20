using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

/// <summary>
/// Pet health: medical vault, vaccinations, weight logs, and provider-shared records for bookings.
/// </summary>
[ApiController]
[Route("api/pets/{petId:guid}")]
[Authorize]
public class MedicalRecordsController : ControllerBase
{
    private static readonly HashSet<string> ValidRecordTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Vaccination", "Condition", "Medication", "VetVisit", "WeightLog",
    };

    private readonly ApplicationDbContext _db;

    public MedicalRecordsController(ApplicationDbContext db)
    {
        _db = db;
    }

    // ── Medical records (vault) ─────────────────────────────────────────

    [HttpGet("medical-records")]
    public async Task<IActionResult> GetRecords(Guid petId)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        var records = await _db.MedicalRecords
            .AsNoTracking()
            .Where(m => m.PetId == petId)
            .OrderByDescending(m => m.Date)
            .Select(m => new MedicalRecordDto(
                m.Id, m.PetId, m.Type, m.Title, m.Description, m.Date, m.DocumentUrl, m.CreatedAt,
                m.VaccinationId, m.WeightLogId))
            .ToListAsync();

        return Ok(records);
    }

    [HttpGet("medical-records/{id:guid}")]
    public async Task<IActionResult> GetRecord(Guid petId, Guid id)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        var record = await _db.MedicalRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id && m.PetId == petId);

        if (record is null)
            return NotFound(new { message = "Medical record not found." });

        return Ok(new MedicalRecordDto(
            record.Id, record.PetId, record.Type, record.Title, record.Description,
            record.Date, record.DocumentUrl, record.CreatedAt, record.VaccinationId, record.WeightLogId));
    }

    [HttpPost("medical-records")]
    public async Task<IActionResult> CreateRecord(Guid petId, [FromBody] CreateMedicalRecordDto request)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        if (!ValidRecordTypes.Contains(request.Type))
            return BadRequest(new { message = $"Invalid type. Must be one of: {string.Join(", ", ValidRecordTypes)}." });

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
            record.Date, record.DocumentUrl, record.CreatedAt, record.VaccinationId, record.WeightLogId);

        return CreatedAtAction(nameof(GetRecord), new { petId, id = record.Id }, dto);
    }

    [HttpPut("medical-records/{id:guid}")]
    public async Task<IActionResult> UpdateRecord(Guid petId, Guid id, [FromBody] UpdateMedicalRecordDto request)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        if (!ValidRecordTypes.Contains(request.Type))
            return BadRequest(new { message = $"Invalid type. Must be one of: {string.Join(", ", ValidRecordTypes)}." });

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
            record.Date, record.DocumentUrl, record.CreatedAt, record.VaccinationId, record.WeightLogId));
    }

    [HttpDelete("medical-records/{id:guid}")]
    public async Task<IActionResult> DeleteRecord(Guid petId, Guid id)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        var record = await _db.MedicalRecords.FirstOrDefaultAsync(m => m.Id == id && m.PetId == petId);
        if (record is null)
            return NotFound(new { message = "Medical record not found." });

        _db.MedicalRecords.Remove(record);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ── Vaccinations ────────────────────────────────────────────────────

    [HttpGet("vaccinations")]
    public async Task<IActionResult> GetVaccinations(Guid petId)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        var vaccinations = await _db.Vaccinations
            .AsNoTracking()
            .Where(v => v.PetId == petId)
            .OrderByDescending(v => v.DateAdministered)
            .Select(v => new VaccinationDto(
                v.Id, v.PetId, v.VaccineName,
                v.DateAdministered, v.NextDueDate, v.Notes, v.DocumentUrl, v.CreatedAt))
            .ToListAsync();

        return Ok(vaccinations);
    }

    [HttpGet("vaccinations/{id:guid}")]
    public async Task<IActionResult> GetVaccination(Guid petId, Guid id)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        var v = await _db.Vaccinations
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == id && v.PetId == petId);

        if (v is null)
            return NotFound(new { message = "Vaccination record not found." });

        return Ok(new VaccinationDto(
            v.Id, v.PetId, v.VaccineName,
            v.DateAdministered, v.NextDueDate, v.Notes, v.DocumentUrl, v.CreatedAt));
    }

    [HttpPost("vaccinations")]
    public async Task<IActionResult> CreateVaccination(Guid petId, [FromBody] CreateVaccinationRequest request)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        if (!Enum.IsDefined(request.VaccineName))
            return BadRequest(new { message = "Invalid vaccine name." });

        var vaccination = new Vaccination
        {
            PetId = petId,
            VaccineName = request.VaccineName,
            DateAdministered = request.DateAdministered,
            NextDueDate = request.NextDueDate,
            Notes = request.Notes?.Trim(),
            DocumentUrl = request.DocumentUrl?.Trim(),
        };

        _db.Vaccinations.Add(vaccination);
        await _db.SaveChangesAsync();

        var linkedRecord = new MedicalRecord
        {
            PetId = petId,
            Type = "Vaccination",
            Title = $"{vaccination.VaccineName} Vaccine",
            Description = vaccination.Notes,
            Date = vaccination.DateAdministered,
            DocumentUrl = vaccination.DocumentUrl,
            VaccinationId = vaccination.Id,
        };
        _db.MedicalRecords.Add(linkedRecord);
        await _db.SaveChangesAsync();

        var dto = new VaccinationDto(
            vaccination.Id, vaccination.PetId, vaccination.VaccineName,
            vaccination.DateAdministered, vaccination.NextDueDate,
            vaccination.Notes, vaccination.DocumentUrl, vaccination.CreatedAt);

        return CreatedAtAction(nameof(GetVaccination), new { petId, id = vaccination.Id }, dto);
    }

    [HttpPut("vaccinations/{id:guid}")]
    public async Task<IActionResult> UpdateVaccination(Guid petId, Guid id, [FromBody] UpdateVaccinationRequest request)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        if (!Enum.IsDefined(request.VaccineName))
            return BadRequest(new { message = "Invalid vaccine name." });

        var vaccination = await _db.Vaccinations
            .FirstOrDefaultAsync(v => v.Id == id && v.PetId == petId);

        if (vaccination is null)
            return NotFound(new { message = "Vaccination record not found." });

        vaccination.VaccineName = request.VaccineName;
        vaccination.DateAdministered = request.DateAdministered;
        vaccination.NextDueDate = request.NextDueDate;
        vaccination.Notes = request.Notes?.Trim();
        vaccination.DocumentUrl = request.DocumentUrl?.Trim();

        var linkedRecord = await _db.MedicalRecords
            .FirstOrDefaultAsync(m => m.VaccinationId == id);
        if (linkedRecord is not null)
        {
            linkedRecord.Title = $"{vaccination.VaccineName} Vaccine";
            linkedRecord.Description = vaccination.Notes;
            linkedRecord.Date = vaccination.DateAdministered;
            linkedRecord.DocumentUrl = vaccination.DocumentUrl;
        }

        await _db.SaveChangesAsync();

        return Ok(new VaccinationDto(
            vaccination.Id, vaccination.PetId, vaccination.VaccineName,
            vaccination.DateAdministered, vaccination.NextDueDate,
            vaccination.Notes, vaccination.DocumentUrl, vaccination.CreatedAt));
    }

    [HttpDelete("vaccinations/{id:guid}")]
    public async Task<IActionResult> DeleteVaccination(Guid petId, Guid id)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        var vaccination = await _db.Vaccinations
            .FirstOrDefaultAsync(v => v.Id == id && v.PetId == petId);

        if (vaccination is null)
            return NotFound(new { message = "Vaccination record not found." });

        var linkedRecord = await _db.MedicalRecords
            .FirstOrDefaultAsync(m => m.VaccinationId == id);
        if (linkedRecord is not null)
            _db.MedicalRecords.Remove(linkedRecord);

        _db.Vaccinations.Remove(vaccination);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("vaccine-status")]
    public async Task<IActionResult> GetVaccineStatus(Guid petId)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        var latestPerVaccine = await _db.Vaccinations
            .AsNoTracking()
            .Where(v => v.PetId == petId)
            .GroupBy(v => v.VaccineName)
            .Select(g => g.OrderByDescending(v => v.DateAdministered).First())
            .ToListAsync();

        var today = DateTime.UtcNow.Date;
        var dueSoonThreshold = today.AddDays(14);

        var statuses = latestPerVaccine.Select(v =>
        {
            string status;
            if (v.NextDueDate is null)
                status = "Up to Date";
            else if (v.NextDueDate.Value.Date < today)
                status = "Overdue";
            else if (v.NextDueDate.Value.Date <= dueSoonThreshold)
                status = "Due Soon";
            else
                status = "Up to Date";

            return new VaccineStatusDto(
                v.VaccineName, v.DateAdministered, v.NextDueDate, status);
        })
        .OrderBy(s => s.Status == "Overdue" ? 0 : s.Status == "Due Soon" ? 1 : 2)
        .ThenBy(s => s.NextDueDate)
        .ToList();

        return Ok(statuses);
    }

    // ── Weight logs ─────────────────────────────────────────────────────

    [HttpGet("weight-logs")]
    public async Task<IActionResult> GetWeightLogs(Guid petId)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        var logs = await _db.WeightLogs
            .AsNoTracking()
            .Where(w => w.PetId == petId)
            .OrderByDescending(w => w.DateRecorded)
            .Select(w => new WeightLogDto(w.Id, w.PetId, w.Weight, w.DateRecorded, w.CreatedAt))
            .ToListAsync();

        return Ok(logs);
    }

    [HttpGet("weight-logs/{id:guid}")]
    public async Task<IActionResult> GetWeightLog(Guid petId, Guid id)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        var w = await _db.WeightLogs
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == id && w.PetId == petId);

        if (w is null)
            return NotFound(new { message = "Weight log not found." });

        return Ok(new WeightLogDto(w.Id, w.PetId, w.Weight, w.DateRecorded, w.CreatedAt));
    }

    [HttpPost("weight-logs")]
    public async Task<IActionResult> CreateWeightLog(Guid petId, [FromBody] CreateWeightLogRequest request)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        if (request.Weight <= 0)
            return BadRequest(new { message = "Weight must be greater than zero." });

        var log = new WeightLog
        {
            PetId = petId,
            Weight = request.Weight,
            DateRecorded = request.DateRecorded,
        };

        _db.WeightLogs.Add(log);
        await _db.SaveChangesAsync();

        var linkedRecord = new MedicalRecord
        {
            PetId = petId,
            Type = "WeightLog",
            Title = $"Weight: {log.Weight} kg",
            Date = log.DateRecorded,
            WeightLogId = log.Id,
        };
        _db.MedicalRecords.Add(linkedRecord);
        await _db.SaveChangesAsync();

        var dto = new WeightLogDto(log.Id, log.PetId, log.Weight, log.DateRecorded, log.CreatedAt);
        return CreatedAtAction(nameof(GetWeightLog), new { petId, id = log.Id }, dto);
    }

    [HttpPut("weight-logs/{id:guid}")]
    public async Task<IActionResult> UpdateWeightLog(Guid petId, Guid id, [FromBody] UpdateWeightLogRequest request)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        if (request.Weight <= 0)
            return BadRequest(new { message = "Weight must be greater than zero." });

        var log = await _db.WeightLogs
            .FirstOrDefaultAsync(w => w.Id == id && w.PetId == petId);

        if (log is null)
            return NotFound(new { message = "Weight log not found." });

        log.Weight = request.Weight;
        log.DateRecorded = request.DateRecorded;

        var linkedRecord = await _db.MedicalRecords
            .FirstOrDefaultAsync(m => m.WeightLogId == id);
        if (linkedRecord is not null)
        {
            linkedRecord.Title = $"Weight: {log.Weight} kg";
            linkedRecord.Date = log.DateRecorded;
        }

        await _db.SaveChangesAsync();

        return Ok(new WeightLogDto(log.Id, log.PetId, log.Weight, log.DateRecorded, log.CreatedAt));
    }

    [HttpDelete("weight-logs/{id:guid}")]
    public async Task<IActionResult> DeleteWeightLog(Guid petId, Guid id)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        var log = await _db.WeightLogs
            .FirstOrDefaultAsync(w => w.Id == id && w.PetId == petId);

        if (log is null)
            return NotFound(new { message = "Weight log not found." });

        var linkedRecord = await _db.MedicalRecords
            .FirstOrDefaultAsync(m => m.WeightLogId == id);
        if (linkedRecord is not null)
            _db.MedicalRecords.Remove(linkedRecord);

        _db.WeightLogs.Remove(log);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("weight-history")]
    public async Task<IActionResult> GetWeightHistory(Guid petId)
    {
        if (await VerifyOwnership(petId) is IActionResult denied)
            return denied;

        var history = await _db.WeightLogs
            .AsNoTracking()
            .Where(w => w.PetId == petId)
            .OrderBy(w => w.DateRecorded)
            .Select(w => new WeightLogDto(w.Id, w.PetId, w.Weight, w.DateRecorded, w.CreatedAt))
            .ToListAsync();

        return Ok(history);
    }

    // ── Provider: shared medical records for a booking ─────────────────

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
                m.Id, m.PetId, m.Type, m.Title, m.Description, m.Date, m.DocumentUrl, m.CreatedAt,
                m.VaccinationId, m.WeightLogId))
            .ToListAsync();

        return Ok(new { shared = true, records });
    }

    private async Task<IActionResult?> VerifyOwnership(Guid petId)
    {
        var userId = GetUserId();
        var pet = await _db.Pets.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == petId && p.UserId == userId);

        return pet is null ? NotFound(new { message = "Pet not found." }) : null;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
