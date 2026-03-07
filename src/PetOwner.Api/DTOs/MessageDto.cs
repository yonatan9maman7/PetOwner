namespace PetOwner.Api.DTOs;

public record ConversationDto(
    Guid Id,
    Guid OtherUserId,
    string OtherUserName,
    string? LastMessage,
    int UnreadCount,
    DateTime LastMessageAt
);

public record MessageDto(
    Guid Id,
    Guid SenderId,
    string SenderName,
    string Content,
    bool IsRead,
    DateTime CreatedAt
);

public record SendMessageDto(Guid RecipientId, string Content);
