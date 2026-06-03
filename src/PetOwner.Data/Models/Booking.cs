namespace PetOwner.Data.Models;

public class Booking
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public Guid ProviderProfileId { get; set; }
    public ServiceType Service { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    /// <summary>Provider's advertised base price for this booking (rate × units × pets).</summary>
    public decimal BasePrice { get; set; }

    /// <summary>10 % fee added on top of <see cref="BasePrice"/> — paid by the customer.</summary>
    public decimal ClientFee { get; set; }

    /// <summary>Total charged to the customer: <see cref="BasePrice"/> + <see cref="ClientFee"/>.</summary>
    public decimal TotalPrice { get; set; }

    /// <summary>4 % of <see cref="BasePrice"/> deducted from the provider's payout (platform commission).</summary>
    public decimal ProviderFee { get; set; }

    /// <summary>What the provider actually earns: <see cref="BasePrice"/> − <see cref="ProviderFee"/>.</summary>
    public decimal ProviderNetAmount { get; set; }

    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public string? PaymentUrl { get; set; }
    public string? TransactionId { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Notes { get; set; }

    /// <summary>When the provider first responded (confirm/decline). Used for response-time stats.</summary>
    public DateTime? RespondedAt { get; set; }

    /// <summary>Who cancelled this booking (Owner vs Provider). Null when not cancelled.</summary>
    public BookingActorRole? CancelledByRole { get; set; }

    /// <summary>
    /// Free-text or predefined-reason description supplied by the cancelling party.
    /// Collected at cancel/decline time in the mobile app.
    /// Max 500 characters.
    /// </summary>
    public string? CancellationReason { get; set; }

    public User Owner { get; set; } = null!;
    public ProviderProfile ProviderProfile { get; set; } = null!;
    public Review? Review { get; set; }
    public ICollection<BookingPet> BookingPets { get; set; } = new List<BookingPet>();
}
