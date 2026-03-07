namespace PetOwner.Data.Models;

public class Pet
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = null!;
    public string Species { get; set; } = null!;
    public int Age { get; set; }
    public string? Notes { get; set; }

    public User User { get; set; } = null!;
    public ICollection<MedicalRecord> MedicalRecords { get; set; } = new List<MedicalRecord>();
    public ICollection<TeletriageSession> TeletriageSessions { get; set; } = new List<TeletriageSession>();
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
}
