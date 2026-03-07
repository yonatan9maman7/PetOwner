namespace PetOwner.Api.DTOs;

public record CreateActivityDto(
    string Type,
    decimal? Value,
    int? DurationMinutes,
    string? Notes,
    DateTime Date
);

public record UpdateActivityDto(
    string Type,
    decimal? Value,
    int? DurationMinutes,
    string? Notes,
    DateTime Date
);

public record ActivityDto(
    Guid Id,
    Guid PetId,
    string Type,
    decimal? Value,
    int? DurationMinutes,
    string? Notes,
    DateTime Date,
    DateTime CreatedAt
);

public record ActivitySummaryDto(
    int TotalWalks,
    int TotalWalkMinutes,
    decimal TotalWalkDistance,
    int TotalMeals,
    int TotalExercises,
    int TotalExerciseMinutes,
    List<WeightEntryDto> WeightHistory,
    int CurrentStreak,
    Dictionary<string, int> WeeklyBreakdown
);

public record WeightEntryDto(
    DateTime Date,
    decimal Value
);
