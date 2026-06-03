using PetOwner.Api.Services;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Services;

/// <summary>
/// Unit tests for <see cref="PricingService"/> — split-fee model.
/// Rate = provider base price per billing unit.
///   ClientFee       = BasePrice × 10 %
///   TotalAmountToPay= BasePrice + ClientFee
///   ProviderFee     = BasePrice × 4 %
///   ProviderNetAmount = BasePrice − ProviderFee
/// </summary>
public class PricingServiceTests
{
    private readonly PricingService _sut = new();

    // ─── Happy-path ───────────────────────────────────────────────────────────

    [Fact]
    public void Calculate_PerHourTwoHoursOnePet_ReturnsExpectedBreakdown()
    {
        // Arrange — rate = base price ₪90/h
        var rate = CreateRate(90m, PricingUnit.PerHour);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end   = new DateTime(2026, 1, 1, 12, 0, 0);

        // Act — 2 hours
        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // Assert
        // BasePrice = 90 × 2 = 180
        // ClientFee = 180 × 0.10 = 18
        // Total     = 180 + 18 = 198
        // ProviderFee = 180 × 0.04 = 7.2
        // ProviderNet = 180 − 7.2 = 172.8
        Assert.Equal(180m,   result.BasePrice);
        Assert.Equal(18m,    result.ClientFee);
        Assert.Equal(198m,   result.TotalAmountToPay);
        Assert.Equal(7.20m,  result.ProviderFee);
        Assert.Equal(172.80m, result.ProviderNetAmount);
    }

