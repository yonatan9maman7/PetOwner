namespace PetOwner.Data.Models;

public class Vaccination
{
    public Guid Id { get; set; }
    public Guid PetId { get; set; }
    public VaccineName VaccineName { get; set; }
    public DateTime DateAdministered { get; set; }
    public DateTime? NextDueDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public Pet Pet { get; set; } = null!;
}
