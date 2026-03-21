namespace PetOwner.Data.Models;

public class ProviderProfile
{
    public Guid UserId { get; set; }
    public string? Bio { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string Status { get; set; } = "Pending";
    public bool IsAvailableNow { get; set; }
    public decimal? AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public string? StripeConnectAccountId { get; set; }
    public bool AcceptsOffHoursRequests { get; set; } = true;
    public string? ReferenceName { get; set; }
    public string? ReferenceContact { get; set; }

    public string City { get; set; } = null!;
    public string Street { get; set; } = null!;
    public string BuildingNumber { get; set; } = null!;
    public string? ApartmentNumber { get; set; }

    public User User { get; set; } = null!;
    public ICollection<ProviderServiceRate> ServiceRates { get; set; } = new List<ProviderServiceRate>();
    public ICollection<ProviderService> ProviderServices { get; set; } = [];
    public ICollection<AvailabilitySlot> AvailabilitySlots { get; set; } = [];
}
