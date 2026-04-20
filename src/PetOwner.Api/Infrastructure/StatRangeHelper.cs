namespace PetOwner.Api.Infrastructure;

/// <summary>
/// Translates the "range" query-string parameter (7d / 30d / year / all) into a
/// concrete (start, end) UTC tuple used to filter Booking rows in stats endpoints.
/// </summary>
public static class StatRangeHelper
{
    public static readonly string[] AllowedRanges = ["7d", "30d", "year", "all"];

    public static string Normalize(string? range) =>
        string.IsNullOrWhiteSpace(range) || !AllowedRanges.Contains(range.ToLowerInvariant())
            ? "all"
            : range!.ToLowerInvariant();

    public static (DateTime? Start, DateTime End) Resolve(string range)
    {
        var now = DateTime.UtcNow;
        return Normalize(range) switch
        {
            "7d" => (now.AddDays(-7), now),
            "30d" => (now.AddDays(-30), now),
            "year" => (new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc), now),
            _ => (null, now),
        };
    }
}
