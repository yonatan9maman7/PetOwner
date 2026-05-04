namespace PetOwner.Data.Models;

/// <summary>Catalog entry for a known dog park (server-side list for maps).</summary>
public class DogPark
{
    public Guid Id { get; set; }
    /// <summary>Optional Google Places <c>place_id</c> for sync upserts.</summary>
    public string? ExternalPlaceId { get; set; }
    public string Name { get; set; } = "";
    public string Address { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public bool IsActive { get; set; } = true;
}
