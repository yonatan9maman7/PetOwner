namespace PetOwner.Api.DTOs;

public record CreatePostDto(
    string Content,
    string? ImageUrl,
    double? Latitude = null,
    double? Longitude = null,
    string? City = null,
    string? Category = null,
    string? Title = null,
    Guid? RelatedPetId = null,
    string? TagsCsv = null,
    bool IsAnonymous = false,
    int? SosNotifyRadiusKm = null,
    string? DogName = null,
    string? ContactPhone = null,
    DateTime? LastSeenAt = null
);

public record PostDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Content,
    string? ImageUrl,
    int LikeCount,
    int CommentCount,
    int HelpfulCount,
    bool LikedByMe,
    bool MarkedHelpfulByMe,
    bool SavedByMe,
    DateTime CreatedAt,
    string AuthorRole,
    bool AuthorIsApprovedProvider,
    string? Category = null,
    string? Title = null,
    Guid? RelatedPetId = null,
    string? RelatedPetName = null,
    string? RelatedPetImageUrl = null,
    DateTime? SosResolvedAt = null,
    bool IsAnonymous = false
);

public record CreateCommentDto(string Content, Guid? ParentCommentId = null);

public record CommunityReportRequest(string? Reason);

public record SosSightingRequest(double Latitude, double Longitude, string? Note);

public record EditCommentDto(string Content);

public record CommentDto(
    Guid Id,
    Guid? ParentCommentId,
    Guid UserId,
    string UserName,
    string Content,
    DateTime CreatedAt,
    DateTime? EditedAt,
    int LikeCount,
    bool LikedByMe,
    IReadOnlyList<CommentDto> Replies
);
