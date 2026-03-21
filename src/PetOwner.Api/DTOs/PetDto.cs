namespace PetOwner.Api.DTOs;

public record PetDto(
    Guid Id,
    string Name,
    string Species,
    string? Breed,
    int Age,
    double? Weight,
    string? Allergies,
    string? MedicalConditions,
    string? Notes,
    bool IsNeutered
);

public record CreatePetDto(
    string Name,
    string Species,
    string? Breed,
    int Age,
    double? Weight,
    string? Allergies,
    string? MedicalConditions,
    string? Notes,
    bool IsNeutered = false
);

public record UpdatePetDto(
    string Name,
    string Species,
    string? Breed,
    int Age,
    double? Weight,
    string? Allergies,
    string? MedicalConditions,
    string? Notes,
    bool IsNeutered = false
);
