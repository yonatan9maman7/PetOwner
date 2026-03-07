namespace PetOwner.Data.Models;

public class ProviderService
{
    public Guid ProviderId { get; set; }
    public int ServiceId { get; set; }

    public ProviderProfile ProviderProfile { get; set; } = null!;
    public Service Service { get; set; } = null!;
}
