namespace PetOwner.Api.Infrastructure;

/// <summary>
/// Normalizes map pin availability query parameters (legacy combined datetime vs date + time-of-day).
/// </summary>
public static class MapAvailabilityQueryParser
{
    public static (DateTime? Date, TimeSpan? TimeOfDay) Parse(
        DateTime? legacyRequestedDateTime,
        DateTime? requestedDate,
        TimeSpan? requestedTimeOfDay)
    {
        if (requestedDate.HasValue)
        {
            var date = requestedDate.Value.Date;
            var time = requestedTimeOfDay;
            return (date, time);
        }

        if (legacyRequestedDateTime.HasValue)
        {
            var legacy = legacyRequestedDateTime.Value;
            return (legacy.Date, legacy.TimeOfDay);
        }

        return (null, null);
    }
}
