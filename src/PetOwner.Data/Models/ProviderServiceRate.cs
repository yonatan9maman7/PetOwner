namespace PetOwner.Data.Models;

public class ProviderServiceRate
{
    public Guid Id { get; set; }
    public Guid ProviderProfileId { get; set; }
    public ServiceType Service { get; set; }
    public decimal Rate { get; set; }
    public PricingUnit Unit { get; set; }

    public ProviderProfile ProviderProfile { get; set; } = null!;
}
