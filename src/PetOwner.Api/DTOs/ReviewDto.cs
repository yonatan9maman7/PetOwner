namespace PetOwner.Api.DTOs;

public record CreateReviewDto(
    Guid RequestId,
    int Rating,
    string Comment,
    int? CommunicationRating = null,
    int? ReliabilityRating = null
);

public record ReviewDto(
    Guid Id,
    Guid ServiceRequestId,
    Guid ReviewerId,
    string ReviewerName,
    Guid RevieweeId,
    int Rating,
    string Comment,
    bool IsVerified,
    int? CommunicationRating,
    int? ReliabilityRating,
    string? PhotoUrl,
    DateTime CreatedAt
);
