namespace PetOwner.Api.DTOs;

public record CreatePostDto(string Content, string? ImageUrl);

public record PostDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Content,
    string? ImageUrl,
    int LikeCount,
    int CommentCount,
    bool LikedByMe,
    DateTime CreatedAt
);

public record CreateCommentDto(string Content);

public record CommentDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Content,
    DateTime CreatedAt
);
