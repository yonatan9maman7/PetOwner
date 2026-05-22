using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using PetOwner.Api.Hubs;
using PetOwner.Api.Services;
using PetOwner.Api.Tests.Infrastructure;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Services;

public class NotificationServiceTests
{
    [Fact]
    public async Task CreateAsync_WhenCalled_PersistsNotificationAndInvokesHub()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = userId,
            Name = "Recipient",
            Email = $"{userId:N}@test.example",
            Phone = "0501234567",
            Role = "Owner",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var (hub, clientProxy) = CreateHubSubstitute();
        var expo = Substitute.For<IExpoPushService>();
        var sut = new NotificationService(db, hub, expo);
        var relatedId = Guid.NewGuid();

        // Act
        await sut.CreateAsync(userId, "BookingCreated", "Title", "Message body", relatedId);

        // Assert
        var saved = await db.Notifications.SingleAsync();
        Assert.Equal(userId, saved.UserId);
        Assert.Equal("BookingCreated", saved.Type);
        Assert.Equal(relatedId, saved.RelatedEntityId);
        await clientProxy.Received(1).SendCoreAsync(
            "NotificationReceived",
            Arg.Any<object?[]>(),
            Arg.Any<CancellationToken>());
        await expo.DidNotReceive().SendAsync(
            Arg.Any<IReadOnlyList<string>>(),
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<object?>());
    }

    [Fact]
    public async Task CreateAsync_WhenPushTokensExist_CallsExpoPush()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = userId,
            Name = "Recipient",
            Email = $"{userId:N}@test.example",
            Phone = "0501234567",
            Role = "Owner",
            PreferredLanguage = "en-US",
            CreatedAt = DateTime.UtcNow,
        });
        db.UserPushTokens.Add(CreatePushToken(userId));
        await db.SaveChangesAsync();

        var (hub, _) = CreateHubSubstitute();
        var expo = Substitute.For<IExpoPushService>();
        var sut = new NotificationService(db, hub, expo);

        // Act
        await sut.CreateAsync(userId, "BookingCreated", "Title", "Message", null);

        // Assert
        await expo.Received(1).SendAsync(
            Arg.Is<IReadOnlyList<string>>(t => t.Count == 1),
            "Title",
            "Message",
            Arg.Any<object?>());
    }

    [Fact]
    public async Task CreateAsync_WhenPushDisabledInPrefs_SkipsExpoPush()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = userId,
            Name = "Recipient",
            Email = $"{userId:N}@test.example",
            Phone = "0501234567",
            Role = "Owner",
            CreatedAt = DateTime.UtcNow,
        });
        db.UserNotificationPrefs.Add(new UserNotificationPrefs
        {
            UserId = userId,
            PushEnabled = false,
        });
        db.UserPushTokens.Add(CreatePushToken(userId));
        await db.SaveChangesAsync();

        var (hub, _) = CreateHubSubstitute();
        var expo = Substitute.For<IExpoPushService>();
        var sut = new NotificationService(db, hub, expo);

        // Act
        await sut.CreateAsync(userId, "BookingCreated", "Title", "Message", null);

        // Assert
        await expo.DidNotReceive().SendAsync(
            Arg.Any<IReadOnlyList<string>>(),
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<object?>());
    }

    [Fact]
    public async Task CreateAsync_WhenI18nKeyAndEnglishUser_ResolvesEnglishPushText()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = userId,
            Name = "Recipient",
            Email = $"{userId:N}@test.example",
            Phone = "0501234567",
            Role = "Owner",
            PreferredLanguage = "en",
            CreatedAt = DateTime.UtcNow,
        });
        db.UserPushTokens.Add(CreatePushToken(userId));
        await db.SaveChangesAsync();

        var (hub, _) = CreateHubSubstitute();
        var expo = Substitute.For<IExpoPushService>();
        var sut = new NotificationService(db, hub, expo);

        // Act
        await sut.CreateAsync(userId, "Test", "NOTIFICATIONS.PROVIDER_APPROVED_TITLE", "NOTIFICATIONS.PROVIDER_APPROVED", null);

        // Assert
        await expo.Received(1).SendAsync(
            Arg.Any<IReadOnlyList<string>>(),
            "🎉 Provider Approved",
            Arg.Any<string>(),
            Arg.Any<object?>());
    }

    [Fact]
    public async Task NotifyUsersNearLocationAsync_WhenUserWithinRadius_CreatesNotification()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = userId,
            Name = "Nearby",
            Email = $"{userId:N}@test.example",
            Phone = "0501234567",
            Role = "Owner",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            Location = new PetOwner.Data.Models.Location
            {
                UserId = userId,
                GeoLocation = new NetTopologySuite.Geometries.Point(34.78, 32.08) { SRID = 4326 },
            },
        });
        await db.SaveChangesAsync();

        var (hub, _) = CreateHubSubstitute();
        var expo = Substitute.For<IExpoPushService>();
        var sut = new NotificationService(db, hub, expo);

        // Act
        await sut.NotifyUsersNearLocationAsync(32.08, 34.78, 5, "SOS_ALERT", "SOS", "Alert", null);

        // Assert
        Assert.Single(await db.Notifications.Where(n => n.UserId == userId).ToListAsync());
    }

    private static UserPushToken CreatePushToken(Guid userId)
    {
        var now = DateTime.UtcNow;
        return new UserPushToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = "ExponentPushToken[test]",
            Platform = "ios",
            CreatedAt = now,
            LastUsedAt = now,
        };
    }

    private static (IHubContext<NotificationHub> Hub, IClientProxy ClientProxy) CreateHubSubstitute()
    {
        var clientProxy = Substitute.For<IClientProxy>();
        clientProxy
            .SendCoreAsync(Arg.Any<string>(), Arg.Any<object?[]>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        var hubClients = Substitute.For<IHubClients>();
        hubClients.Group(Arg.Any<string>()).Returns(clientProxy);

        var hub = Substitute.For<IHubContext<NotificationHub>>();
        hub.Clients.Returns(hubClients);

        return (hub, clientProxy);
    }
}
