namespace PetOwner.Api.DTOs;

public record CreatePostDto(
    string Content,
    string? ImageUrl,
    double? Latitude = null,
    double? Longitude = null,
    string? City = null
);

public record PostDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Content,
    string? ImageUrl,
    int LikeCount,
    int CommentCount,
    bool LikedByMe,
    DateTime CreatedAt,
    string AuthorRole,
    bool AuthorIsApprovedProvider,
    string? Category = null
);

public record CreateCommentDto(string Content);

public record CommentDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Content,
    DateTime CreatedAt
);
