using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.Hubs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;
    private readonly IExpoPushService _expoPush;

    public NotificationService(
        ApplicationDbContext db,
        IHubContext<NotificationHub> hub,
        IExpoPushService expoPush)
    {
        _db = db;
        _hub = hub;
        _expoPush = expoPush;
    }

    public async Task CreateAsync(
        Guid userId,
        string type,
        string title,
        string message,
        Guid? relatedEntityId = null)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            RelatedEntityId = relatedEntityId,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();

        // 1. Real-time delivery via SignalR (app in foreground).
        await _hub.Clients.Group(userId.ToString()).SendAsync("NotificationReceived", new
        {
            notification.Id,
            notification.UserId,
            notification.Type,
            notification.Title,
            notification.Message,
            notification.RelatedEntityId,
            notification.IsRead,
            notification.CreatedAt,
        });

        // 2. Push delivery via Expo (app in background or killed).
        await SendExpoPushAsync(userId, type, title, message, notification.Id, relatedEntityId);
    }

    public async Task BroadcastAsync(
        string type,
        string title,
        string message,
        Guid? relatedEntityId = null)
    {
        var userIds = await _db.Users
            .AsNoTracking()
            .Select(u => u.Id)
            .ToListAsync();

        var now = DateTime.UtcNow;
        var notifications = userIds.Select(uid => new Notification
        {
            Id = Guid.NewGuid(),
            UserId = uid,
            Type = type,
            Title = title,
            Message = message,
            RelatedEntityId = relatedEntityId,
            CreatedAt = now,
        }).ToList();

        _db.Notifications.AddRange(notifications);
        await _db.SaveChangesAsync();

        // 1. SignalR broadcast.
        foreach (var n in notifications)
        {
            await _hub.Clients.Group(n.UserId.ToString()).SendAsync("NotificationReceived", new
            {
                n.Id,
                n.UserId,
                n.Type,
                n.Title,
                n.Message,
                n.RelatedEntityId,
                n.IsRead,
                n.CreatedAt,
            });
        }

        // 2. Expo Push broadcast — bulk-fetch all prefs and tokens in two queries.
        var allPrefs = await _db.UserNotificationPrefs
            .AsNoTracking()
            .ToDictionaryAsync(p => p.UserId);

        var allTokens = await _db.UserPushTokens
            .AsNoTracking()
            .ToListAsync();

        var tokensByUser = allTokens
            .GroupBy(t => t.UserId)
            .ToDictionary(g => g.Key, g => g.Select(t => t.Token).ToList());

        foreach (var n in notifications)
        {
            allPrefs.TryGetValue(n.UserId, out var prefs);
            if (prefs is not null && (!prefs.PushEnabled || !MatchesCategory(prefs, type)))
                continue;
            if (!tokensByUser.TryGetValue(n.UserId, out var tokens) || tokens.Count == 0)
                continue;

            // Fire-and-forget per user (errors logged inside ExpoPushService).
            _ = _expoPush.SendAsync(tokens, title, message, new
            {
                type,
                relatedEntityId,
                notificationId = n.Id,
            });
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private async Task SendExpoPushAsync(
        Guid userId,
        string type,
        string title,
        string message,
        Guid notificationId,
        Guid? relatedEntityId)
    {
        var prefs = await _db.UserNotificationPrefs
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        // If prefs don't exist yet, treat all categories as enabled (opt-in by default).
        if (prefs is not null && (!prefs.PushEnabled || !MatchesCategory(prefs, type)))
            return;

        var tokens = await _db.UserPushTokens
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .Select(t => t.Token)
            .ToListAsync();

        if (tokens.Count == 0) return;

        await _expoPush.SendAsync(tokens, title, message, new
        {
            type,
            relatedEntityId,
            notificationId,
        });
    }

    /// <summary>
    /// Maps a notification type string to the matching category preference flag.
    /// Returns true for unknown types (forward-compatible: new types default to allowed).
    /// </summary>
    private static bool MatchesCategory(UserNotificationPrefs prefs, string type) =>
        type switch
        {
            "CHAT_MESSAGE" or "NEW_MESSAGE"
                => prefs.Messages,

            "BOOKING_CREATED" or "BOOKING_CONFIRMED"
            or "BOOKING_CANCELLED" or "PAYMENT_RECEIVED"
                => prefs.Bookings,

            "GROUP_POST" or "POST_COMMENT" or "POST_LIKE"
                => prefs.Community,

            "TRIAGE_RESULT" or "VACCINE_DUE" or "SOS_ALERT"
                => prefs.Triage,

            "PROMOTION" or "ANNOUNCEMENT"
                => prefs.Marketing,

            _ => true,
        };
}
