namespace PetOwner.Data.Models;

public class Booking
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public Guid ProviderProfileId { get; set; }
    public ServiceType Service { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal TotalPrice { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public string? PaymentUrl { get; set; }
    public string? TransactionId { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Notes { get; set; }

    public User Owner { get; set; } = null!;
    public ProviderProfile ProviderProfile { get; set; } = null!;
}
