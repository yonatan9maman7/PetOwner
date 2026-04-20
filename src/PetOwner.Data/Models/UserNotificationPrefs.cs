namespace PetOwner.Data.Models;

/// <summary>
/// Stores per-user push notification category preferences.
/// One-to-one with User (UserId is both PK and FK).
/// Created on first access with all defaults set to true.
/// </summary>
public class UserNotificationPrefs
{
    public Guid UserId { get; set; }

    /// <summary>Master push toggle. When false, no push is sent regardless of category prefs.</summary>
    public bool PushEnabled { get; set; } = true;

    public bool Messages { get; set; } = true;
    public bool Bookings { get; set; } = true;
    public bool Community { get; set; } = true;
    public bool Triage { get; set; } = true;
    public bool Marketing { get; set; } = true;

    /// <summary>Notify when a stats milestone (achievement) is unlocked.</summary>
    public bool Achievements { get; set; } = true;

    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
}
