namespace PetOwner.Api.DTOs;

public record NotificationDto(
    Guid Id,
    string Type,
    string Title,
    string Message,
    Guid? RelatedEntityId,
    bool IsRead,
    DateTime CreatedAt
);
