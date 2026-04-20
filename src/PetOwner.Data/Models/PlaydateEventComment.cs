namespace PetOwner.Data.Models;

public class PlaydateEventComment
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public PlaydateEvent Event { get; set; } = null!;
    public User User { get; set; } = null!;
}
