namespace PetOwner.Data.Models;

public class Payment
{
    public Guid Id { get; set; }
    public Guid ServiceRequestId { get; set; }
    public string StripePaymentIntentId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal PlatformFee { get; set; }
    public string Currency { get; set; } = "ILS";
    public string Status { get; set; } = "Created";
    public DateTime CreatedAt { get; set; }
    public DateTime? CapturedAt { get; set; }
    public DateTime? RefundedAt { get; set; }
    public decimal? RefundAmount { get; set; }

    public ServiceRequest ServiceRequest { get; set; } = null!;
}
