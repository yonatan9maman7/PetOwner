namespace PetOwner.Data.Models;

/// <summary>Time-limited check-in at a dog park (place id + coordinates).</summary>
public class DogParkCheckIn
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? PetId { get; set; }

    public string PlaceId { get; set; } = "";
    public string PlaceName { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public DateTime StartedAt { get; set; }
    public DateTime ExpiresAt { get; set; }

    public User User { get; set; } = null!;
    public Pet? Pet { get; set; }
}
