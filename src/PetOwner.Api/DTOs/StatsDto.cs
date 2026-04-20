namespace PetOwner.Api.DTOs;

/// <summary>Top service-type aggregate (sum of price + count of bookings) used in stats dashboards.</summary>
public record TopServiceDto(
    string Service,
    int Count,
    decimal TotalAmount);

/// <summary>Single milestone unlock that a user has earned.</summary>
public record AchievementDto(
    string Code,
    string Scope,
    DateTime UnlockedAt);

/// <summary>Owner ("My Stats") response. All money fields are in ILS.</summary>
public record OwnerStatsDto(
    string Range,
    decimal TotalSpent,
    int PaidBookings,
    int TotalBookings,
    int FavoriteProvidersCount,
    int ReviewsWritten,
    decimal AverageRatingGiven,
    decimal CancellationRate,
    decimal UpcomingSpend,
    DateTime MemberSince,
    TopServiceDto? TopService,
    List<AchievementDto> Achievements);

/// <summary>Provider booking-based stats. All money fields are in ILS.</summary>
public record ProviderBookingStatsDto(
    string Range,
    decimal TotalEarned,
    decimal MonthEarned,
    decimal MonthEarnedDeltaPct,
    int CompletedBookings,
    int TotalBookings,
    decimal AverageRating,
    int ReviewCount,
    decimal AcceptanceRate,
    decimal? AvgResponseMinutes,
    int RepeatClientsCount,
    int UniquePetsServed,
    decimal HoursWorked,
    int ProfileViewCount,
    int SearchAppearanceCount,
    decimal CancellationRateByMe,
    decimal PendingPayouts,
    bool IsStarSitter,
    TopServiceDto? TopService,
    List<AchievementDto> Achievements);

/// <summary>One bucket in the earnings sparkline (weekly).</summary>
public record EarningsSparklinePointDto(DateTime WeekStart, decimal Total);

public record EarningsSparklineDto(List<EarningsSparklinePointDto> Buckets);
