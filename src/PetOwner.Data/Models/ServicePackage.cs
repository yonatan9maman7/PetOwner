namespace PetOwner.Data.Models;

public class ServicePackage
{
    public Guid Id { get; set; }
    public Guid ProviderServiceRateId { get; set; }
    public string Title { get; set; } = null!;
    public decimal Price { get; set; }
    public string? Description { get; set; }

    public ProviderServiceRate ProviderServiceRate { get; set; } = null!;
}
