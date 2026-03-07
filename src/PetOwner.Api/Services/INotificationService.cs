namespace PetOwner.Api.Services;

public interface INotificationService
{
    Task CreateAsync(Guid userId, string type, string title, string body, string? referenceId = null);
}
