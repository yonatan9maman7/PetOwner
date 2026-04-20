namespace PetOwner.Data.Models;

/// <summary>
/// Records that a user has unlocked a milestone achievement (e.g., first booking,
/// 10 services completed). Unique per (UserId, Code) so the AchievementService
/// can use the row's existence as a dedupe boundary for push notifications.
/// </summary>
public class AchievementUnlocked
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
    public DateTime UnlockedAt { get; set; }

    public User User { get; set; } = null!;
}
