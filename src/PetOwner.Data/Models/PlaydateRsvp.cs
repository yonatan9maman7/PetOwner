namespace PetOwner.Data.Models;

public class PlaydateRsvp
{
    public Guid EventId { get; set; }
    public Guid UserId { get; set; }
    public Guid? PetId { get; set; }
    public RsvpStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public PlaydateEvent Event { get; set; } = null!;
    public User User { get; set; } = null!;
    public Pet? Pet { get; set; }
}
