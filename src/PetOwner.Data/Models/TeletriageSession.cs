namespace PetOwner.Data.Models;

public class TeletriageSession
{
    public Guid Id { get; set; }
    public Guid PetId { get; set; }
    public Guid UserId { get; set; }
    public string Symptoms { get; set; } = null!;
    public string? PetContext { get; set; }
    public string Severity { get; set; } = null!;
    public string Assessment { get; set; } = null!;
    public string? Recommendations { get; set; }
    public bool IsEmergency { get; set; }
    public DateTime CreatedAt { get; set; }

    public Pet Pet { get; set; } = null!;
    public User User { get; set; } = null!;
}