    [Fact]
    public void Calculate_PerNightMultiNightStay_ReturnsUnitsTimesRateAndPets()
    {
        // Arrange — 3 calendar nights at ₪45/night
        var rate = CreateRate(45m, PricingUnit.PerNight);
        var start = new DateTime(2026, 1, 1, 15, 0, 0);
        var end   = new DateTime(2026, 1, 4, 11, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // BasePrice = 45 × 3 = 135; ClientFee = 13.5; Total = 148.5
        // ProviderFee = 5.4; ProviderNet = 129.6
        Assert.Equal(135m,   result.BasePrice);
        Assert.Equal(13.50m, result.ClientFee);
        Assert.Equal(148.50m, result.TotalAmountToPay);
        Assert.Equal(5.40m,  result.ProviderFee);
        Assert.Equal(129.60m, result.ProviderNetAmount);
    }

    [Fact]
    public void Calculate_PerVisitOnePet_ReturnsSingleUnitPricing()
    {
        var rate = CreateRate(60m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 2, 10, 9, 0, 0);
        var end   = new DateTime(2026, 2, 10, 10, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // BasePrice = 60; ClientFee = 6; Total = 66
        // ProviderFee = 2.4; ProviderNet = 57.6
        Assert.Equal(60m,    result.BasePrice);
        Assert.Equal(6m,     result.ClientFee);
        Assert.Equal(66m,    result.TotalAmountToPay);
        Assert.Equal(2.40m,  result.ProviderFee);
        Assert.Equal(57.60m, result.ProviderNetAmount);
    }

    [Fact]
    public void Calculate_PerSessionWithFixedDuration_UsesElapsedHours()
    {
        // Arrange — ₪80/h, 2.5 hours
        var rate = CreateRate(80m, PricingUnit.PerSession, fixedDurationMinutes: 60);
        var start = new DateTime(2026, 3, 1, 14, 0, 0);
        var end   = new DateTime(2026, 3, 1, 16, 30, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // BasePrice = 80 × 2.5 = 200; ClientFee = 20; Total = 220
        // ProviderFee = 8; ProviderNet = 192
        Assert.Equal(200m, result.BasePrice);
        Assert.Equal(20m,  result.ClientFee);
        Assert.Equal(220m, result.TotalAmountToPay);
        Assert.Equal(8m,   result.ProviderFee);
        Assert.Equal(192m, result.ProviderNetAmount);
    }

    [Fact]
    public void Calculate_PerSessionWithoutFixedDuration_ReturnsSingleUnit()
    {
        var rate = CreateRate(120m, PricingUnit.PerSession);
        var start = new DateTime(2026, 3, 1, 14, 0, 0);
        var end   = new DateTime(2026, 3, 1, 16, 30, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // BasePrice = 120; ClientFee = 12; Total = 132
        // ProviderFee = 4.8; ProviderNet = 115.2
        Assert.Equal(120m,   result.BasePrice);
        Assert.Equal(12m,    result.ClientFee);
        Assert.Equal(132m,   result.TotalAmountToPay);
        Assert.Equal(4.80m,  result.ProviderFee);
        Assert.Equal(115.20m, result.ProviderNetAmount);
    }

    [Fact]
    public void Calculate_PerPackageOnePet_ReturnsSingleUnitPricing()
    {
        var rate = CreateRate(250m, PricingUnit.PerPackage);
        var start = new DateTime(2026, 4, 1, 0, 0, 0);
        var end   = new DateTime(2026, 5, 1, 0, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // BasePrice = 250; ClientFee = 25; Total = 275
        // ProviderFee = 10; ProviderNet = 240
        Assert.Equal(250m, result.BasePrice);
        Assert.Equal(25m,  result.ClientFee);
        Assert.Equal(275m, result.TotalAmountToPay);
        Assert.Equal(10m,  result.ProviderFee);
        Assert.Equal(240m, result.ProviderNetAmount);
    }

    [Fact]
    public void Calculate_WhenMultiplePets_MultipliesAllAmounts()
    {
        var rate = CreateRate(50m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end   = new DateTime(2026, 1, 1, 11, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 2);

        // BasePrice = 50 × 2 = 100; ClientFee = 10; Total = 110
        // ProviderFee = 4; ProviderNet = 96
        Assert.Equal(100m, result.BasePrice);
        Assert.Equal(10m,  result.ClientFee);
        Assert.Equal(110m, result.TotalAmountToPay);
        Assert.Equal(4m,   result.ProviderFee);
        Assert.Equal(96m,  result.ProviderNetAmount);
    }

    [Fact]
    public void Calculate_FractionalHourDuration_RoundsEachLineItem()
    {
        // Arrange — 1.5 hours at ₪90/h
        var rate = CreateRate(90m, PricingUnit.PerHour);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end   = new DateTime(2026, 1, 1, 11, 30, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // BasePrice = 90 × 1.5 = 135; ClientFee = 13.5; Total = 148.5
        Assert.Equal(135m,   result.BasePrice);
        Assert.Equal(13.50m, result.ClientFee);
        Assert.Equal(148.50m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_ClientFee_IsTenPercentOfBasePrice()
    {
        var rate = CreateRate(100m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end   = new DateTime(2026, 1, 1, 11, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        Assert.Equal(Math.Round(result.BasePrice * 0.10m, 2, MidpointRounding.AwayFromZero), result.ClientFee);
        Assert.Equal(result.BasePrice + result.ClientFee, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_ProviderFee_IsFourPercentOfBasePrice()
    {
        var rate = CreateRate(100m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end   = new DateTime(2026, 1, 1, 11, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        Assert.Equal(Math.Round(result.BasePrice * 0.04m, 2, MidpointRounding.AwayFromZero), result.ProviderFee);
        Assert.Equal(result.BasePrice - result.ProviderFee, result.ProviderNetAmount);
    }

    // ─── Edge cases ──────────────────────────────────────────────────────────

    [Fact]
    public void Calculate_PerNightSameCalendarDay_UsesMinimumOneNight()
    {
        var rate = CreateRate(80m, PricingUnit.PerNight);
        var day  = new DateTime(2026, 6, 15, 8, 0, 0);

        var result = _sut.Calculate(rate, day, day.AddHours(5), petCount: 1);

        Assert.Equal(80m, result.BasePrice);
        Assert.Equal(8m,  result.ClientFee);
        Assert.Equal(88m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_WhenPetCountZero_UsesMinimumOnePet()
    {
        var rate = CreateRate(40m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end   = new DateTime(2026, 1, 1, 11, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 0);

        Assert.Equal(40m, result.BasePrice);
    }

    [Fact]
    public void Calculate_WhenPetCountNegative_UsesMinimumOnePet()
    {
        var rate = CreateRate(40m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end   = new DateTime(2026, 1, 1, 11, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: -3);

        Assert.Equal(40m, result.BasePrice);
    }

    [Fact]
    public void Calculate_WhenRateNegative_TreatsRateAsZero()
    {
        var rate = CreateRate(-25m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end   = new DateTime(2026, 1, 1, 11, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        Assert.Equal(0m, result.BasePrice);
        Assert.Equal(0m, result.ClientFee);
        Assert.Equal(0m, result.TotalAmountToPay);
        Assert.Equal(0m, result.ProviderFee);
        Assert.Equal(0m, result.ProviderNetAmount);
    }

    [Fact]
    public void Calculate_PerHourSameStartAndEnd_ReturnsZeroAmounts()
    {
        var rate    = CreateRate(90m, PricingUnit.PerHour);
        var instant = new DateTime(2026, 1, 1, 10, 0, 0);

        var result = _sut.Calculate(rate, instant, instant, petCount: 1);

        Assert.Equal(0m, result.BasePrice);
        Assert.Equal(0m, result.ClientFee);
        Assert.Equal(0m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_PerHourEndBeforeStart_ReturnsZeroAmounts()
    {
        var rate  = CreateRate(90m, PricingUnit.PerHour);
        var start = new DateTime(2026, 1, 1, 14, 0, 0);
        var end   = new DateTime(2026, 1, 1, 10, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        Assert.Equal(0m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_WhenUnknownPricingUnit_ReturnsZeroAmounts()
    {
        var rate  = CreateRate(100m, (PricingUnit)999);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end   = new DateTime(2026, 1, 2, 10, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        Assert.Equal(0m, result.BasePrice);
        Assert.Equal(0m, result.TotalAmountToPay);
    }

    [Fact]
    public void Calculate_PerSessionWithZeroFixedDuration_UsesSingleUnit()
    {
        var rate  = CreateRate(95m, PricingUnit.PerSession, fixedDurationMinutes: 0);
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end   = new DateTime(2026, 1, 1, 14, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        Assert.Equal(95m, result.BasePrice);
    }

    [Fact]
    public void Calculate_WhenRateIsNull_ThrowsNullReferenceException()
    {
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var end   = new DateTime(2026, 1, 1, 12, 0, 0);

        Assert.Throws<NullReferenceException>(() => _sut.Calculate(null!, start, end, petCount: 1));
    }

    [Fact]
    public void Calculate_PerNightEndBeforeStartStillUsesMinimumOneNight()
    {
        var rate  = CreateRate(50m, PricingUnit.PerNight);
        var start = new DateTime(2026, 1, 5, 18, 0, 0);
        var end   = new DateTime(2026, 1, 3, 10, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        Assert.Equal(50m, result.BasePrice);
    }

    /// <summary>Hypothetical ₪70 base-price service — the canonical product example.</summary>
    [Fact]
    public void Calculate_BasePriceSeventy_MatchesDocumentedSplitFeeExample()
    {
        var rate  = CreateRate(70m, PricingUnit.PerVisit);
        var start = new DateTime(2026, 6, 1, 10, 0, 0);
        var end   = new DateTime(2026, 6, 1, 11, 0, 0);

        var result = _sut.Calculate(rate, start, end, petCount: 1);

        // BasePrice   = 70.00
        // ClientFee   = 70 × 0.10 = 7.00
        // TotalCharged= 70 + 7 = 77.00
        // ProviderFee = 70 × 0.04 = 2.80
        // ProviderNet = 70 − 2.80 = 67.20
        Assert.Equal(70.00m, result.BasePrice);
        Assert.Equal(7.00m,  result.ClientFee);
        Assert.Equal(77.00m, result.TotalAmountToPay);
        Assert.Equal(2.80m,  result.ProviderFee);
        Assert.Equal(67.20m, result.ProviderNetAmount);
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private static ProviderServiceRate CreateRate(
        decimal basePrice,
        PricingUnit unit,
        int? fixedDurationMinutes = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            ProviderProfileId = Guid.NewGuid(),
            Service = ServiceType.DogWalking,
            Rate = basePrice,
            Unit = unit,
            FixedDurationMinutes = fixedDurationMinutes,
        };
}
