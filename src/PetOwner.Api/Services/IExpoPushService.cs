namespace PetOwner.Api.Services;

public interface IExpoPushService
{
    /// <summary>
    /// Sends a push notification to one or more Expo push tokens.
    /// Automatically batches into groups of ≤100 tokens per the Expo API limit.
    /// </summary>
    /// <param name="tokens">Collection of ExponentPushToken[...] strings.</param>
    /// <param name="title">Notification title shown on the device.</param>
    /// <param name="body">Notification body text.</param>
    /// <param name="data">Optional data payload forwarded to the app (deep-link info, etc.).</param>
    Task SendAsync(
        IEnumerable<string> tokens,
        string title,
        string body,
        object? data = null);
}
