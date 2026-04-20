using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/webhooks")]
[AllowAnonymous]
public class WebhooksController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly GrowSettings _growSettings;
    private readonly ILogger<WebhooksController> _logger;
    private readonly IAchievementService _achievements;

    public WebhooksController(
        ApplicationDbContext db,
        IOptions<GrowSettings> growSettings,
        ILogger<WebhooksController> logger,
        IAchievementService achievements)
    {
        _db = db;
        _growSettings = growSettings.Value;
        _logger = logger;
        _achievements = achievements;
    }

    /// <summary>
    /// Grow payment gateway webhook: validates shared secret, then updates booking payment status.
    /// </summary>
    [HttpPost("grow")]
    public async Task<IActionResult> GrowWebhook([FromBody] GrowWebhookPayload payload)
    {
        if (!IsValidGrowWebhookSecret())
        {
            _logger.LogWarning("Grow webhook rejected: missing or invalid secret.");
            return Unauthorized();
        }

        if (payload.BookingId == Guid.Empty)
        {
            _logger.LogWarning("Grow webhook rejected: BookingId is empty.");
            return BadRequest(new { message = "BookingId is required." });
        }

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
            _logger.LogInformation(
                "Booking {BookingId} marked as Paid via Grow webhook (txn: {TransactionId})",
                booking.Id,
                payload.TransactionId);
        }
        else if (string.Equals(payload.Status, "Failed", StringComparison.OrdinalIgnoreCase))
        {
            booking.PaymentStatus = PaymentStatus.Failed;
            _logger.LogWarning(
                "Booking {BookingId} payment failed via Grow webhook (txn: {TransactionId})",
                booking.Id,
                payload.TransactionId);
        }
        else
        {
            _logger.LogWarning(
                "Grow webhook for booking {BookingId}: unrecognized status {Status}",
                payload.BookingId,
                payload.Status);
        }

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Grow webhook failed to persist booking {BookingId}", payload.BookingId);
            return StatusCode(500, new { message = "Failed to persist webhook." });
        }

        if (booking.PaymentStatus == PaymentStatus.Paid)
        {
            await _achievements.EvaluateOwnerAsync(booking.OwnerId);
            await _achievements.EvaluateProviderAsync(booking.ProviderProfileId);
        }

        return Ok(new { message = "Webhook processed." });
    }

    private bool IsValidGrowWebhookSecret()
    {
        var expected = _growSettings.WebhookSecret?.Trim();
        if (string.IsNullOrEmpty(expected))
        {
            _logger.LogWarning("Grow:WebhookSecret is not configured; rejecting webhook.");
            return false;
        }

        if (Request.Headers.TryGetValue("X-Grow-Signature", out var sigHeader))
        {
            var provided = sigHeader.ToString().Trim();
            if (FixedTimeEqualsUtf8(provided, expected))
                return true;
        }

        if (Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var raw = authHeader.ToString().Trim();
            if (raw.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = raw["Bearer ".Length..].Trim();
                if (FixedTimeEqualsUtf8(token, expected))
                    return true;
            }
            else if (FixedTimeEqualsUtf8(raw, expected))
            {
                return true;
            }
        }

        return false;
    }

    private static bool FixedTimeEqualsUtf8(string a, string b)
    {
        var ab = Encoding.UTF8.GetBytes(a);
        var bb = Encoding.UTF8.GetBytes(b);
        if (ab.Length != bb.Length)
            return false;
        return CryptographicOperations.FixedTimeEquals(ab, bb);
    }
}

public record GrowWebhookPayload(
    string? TransactionId,
    Guid BookingId,
    string Status
);
