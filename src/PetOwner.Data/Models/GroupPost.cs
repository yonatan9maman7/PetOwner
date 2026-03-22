namespace PetOwner.Data.Models;

public class GroupPost
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid AuthorId { get; set; }
    public string Content { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }

    public CommunityGroup Group { get; set; } = null!;
    public User Author { get; set; } = null!;
    public ICollection<GroupPostLike> Likes { get; set; } = [];
    public ICollection<GroupPostComment> Comments { get; set; } = [];
}

public class GroupPostLike
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; }

    public GroupPost Post { get; set; } = null!;
    public User User { get; set; } = null!;
}

public class GroupPostComment
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid AuthorId { get; set; }
    public string Content { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public GroupPost Post { get; set; } = null!;
    public User Author { get; set; } = null!;
}
