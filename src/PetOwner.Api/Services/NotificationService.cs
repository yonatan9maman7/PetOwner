using Microsoft.AspNetCore.SignalR;
using PetOwner.Api.Hubs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;

    public NotificationService(ApplicationDbContext db, IHubContext<NotificationHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task CreateAsync(Guid userId, string type, string title, string message, Guid? relatedEntityId = null)
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

        await _hub.Clients.Group(userId.ToString()).SendAsync("NotificationReceived", new
        {
            notification.Id,
            notification.Type,
            notification.Title,
            notification.Message,
            notification.RelatedEntityId,
            notification.IsRead,
            notification.CreatedAt,
        });
    }
}
