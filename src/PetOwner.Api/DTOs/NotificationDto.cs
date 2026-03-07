namespace PetOwner.Api.DTOs;

public record NotificationDto(
    Guid Id,
    string Type,
    string Title,
    string Body,
    string? ReferenceId,
    bool IsRead,
    DateTime CreatedAt
);
