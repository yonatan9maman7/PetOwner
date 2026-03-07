namespace PetOwner.Api.DTOs;

public record ProviderStatsDto(
    int TotalBookings,
    int CompletedBookings,
    int PendingBookings,
    int CancelledBookings,
    decimal CompletionRate,
    decimal TotalEarnings,
    decimal MonthlyEarnings,
    int ThisMonthBookings,
    decimal AverageRating,
    int ReviewCount,
    List<UpcomingBookingDto> UpcomingBookings,
    List<TodayScheduleDto> TodaySchedule
);

public record UpcomingBookingDto(
    Guid Id,
    string PetOwnerName,
    string? PetName,
    string? ServiceName,
    DateTime? ScheduledStart,
    DateTime? ScheduledEnd,
    decimal? TotalPrice,
    string Status
);

public record TodayScheduleDto(
    Guid Id,
    string PetOwnerName,
    string? PetName,
    string TimeSlot,
    string Status
);
