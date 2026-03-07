namespace PetOwner.Api.DTOs;

public record AvailabilitySlotDto(
    Guid Id,
    int DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime
);

public record CreateAvailabilitySlotDto(
    int DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime
);

public record UpdateAvailabilitySlotDto(
    int DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime
);
