namespace PetOwner.Data.Models;

public class Post
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = null!;
    public string? ImageUrl { get; set; }
    public int LikeCount { get; set; }
    public int CommentCount { get; set; }
    public DateTime CreatedAt { get; set; }

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? City { get; set; }

    public User User { get; set; } = null!;
    public ICollection<PostLike> Likes { get; set; } = new List<PostLike>();
    public ICollection<PostComment> Comments { get; set; } = new List<PostComment>();
}

public class PostLike
{
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Post Post { get; set; } = null!;
    public User User { get; set; } = null!;
}

public class PostComment
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public Post Post { get; set; } = null!;
    public User User { get; set; } = null!;
}
