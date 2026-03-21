using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(ApplicationDbContext db, ILogger<WebhooksController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Simulates a webhook callback from the Grow payment gateway.
    /// In production, validate the signature/secret before processing.
    /// </summary>
    [HttpPost("grow")]
    public async Task<IActionResult> GrowWebhook([FromBody] GrowWebhookPayload payload)
    {
        if (payload.BookingId == Guid.Empty)
            return BadRequest(new { message = "BookingId is required." });

        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == payload.BookingId);
        if (booking is null)
        {
            _logger.LogWarning("Grow webhook received for unknown booking {BookingId}", payload.BookingId);
            return NotFound(new { message = "Booking not found." });
        }

        booking.TransactionId = payload.TransactionId;

        if (string.Equals(payload.Status, "Success", StringComparison.OrdinalIgnoreCase))
        {
            booking.PaymentStatus = PaymentStatus.Paid;
            _logger.LogInformation("Booking {BookingId} marked as Paid via Grow webhook (txn: {TransactionId})",
                booking.Id, payload.TransactionId);
        }
        else if (string.Equals(payload.Status, "Failed", StringComparison.OrdinalIgnoreCase))
        {
            booking.PaymentStatus = PaymentStatus.Failed;
            _logger.LogWarning("Booking {BookingId} payment failed via Grow webhook (txn: {TransactionId})",
                booking.Id, payload.TransactionId);
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = "Webhook processed." });
    }
}

public record GrowWebhookPayload(
    string? TransactionId,
    Guid BookingId,
    string Status
);
