namespace PetOwner.Data.Models;

public class Service
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Category { get; set; } = null!;

    public ICollection<ProviderService> ProviderServices { get; set; } = [];
    public ICollection<ServiceRequest> ServiceRequests { get; set; } = [];
}
