using Microsoft.Extensions.Options;
using Stripe;

namespace PetOwner.Api.Services;

public class StripePaymentService : IPaymentService
{
    private readonly StripeSettings _settings;
    private readonly ILogger<StripePaymentService> _logger;

    public StripePaymentService(IOptions<StripeSettings> settings, ILogger<StripePaymentService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
        StripeConfiguration.ApiKey = _settings.SecretKey;
    }

    public async Task<CreatePaymentResult> CreatePaymentIntentAsync(
        decimal amount, string currency, string bookingId, string? customerEmail = null)
    {
        var amountInSmallestUnit = (long)(amount * 100);
        var platformFee = (long)(amountInSmallestUnit * _settings.PlatformFeePercent / 100.0);

        var options = new PaymentIntentCreateOptions
        {
            Amount = amountInSmallestUnit,
            Currency = currency,
            CaptureMethod = "manual",
            Metadata = new Dictionary<string, string>
            {
                ["bookingId"] = bookingId,
            },
        };

        if (!string.IsNullOrWhiteSpace(customerEmail))
            options.ReceiptEmail = customerEmail;

        var service = new PaymentIntentService();
        var intent = await service.CreateAsync(options);

        _logger.LogInformation(
            "PaymentIntent {IntentId} created for booking {BookingId}: {Amount} {Currency}",
            intent.Id, bookingId, amount, currency);

        return new CreatePaymentResult(intent.Id, intent.ClientSecret, amountInSmallestUnit, platformFee);
    }

    public async Task<CapturePaymentResult> CapturePaymentIntentAsync(string paymentIntentId)
    {
        var service = new PaymentIntentService();
        var intent = await service.CaptureAsync(paymentIntentId);

        _logger.LogInformation("PaymentIntent {IntentId} captured. Status: {Status}", intent.Id, intent.Status);

        return new CapturePaymentResult(intent.Id, intent.Status);
    }

    public async Task<RefundResult> RefundPaymentAsync(string paymentIntentId, long? amountInSmallestUnit = null)
    {
        var options = new RefundCreateOptions
        {
            PaymentIntent = paymentIntentId,
        };

        if (amountInSmallestUnit.HasValue)
            options.Amount = amountInSmallestUnit.Value;

        var service = new RefundService();
        var refund = await service.CreateAsync(options);

        _logger.LogInformation(
            "Refund {RefundId} for PaymentIntent {IntentId}: {Amount} refunded. Status: {Status}",
            refund.Id, paymentIntentId, refund.Amount, refund.Status);

        return new RefundResult(refund.Id, refund.Status, refund.Amount);
    }
}
