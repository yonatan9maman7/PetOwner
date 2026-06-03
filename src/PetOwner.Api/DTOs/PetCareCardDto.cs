using PetOwner.Data.Models;

namespace PetOwner.Api.DTOs;

/// <summary>
/// Safety-critical, read-only snapshot of a pet's care information.
/// Returned to the assigned service provider for their active booking.
/// Contains only fields needed at point-of-care — no owner PII beyond vet contact.
/// </summary>
public record PetCareCardDto(
    Guid Id,
    string Name,
    PetSpecies Species,
    string? Breed,
    int Age,
    double? Weight,
    string? ImageUrl,
    string? Allergies,
    string? MedicalConditions,
    string? MedicalNotes,
    string? FeedingSchedule,
    bool IsNeutered,
    string? MicrochipNumber,
    string? VetName,
    string? VetPhone
);
