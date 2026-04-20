namespace PetOwner.Data.Models;

public class PlaydatePrefs
{
    public Guid UserId { get; set; }
    public bool OptedIn { get; set; }
    public int MaxDistanceKm { get; set; } = 5;
    public string? Bio { get; set; }
    public string PreferredSpeciesCsv { get; set; } = "";
    public string PreferredDogSizesCsv { get; set; } = "";
    public bool IncludeAsProvider { get; set; }
    public DateTime LastActiveAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
}
