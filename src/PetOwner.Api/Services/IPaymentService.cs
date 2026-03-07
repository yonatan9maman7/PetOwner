namespace PetOwner.Api.Services;

public record CreatePaymentResult(string PaymentIntentId, string ClientSecret, long Amount, long PlatformFee);
public record CapturePaymentResult(string PaymentIntentId, string Status);
public record RefundResult(string RefundId, string Status, long AmountRefunded);

public interface IPaymentService
{
    Task<CreatePaymentResult> CreatePaymentIntentAsync(decimal amount, string currency, string bookingId, string? customerEmail = null);
    Task<CapturePaymentResult> CapturePaymentIntentAsync(string paymentIntentId);
    Task<RefundResult> RefundPaymentAsync(string paymentIntentId, long? amountInSmallestUnit = null);
}
