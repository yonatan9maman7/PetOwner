namespace PetOwner.Data.Models;

public class ContactInquiry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Topic { get; set; } = null!;
    public string? Subject { get; set; }
    public string Message { get; set; } = null!;
    public string? AppVersion { get; set; }
    public string? Platform { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }

    public User User { get; set; } = null!;
}
