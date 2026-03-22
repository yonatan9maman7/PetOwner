using PetOwner.Data.Models;

namespace PetOwner.Api.DTOs;

public record PetDto(
    Guid Id,
    string Name,
    PetSpecies Species,
    string? Breed,
    int Age,
    double? Weight,
    string? Allergies,
    string? MedicalConditions,
    string? Notes,
    bool IsNeutered,
    string? MedicalNotes,
    string? FeedingSchedule,
    string? MicrochipNumber,
    string? VetName,
    string? VetPhone
);

public record CreatePetRequest(
    string Name,
    PetSpecies Species,
    string? Breed,
    int Age,
    double? Weight,
    string? Allergies,
    string? MedicalConditions,
    string? Notes,
    bool IsNeutered = false,
    string? MedicalNotes = null,
    string? FeedingSchedule = null,
    string? MicrochipNumber = null,
    string? VetName = null,
    string? VetPhone = null
);

public record UpdatePetRequest(
    string Name,
    PetSpecies Species,
    string? Breed,
    int Age,
    double? Weight,
    string? Allergies,
    string? MedicalConditions,
    string? Notes,
    bool IsNeutered = false,
    string? MedicalNotes = null,
    string? FeedingSchedule = null,
    string? MicrochipNumber = null,
    string? VetName = null,
    string? VetPhone = null
);
