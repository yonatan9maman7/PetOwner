namespace PetOwner.Data.Models;

public class Activity
{
    public Guid Id { get; set; }
    public Guid PetId { get; set; }
    public Guid UserId { get; set; }
    public string Type { get; set; } = null!; // Walk, Meal, Exercise, Weight
    public decimal? Value { get; set; } // e.g., distance in km, weight in kg, calories
    public int? DurationMinutes { get; set; }
    public string? Notes { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; }

    public Pet Pet { get; set; } = null!;
    public User User { get; set; } = null!;
}
