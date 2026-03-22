namespace PetOwner.Data.Models;

public class Review
{
    public Guid Id { get; set; }
    public Guid? ServiceRequestId { get; set; }
    public Guid? BookingId { get; set; }
    public Guid ReviewerId { get; set; }
    public Guid RevieweeId { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public bool IsVerified { get; set; }
    public int? CommunicationRating { get; set; }
    public int? ReliabilityRating { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTime CreatedAt { get; set; }

    public ServiceRequest? ServiceRequest { get; set; }
    public Booking? Booking { get; set; }
    public User Reviewer { get; set; } = null!;
    public User Reviewee { get; set; } = null!;
}
