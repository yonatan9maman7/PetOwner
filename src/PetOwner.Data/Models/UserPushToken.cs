namespace PetOwner.Data.Models;

public class UserPushToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    /// <summary>ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxxxx]</summary>
    public string Token { get; set; } = null!;

    /// <summary>"ios" or "android"</summary>
    public string Platform { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
    public DateTime LastUsedAt { get; set; }

    public User User { get; set; } = null!;
}
