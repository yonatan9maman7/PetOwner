using System.ComponentModel.DataAnnotations;

namespace PetOwner.Api.DTOs;

// ── Group DTOs ──────────────────────────────────────────────

public record CommunityGroupDto(
    Guid Id,
    string Name,
    string Description,
    string? Icon,
    bool IsActive,
    DateTime CreatedAt,
    string? TargetCountry,
    string? TargetCity,
    int PostCount,
    int MemberCount,
    bool JoinedByMe
);

public record GroupJoinResponse(bool Joined, int MemberCount);

public record CreateCommunityGroupRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(2000)] string Description = "",
    [MaxLength(500)] string? Icon = null,
    [MaxLength(100)] string? TargetCountry = null,
    [MaxLength(100)] string? TargetCity = null
);

public record UpdateCommunityGroupRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(2000)] string Description = "",
    [MaxLength(500)] string? Icon = null,
    bool IsActive = true,
    [MaxLength(100)] string? TargetCountry = null,
    [MaxLength(100)] string? TargetCity = null
);

// ── Post DTOs ───────────────────────────────────────────────

public record GroupPostDto(
    Guid Id,
    Guid GroupId,
    Guid AuthorId,
    string AuthorName,
    string? AuthorAvatar,
    string Content,
    DateTime CreatedAt,
    double? Latitude,
    double? Longitude,
    string? City,
    string? Country,
    int LikesCount,
    int CommentsCount,
    bool IsLikedByCurrentUser
);

public record CreateGroupPostRequest(
    [Required, MaxLength(4000)] string Content,
    double? Latitude = null,
    double? Longitude = null,
    [MaxLength(100)] string? City = null,
    [MaxLength(100)] string? Country = null
);

// ── Comment DTOs ────────────────────────────────────────────

public record GroupPostCommentDto(
    Guid Id,
    Guid AuthorId,
    string AuthorName,
    string? AuthorAvatar,
    string Content,
    DateTime CreatedAt
);

public record CreateGroupPostCommentRequest(
    [Required, MaxLength(1000)] string Content
);
