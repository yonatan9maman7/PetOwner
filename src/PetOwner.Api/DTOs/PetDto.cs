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
    bool IsNeutered
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
    bool IsNeutered = false
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
    bool IsNeutered = false
);
