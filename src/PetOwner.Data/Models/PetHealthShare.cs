namespace PetOwner.Data.Models;

public class PetHealthShare
{
    public Guid Id { get; set; }
    public Guid PetId { get; set; }
    public string Token { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public Pet Pet { get; set; } = null!;
}
