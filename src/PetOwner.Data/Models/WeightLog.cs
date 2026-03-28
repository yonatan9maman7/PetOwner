namespace PetOwner.Data.Models;

public class WeightLog
{
    public Guid Id { get; set; }
    public Guid PetId { get; set; }
    public decimal Weight { get; set; }
    public DateTime DateRecorded { get; set; }
    public DateTime CreatedAt { get; set; }

    public Pet Pet { get; set; } = null!;
}
