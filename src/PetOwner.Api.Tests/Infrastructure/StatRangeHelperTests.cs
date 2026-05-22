using PetOwner.Api.Infrastructure;
using Xunit;

namespace PetOwner.Api.Tests.Infrastructure;

public class StatRangeHelperTests
{
    [Theory]
    [InlineData(null, "all")]
    [InlineData("", "all")]
    [InlineData("invalid", "all")]
    [InlineData("7D", "7d")]
    [InlineData("year", "year")]
    public void Normalize_WhenVariousInputs_ReturnsExpected(string? input, string expected)
    {
        // Act
        var result = StatRangeHelper.Normalize(input);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Resolve_When7d_ReturnsStartSevenDaysAgo()
    {
        // Arrange
        var before = DateTime.UtcNow.AddDays(-7).AddMinutes(-1);

        // Act
        var (start, end) = StatRangeHelper.Resolve("7d");

        // Assert
        Assert.NotNull(start);
        Assert.True(start.Value >= before);
        Assert.True(end <= DateTime.UtcNow.AddMinutes(1));
    }

    [Fact]
    public void Resolve_When30d_ReturnsStartThirtyDaysAgo()
    {
        // Arrange
        var before = DateTime.UtcNow.AddDays(-30).AddMinutes(-1);

        // Act
        var (start, end) = StatRangeHelper.Resolve("30d");

        // Assert
        Assert.NotNull(start);
        Assert.True(start.Value >= before);
    }

    [Fact]
    public void Resolve_WhenYear_ReturnsStartOfCurrentUtcYear()
    {
        // Act
        var (start, end) = StatRangeHelper.Resolve("year");

        // Assert
        Assert.NotNull(start);
        Assert.Equal(new DateTime(DateTime.UtcNow.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc), start.Value);
        Assert.True(end <= DateTime.UtcNow.AddMinutes(1));
    }

    [Fact]
    public void Resolve_WhenAll_ReturnsNullStart()
    {
        // Act
        var (start, end) = StatRangeHelper.Resolve("all");

        // Assert
        Assert.Null(start);
        Assert.True(end <= DateTime.UtcNow.AddMinutes(1));
    }
}
