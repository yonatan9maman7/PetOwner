using PetOwner.Api.Infrastructure;
using Xunit;

namespace PetOwner.Api.Tests.Infrastructure;

public class MapAvailabilityQueryParserTests
{
    [Fact]
    public void Parse_WhenRequestedDateAndTimeOfDay_ReturnsBoth()
    {
        var date = new DateTime(2026, 6, 4);
        var time = TimeSpan.FromHours(14).Add(TimeSpan.FromMinutes(30));

        var (d, t) = MapAvailabilityQueryParser.Parse(null, date, time);

        Assert.Equal(date.Date, d);
        Assert.Equal(time, t);
    }

    [Fact]
    public void Parse_WhenRequestedDateOnly_ReturnsDateWithoutTime()
    {
        var date = new DateTime(2026, 6, 4);

        var (d, t) = MapAvailabilityQueryParser.Parse(null, date, null);

        Assert.Equal(date.Date, d);
        Assert.Null(t);
    }

    [Fact]
    public void Parse_WhenLegacyCombinedDateTime_ReturnsSplitParts()
    {
        var legacy = new DateTime(2026, 6, 4, 10, 15, 0);

        var (d, t) = MapAvailabilityQueryParser.Parse(legacy, null, null);

        Assert.Equal(legacy.Date, d);
        Assert.Equal(legacy.TimeOfDay, t);
    }

    [Fact]
    public void Parse_WhenRequestedDatePresent_IgnoresLegacyDateTime()
    {
        var legacy = new DateTime(2026, 1, 1, 8, 0, 0);
        var date = new DateTime(2026, 6, 4);
        var time = TimeSpan.FromHours(12);

        var (d, t) = MapAvailabilityQueryParser.Parse(legacy, date, time);

        Assert.Equal(date.Date, d);
        Assert.Equal(time, t);
    }
}
