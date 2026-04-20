namespace PetOwner.Data.Models;

public class PlaydateBeacon
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string PlaceName { get; set; } = null!;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? City { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string PetIdsCsv { get; set; } = "";
    public string Species { get; set; } = "DOG";

    public User User { get; set; } = null!;
}
