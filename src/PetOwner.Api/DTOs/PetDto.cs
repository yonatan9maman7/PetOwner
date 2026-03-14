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
    string? Notes
);

public record CreatePetDto(
    string Name,
    string Species,
    string? Breed,
    int Age,
    double? Weight,
    string? Allergies,
    string? MedicalConditions,
    string? Notes
);

public record UpdatePetDto(
    string Name,
    string Species,
    string? Breed,
    int Age,
    double? Weight,
    string? Allergies,
    string? MedicalConditions,
    string? Notes
);
