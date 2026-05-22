using Microsoft.EntityFrameworkCore;
using NSubstitute;
using PetOwner.Api.Services;
using PetOwner.Api.Tests.Infrastructure;
using PetOwner.Data;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Services;

public class AchievementServiceTests
{
    // --- Owner ---

    [Fact]
    public async Task EvaluateOwnerAsync_WhenNoPaidBookings_DoesNotUnlockOrNotify()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateOwnerAsync(ownerId);

        // Assert
        Assert.Empty(await db.AchievementsUnlocked.ToListAsync());
        await notifications.DidNotReceiveWithAnyArgs().CreateAsync(default, default!, default!, default!, default);
    }

    [Fact]
    public async Task EvaluateOwnerAsync_WhenOnePaidBooking_UnlocksFirstPaidAndNotifies()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, providerId, "Provider", isProvider: true);
        await SeedPaidBookingsAsync(db, ownerId, providerId, count: 1);
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateOwnerAsync(ownerId);

        // Assert
        Assert.Contains(await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync(), c => c == "owner.first_paid");
        await notifications.Received(1).CreateAsync(
            ownerId,
            "AchievementUnlocked",
            Arg.Any<string>(),
            Arg.Is<string>(m => m.Contains("owner.first_paid")),
            null);
    }

    [Theory]
    [InlineData(5, "owner.5_paid")]
    [InlineData(10, "owner.10_paid")]
    [InlineData(25, "owner.25_paid")]
    public async Task EvaluateOwnerAsync_WhenPaidBookingTiers_ReachesExpectedMilestone(int paidCount, string expectedCode)
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, providerId, "Provider", isProvider: true);
        await SeedPaidBookingsAsync(db, ownerId, providerId, count: paidCount);
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateOwnerAsync(ownerId);

        // Assert
        Assert.Contains(expectedCode, await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync());
    }

    [Fact]
    public async Task EvaluateOwnerAsync_WhenUnpaidBookingsOnly_DoesNotUnlockFirstPaid()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, providerId, "Provider", isProvider: true);
        await SeedPaidBookingsAsync(db, ownerId, providerId, count: 1, paymentStatus: PaymentStatus.Pending);
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateOwnerAsync(ownerId);

        // Assert
        Assert.DoesNotContain(await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync(), c => c == "owner.first_paid");
    }

    [Fact]
    public async Task EvaluateOwnerAsync_WhenOneReview_UnlocksFirstReview()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var revieweeId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, revieweeId, "Provider", isProvider: true);
        await SeedReviewAsync(db, ownerId, revieweeId);
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateOwnerAsync(ownerId);

        // Assert
        Assert.Contains("owner.first_review", await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync());
    }

    [Fact]
    public async Task EvaluateOwnerAsync_WhenTenReviews_UnlocksTenReviewsMilestone()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var revieweeId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, revieweeId, "Provider", isProvider: true);
        for (var i = 0; i < 10; i++)
            await SeedReviewAsync(db, ownerId, revieweeId);
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateOwnerAsync(ownerId);

        // Assert
        Assert.Contains("owner.10_reviews", await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync());
    }

    [Fact]
    public async Task EvaluateOwnerAsync_WhenOneFavorite_UnlocksFirstFavorite()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, providerId, "Provider", isProvider: true);
        await SeedFavoriteAsync(db, ownerId, providerId);
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateOwnerAsync(ownerId);

        // Assert
        Assert.Contains("owner.first_favorite", await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync());
    }

    [Fact]
    public async Task EvaluateOwnerAsync_WhenMilestoneAlreadyUnlocked_DoesNotNotifyAgain()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, providerId, "Provider", isProvider: true);
        await SeedPaidBookingsAsync(db, ownerId, providerId, count: 1);
        db.AchievementsUnlocked.Add(new AchievementUnlocked
        {
            Id = Guid.NewGuid(),
            UserId = ownerId,
            Code = "owner.first_paid",
            Scope = "owner",
            UnlockedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateOwnerAsync(ownerId);

        // Assert
        Assert.Equal(1, await db.AchievementsUnlocked.CountAsync(a => a.Code == "owner.first_paid"));
        await notifications.DidNotReceiveWithAnyArgs().CreateAsync(default, default!, default!, default!, default);
    }

    // --- Provider ---

    [Fact]
    public async Task EvaluateProviderAsync_WhenOnePaidBooking_UnlocksProviderFirstPaid()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, providerId, "Provider", isProvider: true);
        await SeedPaidBookingsAsync(db, ownerId, providerId, count: 1);
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateProviderAsync(providerId);

        // Assert
        Assert.Contains("provider.first_paid", await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync());
    }

    [Fact]
    public async Task EvaluateProviderAsync_WhenTenPaidAndTenReviews_UnlocksTenReviewsMilestone()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, providerId, "Provider", isProvider: true, reviewCount: 10);
        await SeedPaidBookingsAsync(db, ownerId, providerId, count: 10);
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateProviderAsync(providerId);

        // Assert
        Assert.Contains("provider.10_reviews", await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync());
    }

    [Fact]
    public async Task EvaluateProviderAsync_WhenStarSitterCriteriaMet_UnlocksStarSitter()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, providerId, "Provider", isProvider: true, averageRating: 4.9m, reviewCount: 5);
        await SeedPaidBookingsAsync(db, ownerId, providerId, count: 10);
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateProviderAsync(providerId);

        // Assert
        Assert.Contains("provider.star_sitter", await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync());
    }

    [Fact]
    public async Task EvaluateProviderAsync_WhenRatingBelowThreshold_DoesNotUnlockStarSitter()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, providerId, "Provider", isProvider: true, averageRating: 4.7m, reviewCount: 5);
        await SeedPaidBookingsAsync(db, ownerId, providerId, count: 10);
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateProviderAsync(providerId);

        // Assert
        Assert.DoesNotContain(await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync(), c => c == "provider.star_sitter");
    }

    [Fact]
    public async Task EvaluateProviderAsync_WhenNoProviderProfile_StillUnlocksPaidTiers()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedUserAsync(db, ownerId, "Owner");
        await SeedUserAsync(db, providerId, "Provider", isProvider: false);
        await SeedPaidBookingsAsync(db, ownerId, providerId, count: 1);
        var notifications = Substitute.For<INotificationService>();
        var sut = new AchievementService(db, notifications);

        // Act
        await sut.EvaluateProviderAsync(providerId);

        // Assert
        Assert.Contains("provider.first_paid", await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync());
        Assert.DoesNotContain(await db.AchievementsUnlocked.Select(a => a.Code).ToListAsync(), c => c == "provider.star_sitter");
    }

    // --- Helpers ---

    private static async Task SeedUserAsync(
        ApplicationDbContext db,
        Guid userId,
        string name,
        bool isProvider = false,
        decimal? averageRating = null,
        int reviewCount = 0)
    {
        var user = new User
        {
            Id = userId,
            Name = name,
            Email = $"{userId:N}@test.example",
            Phone = $"05{userId.ToString("N")[..8]}",
            Role = isProvider ? "Provider" : "Owner",
            CreatedAt = DateTime.UtcNow,
        };

        if (isProvider)
        {
            user.ProviderProfile = new ProviderProfile
            {
                UserId = userId,
                Status = ProviderStatus.Approved,
                City = "Tel Aviv",
                Street = "Main",
                BuildingNumber = "1",
                AverageRating = averageRating,
                ReviewCount = reviewCount,
            };
        }

        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    private static async Task SeedPaidBookingsAsync(
        ApplicationDbContext db,
        Guid ownerId,
        Guid providerProfileId,
        int count,
        PaymentStatus paymentStatus = PaymentStatus.Paid)
    {
        for (var i = 0; i < count; i++)
        {
            db.Bookings.Add(new Booking
            {
                Id = Guid.NewGuid(),
                OwnerId = ownerId,
                ProviderProfileId = providerProfileId,
                Service = ServiceType.DogWalking,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddHours(1),
                TotalPrice = 100m,
                PaymentStatus = paymentStatus,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedReviewAsync(ApplicationDbContext db, Guid reviewerId, Guid revieweeId)
    {
        db.Reviews.Add(new Review
        {
            Id = Guid.NewGuid(),
            ReviewerId = reviewerId,
            RevieweeId = revieweeId,
            Rating = 5,
            Comment = "Great",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private static async Task SeedFavoriteAsync(ApplicationDbContext db, Guid userId, Guid providerProfileId)
    {
        db.FavoriteProviders.Add(new FavoriteProvider
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ProviderProfileId = providerProfileId,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}
