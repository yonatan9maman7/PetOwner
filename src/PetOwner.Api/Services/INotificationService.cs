namespace PetOwner.Api.Services;

public interface INotificationService
{
    Task CreateAsync(Guid userId, string type, string title, string message, Guid? relatedEntityId = null);
    Task BroadcastAsync(string type, string title, string message, Guid? relatedEntityId = null);

    /// <summary>Notify users with a saved location within roughly <paramref name="radiusKm"/> km of a point.</summary>
    Task NotifyUsersNearLocationAsync(
        double latitude,
        double longitude,
        double radiusKm,
        string type,
        string title,
        string message,
        Guid? relatedEntityId = null);
}
