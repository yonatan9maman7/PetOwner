namespace PetOwner.Data.Models;

public class ServiceRequest
{
    public Guid Id { get; set; }
    public Guid PetOwnerId { get; set; }
    public Guid ProviderId { get; set; }
    public Guid? PetId { get; set; }
    public int? ServiceId { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; }

    public DateTime? ScheduledStart { get; set; }
    public DateTime? ScheduledEnd { get; set; }
    public decimal? TotalPrice { get; set; }
    public string? Notes { get; set; }
    public string? CancellationReason { get; set; }
    public bool ShareMedicalRecords { get; set; }

    public User PetOwner { get; set; } = null!;
    public User Provider { get; set; } = null!;
    public Pet? Pet { get; set; }
    public Service? Service { get; set; }
    public Review? Review { get; set; }
    public Payment? Payment { get; set; }
}
