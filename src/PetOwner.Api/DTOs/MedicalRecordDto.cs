namespace PetOwner.Api.DTOs;

public record MedicalRecordDto(
    Guid Id,
    Guid PetId,
    string Type,
    string Title,
    string? Description,
    DateTime Date,
    string? DocumentUrl,
    DateTime CreatedAt
);

public record CreateMedicalRecordDto(
    string Type,
    string Title,
    string? Description,
    DateTime Date,
    string? DocumentUrl
);

public record UpdateMedicalRecordDto(
    string Type,
    string Title,
    string? Description,
    DateTime Date,
    string? DocumentUrl
);
