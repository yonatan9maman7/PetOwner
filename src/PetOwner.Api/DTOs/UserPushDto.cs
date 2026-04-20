namespace PetOwner.Api.DTOs;

public record RegisterPushTokenDto(string Token, string Platform);
public record RemovePushTokenDto(string Token);

public record NotificationPrefsDto(
    bool Push,
    bool Messages,
    bool Bookings,
    bool Community,
    bool Triage,
    bool Marketing,
    bool Achievements);
