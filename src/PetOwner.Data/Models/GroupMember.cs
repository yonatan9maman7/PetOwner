namespace PetOwner.Data.Models;

public class GroupMember
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
    public DateTime JoinedAt { get; set; }

    public CommunityGroup Group { get; set; } = null!;
    public User User { get; set; } = null!;
}
