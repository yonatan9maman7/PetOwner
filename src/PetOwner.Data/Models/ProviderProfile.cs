namespace PetOwner.Data.Models;

public class ProviderProfile
{
    public Guid UserId { get; set; }
    public ProviderType Type { get; set; } = ProviderType.Individual;
    public string? BusinessName { get; set; }
    public ServiceType? ServiceType { get; set; }
    public string? PhoneNumber { get; set; }
    public string? WhatsAppNumber { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? OpeningHours { get; set; }
    public bool IsEmergencyService { get; set; }
    public string? Description { get; set; }
    public string? Bio { get; set; }
    public string? ProfileImageUrl { get; set; }
    public ProviderStatus Status { get; set; } = ProviderStatus.Pending;
    public bool IsApproved => Status == ProviderStatus.Approved;
    public bool IsSuspended { get; set; }
    public string? SuspensionReason { get; set; }
    public bool IsAvailableNow { get; set; }
    public decimal? AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public string? StripeConnectAccountId { get; set; }

    /// <summary>Cumulative count of times this provider's profile page has been viewed by other users.</summary>
    public int ProfileViewCount { get; set; }

    /// <summary>Cumulative count of times this provider has appeared in a search/explore result list.</summary>
    public int SearchAppearanceCount { get; set; }
    public bool AcceptsOffHoursRequests { get; set; } = true;
    public string? ReferenceName { get; set; }
    public string? ReferenceContact { get; set; }

    /// <summary>Dog size bands this provider accepts (walking / boarding).</summary>
    public List<DogSize> AcceptedDogSizes { get; set; } = [];

    /// <summary>Max dogs per walk or max dogs hosted at once.</summary>
    public int? MaxDogsCapacity { get; set; }

    public string City { get; set; } = null!;
    public string Street { get; set; } = null!;
    public string BuildingNumber { get; set; } = null!;
    public string? ApartmentNumber { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public User User { get; set; } = null!;
    public ICollection<ProviderServiceRate> ServiceRates { get; set; } = new List<ProviderServiceRate>();
    public ICollection<ProviderService> ProviderServices { get; set; } = [];
    public ICollection<AvailabilitySlot> AvailabilitySlots { get; set; } = [];
}
