namespace PetOwner.Data.Models;

public class Pet
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = null!;
    public PetSpecies Species { get; set; }
    public string? Breed { get; set; }
    public int Age { get; set; }
    public double? Weight { get; set; }
    public string? Allergies { get; set; }
    public string? MedicalConditions { get; set; }
    public bool IsNeutered { get; set; }
    public string? Notes { get; set; }
    public string? MedicalNotes { get; set; }
    public string? FeedingSchedule { get; set; }
    public string? MicrochipNumber { get; set; }
    public string? VetName { get; set; }
    public string? VetPhone { get; set; }
    public string? ImageUrl { get; set; }

    // SOS / Lost Pet fields
    public bool IsLost { get; set; }
    public string? LastSeenLocation { get; set; }
    public double? LastSeenLat { get; set; }
    public double? LastSeenLng { get; set; }
    public DateTime? LostAt { get; set; }
    public string? ContactPhone { get; set; }
    public Guid? CommunityPostId { get; set; }
    // Playdate Pals fields
    public DogSize? DogSize { get; set; }
    public string TagsCsv { get; set; } = "";
    public SterilizationStatus Sterilization { get; set; } = SterilizationStatus.Unknown;

    public User User { get; set; } = null!;
    public ICollection<MedicalRecord> MedicalRecords { get; set; } = new List<MedicalRecord>();
    public ICollection<Vaccination> Vaccinations { get; set; } = new List<Vaccination>();
    public ICollection<WeightLog> WeightLogs { get; set; } = new List<WeightLog>();
    public ICollection<TeletriageSession> TeletriageSessions { get; set; } = new List<TeletriageSession>();
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
}
