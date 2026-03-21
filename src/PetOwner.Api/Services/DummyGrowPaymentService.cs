using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

/// <summary>
/// Mock implementation — swap with real Grow API HTTP calls when ready.
/// </summary>
public class DummyGrowPaymentService : IGrowPaymentService
{
    public Task<string> GeneratePaymentLinkAsync(Booking booking)
    {
        var url = $"https://checkout.grow-pay.com/mock-session/{booking.Id}";
        return Task.FromResult(url);
    }
}
