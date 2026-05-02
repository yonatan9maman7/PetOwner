namespace PetOwner.Data.Models;

public class PostHelpfulMark
{
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Post Post { get; set; } = null!;
    public User User { get; set; } = null!;
}
