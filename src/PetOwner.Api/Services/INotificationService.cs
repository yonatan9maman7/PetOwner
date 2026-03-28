namespace PetOwner.Api.Services;

public interface INotificationService
{
    Task CreateAsync(Guid userId, string type, string title, string message, Guid? relatedEntityId = null);
    Task BroadcastAsync(string type, string title, string message, Guid? relatedEntityId = null);
}
