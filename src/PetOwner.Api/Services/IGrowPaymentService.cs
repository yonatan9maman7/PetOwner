using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

public interface IGrowPaymentService
{
    Task<string> GeneratePaymentLinkAsync(Booking booking);
}
