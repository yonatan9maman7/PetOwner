namespace PetOwner.Api.Services;

/// <summary>
/// Evaluates milestone unlocks (e.g. "first booking", "10 services completed") for
/// owner and provider stats dashboards. Idempotent: existing rows are skipped via the
/// AchievementUnlocked unique index on (UserId, Code).
/// </summary>
public interface IAchievementService
{
    /// <summary>Re-evaluate owner-side achievements for the given user (called after a paid/completed booking).</summary>
    Task EvaluateOwnerAsync(Guid userId);

    /// <summary>Re-evaluate provider-side achievements for the given provider profile (called after a paid/completed booking).</summary>
    Task EvaluateProviderAsync(Guid providerProfileId);
}
