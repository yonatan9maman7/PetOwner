using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

public interface IGrowPaymentService
{
    /// <summary>
    /// Creates a Grow payment-page URL for the given booking.
    /// With <c>Grow:ChargeType = 2</c> (default) this issues a J5 authorization/hold;
    /// the funds are not yet captured. Call <see cref="CapturePaymentAsync"/> on completion.
    /// </summary>
    Task<string> GeneratePaymentLinkAsync(Booking booking);

    /// <summary>
    /// Captures (charges) a previously authorized transaction.
    /// Call after the provider marks the booking as Complete.
    /// </summary>
    /// <param name="transactionId">The Grow <c>transactionCode</c> stored on the booking.</param>
    /// <param name="amount">Amount to capture — must match the authorized amount.</param>
    /// <returns><c>true</c> if capture succeeded; <c>false</c> on gateway rejection.</returns>
    Task<bool> CapturePaymentAsync(string transactionId, decimal amount);

    /// <summary>
    /// Voids (releases) a previously authorized hold.
    /// Call when a booking with <c>PaymentStatus.Authorized</c> is cancelled before capture.
    /// </summary>
    /// <param name="transactionId">The Grow <c>transactionCode</c> stored on the booking.</param>
    /// <returns><c>true</c> if void succeeded; <c>false</c> on gateway rejection.</returns>
    Task<bool> VoidPaymentAsync(string transactionId);
}
