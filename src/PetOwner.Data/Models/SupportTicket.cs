namespace PetOwner.Data.Models;

public class SupportTicket
{
    public Guid Id { get; set; }
    public Guid? BookingId { get; set; }
    public Guid UserId { get; set; }
    public TicketCategory Category { get; set; }
    public TicketUrgency Urgency { get; set; }
    public TicketStatus Status { get; set; }
    public string Description { get; set; } = string.Empty;
    public TicketFinancialDecision FinancialDecision { get; set; }
    public string? AssignedTo { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ServiceRequest? Booking { get; set; }
    public User? User { get; set; }
}
