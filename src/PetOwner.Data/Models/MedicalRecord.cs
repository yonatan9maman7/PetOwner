namespace PetOwner.Data.Models;

public class MedicalRecord
{
    public Guid Id { get; set; }
    public Guid PetId { get; set; }
    public string Type { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public DateTime Date { get; set; }
    public string? DocumentUrl { get; set; }
    public DateTime CreatedAt { get; set; }

    public Pet Pet { get; set; } = null!;
}
