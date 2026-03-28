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
    string? VetPhone,
    string? ImageUrl,
    bool IsLost = false,
    string? LastSeenLocation = null,
    double? LastSeenLat = null,
    double? LastSeenLng = null,
    DateTime? LostAt = null,
    string? ContactPhone = null,
    Guid? CommunityPostId = null
);

public record ReportLostRequest(
    string LastSeenLocation,
    double LastSeenLat,
    double LastSeenLng,
    string ContactPhone
);

public record LostPetDto(
    Guid Id,
    string Name,
    PetSpecies Species,
    string? Breed,
    string? ImageUrl,
    string LastSeenLocation,
    double LastSeenLat,
    double LastSeenLng,
    DateTime? LostAt,
    string ContactPhone,
    string OwnerName
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
    string? VetPhone = null,
    string? ImageUrl = null
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
    string? VetPhone = null,
    string? ImageUrl = null
);
