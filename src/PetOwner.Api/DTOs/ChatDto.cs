namespace PetOwner.Api.DTOs;

public record ChatConversationDto(
    Guid ConversationId,
    Guid OtherUserId,
    string OtherUserName,
    string? OtherUserAvatar,
    string? LastMessageSnippet,
    int UnreadCount,
    DateTime LastMessageAt
);

public record ChatMessageDto(
    Guid Id,
    Guid SenderId,
    string SenderName,
    string Content,
    bool IsRead,
    DateTime SentAt
);

public record ChatNewMessageResponse(
    Guid ConversationId,
    ChatMessageDto Message
);
