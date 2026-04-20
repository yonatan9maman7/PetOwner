using Microsoft.EntityFrameworkCore;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

public class AchievementService : IAchievementService
{
    private readonly ApplicationDbContext _db;
    private readonly INotificationService _notifications;

    public AchievementService(ApplicationDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    // ── Owner ──────────────────────────────────────────────────────────────────

    public async Task EvaluateOwnerAsync(Guid userId)
    {
        var paidBookings = await _db.Bookings
            .AsNoTracking()
            .CountAsync(b => b.OwnerId == userId && b.PaymentStatus == PaymentStatus.Paid);

        var reviewsWritten = await _db.Reviews
            .AsNoTracking()
            .CountAsync(r => r.ReviewerId == userId);

        var favoritesCount = await _db.FavoriteProviders
            .AsNoTracking()
            .CountAsync(f => f.UserId == userId);

        // Owner achievement codes — keep stable, mobile maps codes → translated label/icon.
        await UnlockIfAsync(userId, "owner.first_paid", "owner", paidBookings >= 1);
        await UnlockIfAsync(userId, "owner.5_paid", "owner", paidBookings >= 5);
        await UnlockIfAsync(userId, "owner.10_paid", "owner", paidBookings >= 10);
        await UnlockIfAsync(userId, "owner.25_paid", "owner", paidBookings >= 25);
        await UnlockIfAsync(userId, "owner.first_review", "owner", reviewsWritten >= 1);
        await UnlockIfAsync(userId, "owner.10_reviews", "owner", reviewsWritten >= 10);
        await UnlockIfAsync(userId, "owner.first_favorite", "owner", favoritesCount >= 1);
    }

    // ── Provider ───────────────────────────────────────────────────────────────

    public async Task EvaluateProviderAsync(Guid providerProfileId)
    {
        var paidBookings = await _db.Bookings
            .AsNoTracking()
            .CountAsync(b => b.ProviderProfileId == providerProfileId && b.PaymentStatus == PaymentStatus.Paid);

        var profile = await _db.ProviderProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == providerProfileId);

        var reviewCount = profile?.ReviewCount ?? 0;
        var rating = profile?.AverageRating ?? 0m;

        await UnlockIfAsync(providerProfileId, "provider.first_paid", "provider", paidBookings >= 1);
        await UnlockIfAsync(providerProfileId, "provider.5_paid", "provider", paidBookings >= 5);
        await UnlockIfAsync(providerProfileId, "provider.10_paid", "provider", paidBookings >= 10);
        await UnlockIfAsync(providerProfileId, "provider.25_paid", "provider", paidBookings >= 25);
        await UnlockIfAsync(providerProfileId, "provider.50_paid", "provider", paidBookings >= 50);
        await UnlockIfAsync(providerProfileId, "provider.100_paid", "provider", paidBookings >= 100);
        await UnlockIfAsync(providerProfileId, "provider.10_reviews", "provider", reviewCount >= 10);

        // Star sitter — Rover-style: 4.8+ avg AND 10+ paid bookings AND 5+ reviews.
        var isStar = rating >= 4.8m && paidBookings >= 10 && reviewCount >= 5;
        await UnlockIfAsync(providerProfileId, "provider.star_sitter", "provider", isStar);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Inserts the unlock row + sends an "Achievements" push if the milestone became true
    /// for the first time. Existing rows are skipped via the unique index.
    /// </summary>
    private async Task UnlockIfAsync(Guid userId, string code, string scope, bool unlocked)
    {
        if (!unlocked) return;

        var alreadyUnlocked = await _db.AchievementsUnlocked
            .AsNoTracking()
            .AnyAsync(a => a.UserId == userId && a.Code == code);

        if (alreadyUnlocked) return;

        try
        {
            _db.AchievementsUnlocked.Add(new AchievementUnlocked
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Code = code,
                Scope = scope,
                UnlockedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();

            // Title/message kept short — mobile picks the localized label by code; this is the
            // generic fallback used when the client routes the push directly.
            await _notifications.CreateAsync(
                userId,
                "AchievementUnlocked",
                "Milestone unlocked!",
                $"You've unlocked a new milestone: {code}",
                relatedEntityId: null);
        }
        catch (DbUpdateException)
        {
            // Race: another worker inserted the same row between our existence-check and SaveChanges.
            // Unique index protects integrity; nothing to do.
        }
    }
}
