namespace PetOwner.Api.DTOs;

public record PlaydatePrefsDto(
    bool OptedIn,
    int MaxDistanceKm,
    string? Bio,
    IReadOnlyList<string> PreferredSpecies,
    IReadOnlyList<string> PreferredDogSizes,
    bool IncludeAsProvider,
    bool IsProvider,
    bool HasPet,
    DateTime? LastActiveAt
);

public record UpdatePlaydatePrefsDto(
    bool OptedIn,
    int MaxDistanceKm,
    string? Bio,
    IReadOnlyList<string>? PreferredSpecies,
    IReadOnlyList<string>? PreferredDogSizes,
    bool? IncludeAsProvider
);

public record PalPetDto(
    Guid Id,
    string Name,
    string Species,
    string? Breed,
    int Age,
    string? ImageUrl,
    string? DogSize,
    string? Sterilization,
    IReadOnlyList<string> Tags
);

public record PalDto(
    Guid UserId,
    string Name,
    double DistanceKm,
    string? City,
    string? Bio,
    IReadOnlyList<PalPetDto> Pets,
    DateTime LastActiveAt
);

public record PlaydateRequestDto(
    string? Message,
    Guid? PetId
);

public record PlaydateRequestResponse(
    Guid OtherUserId,
    string OtherUserName,
    string PrefilledMessage
);

public record LiveBeaconDto(
    Guid Id,
    Guid HostUserId,
    string HostUserName,
    string PlaceName,
    double Latitude,
    double Longitude,
    string? City,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    string Species,
    IReadOnlyList<PalPetDto> Pets,
    double DistanceKm
);

public record CreateLiveBeaconDto(
    string PlaceName,
    double Latitude,
    double Longitude,
    string? City,
    int DurationMinutes,
    IReadOnlyList<Guid> PetIds,
    string Species
);

public record PlaydateEventDto(
    Guid Id,
    Guid HostUserId,
    string HostUserName,
    string Title,
    string? Description,
    string LocationName,
    double Latitude,
    double Longitude,
    string? City,
    DateTime ScheduledFor,
    DateTime? EndsAt,
    IReadOnlyList<string> AllowedSpecies,
    int? MaxPets,
    int GoingCount,
    int MaybeCount,
    string? MyRsvpStatus,
    Guid? MyRsvpPetId,
    double? DistanceKm,
    bool IsCancelled
);

public record PlaydateEventDetailDto(
    PlaydateEventDto Event,
    IReadOnlyList<PlaydateAttendeeDto> Attendees
);

public record PlaydateAttendeeDto(
    Guid UserId,
    string UserName,
    string Status,
    PalPetDto? Pet
);

public record CreatePlaydateEventDto(
    string Title,
    string? Description,
    string LocationName,
    double Latitude,
    double Longitude,
    string? City,
    DateTime ScheduledFor,
    DateTime? EndsAt,
    IReadOnlyList<string> AllowedSpecies,
    int? MaxPets
);

public record RsvpDto(string Status, Guid? PetId);

public record PlaydateCommentDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Content,
    DateTime CreatedAt
);

public record CreatePlaydateCommentDto(string Content);
