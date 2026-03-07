using NetTopologySuite.Geometries;

namespace PetOwner.Data.Models;

public class Location
{
    public Guid UserId { get; set; }
    public Point? GeoLocation { get; set; }
    public string? Address { get; set; }

    public User User { get; set; } = null!;
}
