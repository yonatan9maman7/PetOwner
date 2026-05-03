namespace PetOwner.Api.DTOs;

public record DogParkDto(
    Guid Id,
    string Name,
    string Address,
    double Latitude,
    double Longitude,
    bool IsActive);
