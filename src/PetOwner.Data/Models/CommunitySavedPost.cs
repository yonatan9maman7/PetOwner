namespace PetOwner.Data.Models;

public class CommunitySavedPost
{
    public Guid UserId { get; set; }
    public Guid PostId { get; set; }
    public DateTime SavedAt { get; set; }

    public User User { get; set; } = null!;
    public Post Post { get; set; } = null!;
}
