namespace PetOwner.Api.DTOs;

public record PetDto(
    Guid Id,
    string Name,
    string Species,
    int Age,
    string? Notes
);

public record CreatePetDto(
    string Name,
    string Species,
    int Age,
    string? Notes
);
