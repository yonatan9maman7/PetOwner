namespace PetOwner.Data.Models;

public class CommunitySosSighting
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }

    public Post Post { get; set; } = null!;
    public User User { get; set; } = null!;
}
