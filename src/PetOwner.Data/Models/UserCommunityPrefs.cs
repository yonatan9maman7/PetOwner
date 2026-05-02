namespace PetOwner.Data.Models;

/// <summary>Per-user community privacy and visibility preferences.</summary>
public class UserCommunityPrefs
{
    public Guid UserId { get; set; }

    /// <summary>When false, client should show approximate location only.</summary>
    public bool ShowExactLocation { get; set; } = true;

    /// <summary>Everyone | Friends | Nobody</summary>
    public string DmPolicy { get; set; } = "Everyone";

    public bool AllowMeetupInvites { get; set; } = true;

    public bool ShowDogInCommunity { get; set; } = true;

    public User User { get; set; } = null!;
}
