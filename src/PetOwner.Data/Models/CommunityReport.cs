namespace PetOwner.Data.Models;

public class CommunityReport
{
    public Guid Id { get; set; }
    public Guid ReporterUserId { get; set; }

    /// <summary>Post | Comment | User | GroupPost</summary>
    public string TargetType { get; set; } = null!;
    public Guid TargetId { get; set; }

    public string Reason { get; set; } = "";
    public string Status { get; set; } = "Open";
    public DateTime CreatedAt { get; set; }

    public User Reporter { get; set; } = null!;
}
