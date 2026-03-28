using PetOwner.Data.Models;

namespace PetOwner.Api.DTOs;

// ── Vaccination DTOs ──────────────────────────────────────────────

public record VaccinationDto(
    Guid Id,
    Guid PetId,
    VaccineName VaccineName,
    DateTime DateAdministered,
    DateTime? NextDueDate,
    string? Notes,
    DateTime CreatedAt
);

public record CreateVaccinationRequest(
    VaccineName VaccineName,
    DateTime DateAdministered,
    DateTime? NextDueDate,
    string? Notes
);

public record UpdateVaccinationRequest(
    VaccineName VaccineName,
    DateTime DateAdministered,
    DateTime? NextDueDate,
    string? Notes
);

public record VaccineStatusDto(
    VaccineName VaccineName,
    DateTime DateAdministered,
    DateTime? NextDueDate,
    string Status // "Up to Date", "Due Soon", "Overdue"
);

// ── Weight Log DTOs ───────────────────────────────────────────────

public record WeightLogDto(
    Guid Id,
    Guid PetId,
    decimal Weight,
    DateTime DateRecorded,
    DateTime CreatedAt
);

public record CreateWeightLogRequest(
    decimal Weight,
    DateTime DateRecorded
);

public record UpdateWeightLogRequest(
    decimal Weight,
    DateTime DateRecorded
);
