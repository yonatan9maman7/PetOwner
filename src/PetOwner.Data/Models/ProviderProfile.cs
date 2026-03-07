namespace PetOwner.Data.Models;

public class ProviderProfile
{
    public Guid UserId { get; set; }
    public string? Bio { get; set; }
    public string? ProfileImageUrl { get; set; }
    public decimal HourlyRate { get; set; }
    public string Status { get; set; } = "Pending";
    public bool IsAvailableNow { get; set; }
    public decimal? AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public string? StripeConnectAccountId { get; set; }
    public bool AcceptsOffHoursRequests { get; set; } = true;

    public User User { get; set; } = null!;
    public ICollection<ProviderService> ProviderServices { get; set; } = [];
    public ICollection<AvailabilitySlot> AvailabilitySlots { get; set; } = [];
}
