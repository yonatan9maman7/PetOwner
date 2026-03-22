namespace PetOwner.Data.Models;

public class FavoriteProvider
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ProviderProfileId { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public ProviderProfile ProviderProfile { get; set; } = null!;
}
