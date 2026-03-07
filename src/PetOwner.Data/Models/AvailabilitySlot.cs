namespace PetOwner.Data.Models;

public class AvailabilitySlot
{
    public Guid Id { get; set; }
    public Guid ProviderId { get; set; }
    public int DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }

    public ProviderProfile Provider { get; set; } = null!;
}
