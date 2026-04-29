namespace PetOwner.Data.Models;

public class CommunityGroup
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public string? TargetCountry { get; set; }
    public string? TargetCity { get; set; }

    public ICollection<GroupPost> Posts { get; set; } = [];
    public ICollection<GroupMember> Members { get; set; } = [];
}
