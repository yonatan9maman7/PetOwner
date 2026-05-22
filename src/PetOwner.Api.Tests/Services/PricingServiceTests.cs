using PetOwner.Api.Services;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Services;

/// <summary>
/// Unit tests for <see cref="PricingService"/> commission and duration billing rules.
/// </summary>
public class PricingServiceTests
{
    private readonly PricingService _sut = new();

    // --- Happy path ---

    [Fact]
    public void Calculate_PerHourTwoHoursOnePet_ReturnsExpectedBreakdown()
    {
        // Arrange
        var rate = CreateRate(90m, PricingUnit.PerHour);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end = new DateTime(2026, 1, 1, 12, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert
        Assert.Equal(180m, result.ProviderNetAmount);
        Assert.Equal(200m, result.GrossAmount);
        Assert.Equal(8m, result.ServiceFee);
        Assert.Equal(208m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_PerNightMultiNightStay_ReturnsUnitsTimesRateAndPets()
    {
        // Arrange
        var rate = CreateRate(45m, PricingUnit.PerNight);
        var start = new DateTime(2026, 1, 1, 15, 0, 0);
        var end = new DateTime(2026, 1, 4, 11, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert — 3 calendar nights between dates
        Assert.Equal(135m, result.ProviderNetAmount);
        Assert.Equal(150m, result.GrossAmount);
        Assert.Equal(6m, result.ServiceFee);
        Assert.Equal(156m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_PerVisitOnePet_ReturnsSingleUnitPricing()
    {
        // Arrange
        var rate = CreateRate(60m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 2, 10, 9, 0, 0);
        var end = new DateTime(2026, 2, 10, 10, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert
        Assert.Equal(60m, result.ProviderNetAmount);
        Assert.Equal(66.67m, result.GrossAmount);
        Assert.Equal(2.67m, result.ServiceFee);
        Assert.Equal(69.34m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_PerSessionWithFixedDuration_UsesElapsedHours()
    {
        // Arrange
        var rate = CreateRate(80m, PricingUnit.PerSession, fixedDurationMinutes: 60);
        var start = new DateTime(2026, 3, 1, 14, 0, 0);
        var end = new DateTime(2026, 3, 1, 16, 30, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert — 2.5 hours at net 80/hr equivalent units
        Assert.Equal(200m, result.ProviderNetAmount);
        Assert.Equal(222.22m, result.GrossAmount);
        Assert.Equal(8.89m, result.ServiceFee);
        Assert.Equal(231.11m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_PerSessionWithoutFixedDuration_ReturnsSingleUnit()
    {
        // Arrange
        var rate = CreateRate(120m, PricingUnit.PerSession);
        var start = new DateTime(2026, 3, 1, 14, 0, 0);
        var end = new DateTime(2026, 3, 1, 16, 30, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert — duration ignored; one session unit
        Assert.Equal(120m, result.ProviderNetAmount);
        Assert.Equal(133.33m, result.GrossAmount);
        Assert.Equal(5.33m, result.ServiceFee);
        Assert.Equal(138.66m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_PerPackageOnePet_ReturnsSingleUnitPricing()
    {
        // Arrange
        var rate = CreateRate(250m, PricingUnit.PerPackage);
        var start = new DateTime(2026, 4, 1, 0, 0, 0);
        var end = new DateTime(2026, 5, 1, 0, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert
        Assert.Equal(250m, result.ProviderNetAmount);
        Assert.Equal(277.78m, result.GrossAmount);
        Assert.Equal(11.11m, result.ServiceFee);
        Assert.Equal(288.89m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_WhenMultiplePets_MultipliesAllAmounts()
    {
        // Arrange
        var rate = CreateRate(50m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end = new DateTime(2026, 1, 1, 11, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 2);

        // Assert
        Assert.Equal(100m, result.ProviderNetAmount);
        Assert.Equal(111.11m, result.GrossAmount);
        Assert.Equal(4.44m, result.ServiceFee);
        Assert.Equal(115.55m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_FractionalHourDuration_RoundsEachLineItem()
    {
        // Arrange
        var rate = CreateRate(90m, PricingUnit.PerHour);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end = new DateTime(2026, 1, 1, 11, 30, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert — 1.5 hours
        Assert.Equal(135m, result.ProviderNetAmount);
        Assert.Equal(150m, result.GrossAmount);
        Assert.Equal(6m, result.ServiceFee);
        Assert.Equal(156m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_ServiceFee_IsFourPercentOfGross()
    {
        // Arrange
        var rate = CreateRate(100m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end = new DateTime(2026, 1, 1, 11, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert
        Assert.Equal(Math.Round(result.GrossAmount * 0.04m, 2, MidpointRounding.AwayFromZero), result.ServiceFee);
        Assert.Equal(result.GrossAmount + result.ServiceFee, result.TotalAmountToPay);
    }

    // --- Edge cases ---

    [Fact]
    public void Calculate_PerNightSameCalendarDay_UsesMinimumOneNight()
    {
        // Arrange
        var rate = CreateRate(80m, PricingUnit.PerNight);
        var day = new DateTime(2026, 6, 15, 8, 0, 0);

        // Act
        var result = _sut.Calculate(rate, day, day.AddHours(5), petCount: 1);

        // Assert
        Assert.Equal(80m, result.ProviderNetAmount);
        Assert.Equal(88.89m, result.GrossAmount);
    }

    [Fact]
    public void Calculate_WhenPetCountZero_UsesMinimumOnePet()
    {
        // Arrange
        var rate = CreateRate(40m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end = new DateTime(2026, 1, 1, 11, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 0);

        // Assert
        Assert.Equal(40m, result.ProviderNetAmount);
    }

    [Fact]
    public void Calculate_WhenPetCountNegative_UsesMinimumOnePet()
    {
        // Arrange
        var rate = CreateRate(40m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end = new DateTime(2026, 1, 1, 11, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: -3);

        // Assert
        Assert.Equal(40m, result.ProviderNetAmount);
    }

    [Fact]
    public void Calculate_WhenRateNegative_TreatsRateAsZero()
    {
        // Arrange
        var rate = CreateRate(-25m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end = new DateTime(2026, 1, 1, 11, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert
        Assert.Equal(0m, result.ProviderNetAmount);
        Assert.Equal(0m, result.GrossAmount);
        Assert.Equal(0m, result.ServiceFee);
        Assert.Equal(0m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_PerHourSameStartAndEnd_ReturnsZeroAmounts()
    {
        // Arrange
        var rate = CreateRate(90m, PricingUnit.PerHour);
        var instant = new DateTime(2026, 1, 1, 10, 0, 0);

        // Act
        var result = _sut.Calculate(rate, instant, instant, petCount: 1);

        // Assert
        Assert.Equal(0m, result.ProviderNetAmount);
        Assert.Equal(0m, result.GrossAmount);
        Assert.Equal(0m, result.ServiceFee);
        Assert.Equal(0m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_PerHourEndBeforeStart_ReturnsZeroAmounts()
    {
        // Arrange
        var rate = CreateRate(90m, PricingUnit.PerHour);
        var start = new DateTime(2026, 1, 1, 14, 0, 0);
        var end = new DateTime(2026, 1, 1, 10, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert
        Assert.Equal(0m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_WhenUnknownPricingUnit_ReturnsZeroAmounts()
    {
        // Arrange
        var rate = CreateRate(100m, (PricingUnit)999);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end = new DateTime(2026, 1, 2, 10, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert
        Assert.Equal(0m, result.ProviderNetAmount);
        Assert.Equal(0m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_PerSessionWithZeroFixedDuration_UsesSingleUnit()
    {
        // Arrange
        var rate = CreateRate(95m, PricingUnit.PerSession, fixedDurationMinutes: 0);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end = new DateTime(2026, 1, 1, 14, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert
        Assert.Equal(95m, result.ProviderNetAmount);
        Assert.Equal(105.56m, result.GrossAmount);
    }

    [Fact]
    public void Calculate_WhenRateIsNull_ThrowsNullReferenceException()
    {
        // Arrange
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end = new DateTime(2026, 1, 1, 12, 0, 0);

        // Act & Assert
        Assert.Throws<NullReferenceException>(() => _sut.Calculate(null!, start, end, petCount: 1));
    }

    [Fact]
    public void Calculate_ProviderNetEqualsNinetyPercentOfGrossBeforeCustomerFee()
    {
        // Arrange
        var rate = CreateRate(90m, PricingUnit.PerHour);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end = new DateTime(2026, 1, 1, 11, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert — platform commission: gross * 0.9 ≈ provider net (after rounding)
        var expectedNetFromGross = Math.Round(result.GrossAmount * 0.9m, 2, MidpointRounding.AwayFromZero);
        Assert.Equal(expectedNetFromGross, result.ProviderNetAmount);
    }

    [Fact]
    public void Calculate_PerNightEndBeforeStartStillUsesMinimumOneNight()
    {
        // Arrange — dates reversed but same calendar span logic uses .Days
        var rate = CreateRate(50m, PricingUnit.PerNight);
        var start = new DateTime(2026, 1, 5, 18, 0, 0);
        var end = new DateTime(2026, 1, 3, 10, 0, 0);

        // Act
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert — negative day diff clamped to 1 night minimum
        Assert.Equal(50m, result.ProviderNetAmount);
    }

    private static ProviderServiceRate CreateRate(
        decimal netRate,
        PricingUnit unit,
        int? fixedDurationMinutes = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            ProviderProfileId = Guid.NewGuid(),
            Service = ServiceType.DogWalking,
            Rate = netRate,
            Unit = unit,
            FixedDurationMinutes = fixedDurationMinutes,
        };
}
