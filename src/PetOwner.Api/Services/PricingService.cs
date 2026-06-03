using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

/// <summary>
/// Split-fee marketplace model (Airbnb-style).
///
/// ProviderServiceRate.Rate = the provider's advertised base price per billing unit.
///
///   BasePrice       = Rate × durationUnits × pets
///   ClientFee       = BasePrice × 0.10   (added on top — paid by customer)
///   TotalAmountToPay= BasePrice + ClientFee
///   ProviderFee     = BasePrice × 0.04   (deducted from base — platform commission)
///   ProviderNetAmount = BasePrice - ProviderFee
/// </summary>
public record PricingBreakdown(
    decimal BasePrice,
    decimal ClientFee,
    decimal TotalAmountToPay,
    decimal ProviderFee,
    decimal ProviderNetAmount);

public interface IPricingService
{
    /// <summary>
    /// Calculates the full booking breakdown.
    /// <paramref name="rate"/>.Rate is the provider's base price per billing unit.
    /// </summary>
    PricingBreakdown Calculate(ProviderServiceRate rate, DateTime start, DateTime end, int petCount);
}

public class PricingService : IPricingService
{
    /// <summary>10 % of base charged to the customer on top of the base price.</summary>
    private const decimal ClientFeeRate = 0.10m;

    /// <summary>4 % of base deducted from the provider's payout (platform commission).</summary>
    private const decimal ProviderFeeRate = 0.04m;

    public PricingBreakdown Calculate(ProviderServiceRate rate, DateTime start, DateTime end, int petCount)
    {
        var pets = Math.Max(1, petCount);
        var durationUnits = ComputeDurationUnits(rate, start, end);

        var unitRate = rate.Rate < 0 ? 0m : rate.Rate;

        var basePrice   = Math.Round(unitRate * durationUnits * pets, 2, MidpointRounding.AwayFromZero);
        var clientFee   = Math.Round(basePrice * ClientFeeRate,  2, MidpointRounding.AwayFromZero);
        var total       = Math.Round(basePrice + clientFee,       2, MidpointRounding.AwayFromZero);
        var providerFee = Math.Round(basePrice * ProviderFeeRate, 2, MidpointRounding.AwayFromZero);
        var providerNet = Math.Round(basePrice - providerFee,     2, MidpointRounding.AwayFromZero);

        return new PricingBreakdown(basePrice, clientFee, total, providerFee, providerNet);
    }

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
