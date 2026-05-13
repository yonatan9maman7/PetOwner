using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

/// <summary>
/// Server-side pricing: provider net (stored rate), 10% platform commission via gross = net/0.9,
/// 4% customer service fee on gross. Total charged = gross + fee.
/// </summary>
public record PricingBreakdown(
    decimal ProviderNetAmount,
    decimal GrossAmount,
    decimal ServiceFee,
    decimal TotalAmountToPay);

public interface IPricingService
{
    /// <summary>
    /// <paramref name="rate"/>.Rate is interpreted as the provider's desired net per billing unit.
    /// </summary>
    PricingBreakdown Calculate(ProviderServiceRate rate, DateTime start, DateTime end, int petCount);
}

public class PricingService : IPricingService
{
    /// <summary>Provider receives 90% of gross; platform keeps 10% → gross = net / 0.9.</summary>
    private const decimal ProviderNetFractionOfGross = 0.9m;

    private const decimal CustomerFeeRate = 0.04m;

    public PricingBreakdown Calculate(ProviderServiceRate rate, DateTime start, DateTime end, int petCount)
    {
        var pets = Math.Max(1, petCount);
        var durationUnits = ComputeDurationUnits(rate, start, end);

        var netRate = rate.Rate;
        if (netRate < 0)
            netRate = 0;

        var grossRate = netRate / ProviderNetFractionOfGross;

        var providerNet = Math.Round(netRate * durationUnits * pets, 2, MidpointRounding.AwayFromZero);
        var gross = Math.Round(grossRate * durationUnits * pets, 2, MidpointRounding.AwayFromZero);
        var fee = Math.Round(gross * CustomerFeeRate, 2, MidpointRounding.AwayFromZero);
        var total = Math.Round(gross + fee, 2, MidpointRounding.AwayFromZero);

        return new PricingBreakdown(providerNet, gross, fee, total);
    }

    /// <summary>
    /// Billing unit count (nights, hours, visits, etc.) without rate — mirrors legacy
    /// <c>BookingsController.CalculateTotalPrice</c> divisor logic.
    /// </summary>
    private static decimal ComputeDurationUnits(ProviderServiceRate rate, DateTime start, DateTime end)
    {
        return rate.Unit switch
        {
            PricingUnit.PerNight => Math.Max(1, (end.Date - start.Date).Days),
            PricingUnit.PerHour => (decimal)Math.Max(0, (end - start).TotalHours),
            PricingUnit.PerVisit => 1m,
            PricingUnit.PerSession when rate.FixedDurationMinutes is > 0 =>
                (decimal)Math.Max(0, (end - start).TotalHours),
            PricingUnit.PerSession => 1m,
            PricingUnit.PerPackage => 1m,
            _ => 0m,
        };
    }
}
