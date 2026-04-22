using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

/// <summary>
/// Server-to-server callbacks from Grow (Meshulam).
/// Docs: https://grow-il.readme.io/reference/server-response
///
/// Grow posts a payload containing, at minimum:
///   webhookKey      — shared secret; must equal Grow:WebhookKey
///   transactionCode — Grow transaction id (numeric)
///   paymentSum      — amount paid (decimal string, e.g. "75.00")
///   status          — "1" on success; other values indicate failure
///   cField1         — our BookingId (round-tripped from createPaymentProcess)
///
/// The payload is delivered as either application/x-www-form-urlencoded or JSON depending
/// on the merchant account; we accept both.
/// </summary>
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

    [HttpPost("grow")]
    [Consumes("application/x-www-form-urlencoded", "application/json", "text/plain")]
    public async Task<IActionResult> GrowWebhook()
    {
        var fields = await ReadPayloadAsync(HttpContext);
        if (fields.Count == 0)
        {
            _logger.LogWarning("Grow webhook rejected: empty or unreadable payload.");
            return BadRequest(new { message = "Empty payload." });
        }

        if (!ValidateWebhookKey(fields))
        {
            _logger.LogWarning("Grow webhook rejected: invalid webhookKey.");
            return Unauthorized();
        }

        if (!fields.TryGetValue("cField1", out var bookingIdRaw) ||
            !Guid.TryParse(bookingIdRaw, out var bookingId) ||
            bookingId == Guid.Empty)
        {
            _logger.LogWarning(
                "Grow webhook rejected: missing or invalid cField1 (BookingId). Raw: {Raw}",
                bookingIdRaw ?? "<null>");
            return BadRequest(new { message = "cField1 (BookingId) is required." });
        }

        var transactionCode = fields.GetValueOrDefault("transactionCode");
        var paymentSumRaw = fields.GetValueOrDefault("paymentSum");
        var statusRaw = fields.GetValueOrDefault("status");
        var isSuccess = string.Equals(statusRaw, "1", StringComparison.Ordinal);

        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking is null)
        {
            _logger.LogWarning("Grow webhook received for unknown booking {BookingId}", bookingId);
            // Grow retries on non-2xx. Return 200 so it doesn't keep retrying an unknown booking.
            return Ok(new { message = "Booking not found; ignored." });
        }

        // Idempotency: if we already processed this txn (or the booking is already paid with the
        // same txn), return 200 OK without double-processing.
        if (booking.PaymentStatus == PaymentStatus.Paid &&
            !string.IsNullOrEmpty(booking.TransactionId) &&
            string.Equals(booking.TransactionId, transactionCode, StringComparison.Ordinal))
        {
            _logger.LogInformation(
                "Grow webhook duplicate for booking {BookingId}, txn {Txn}; already Paid.", bookingId, transactionCode);
            return Ok(new { message = "Already processed." });
        }

        // Amount sanity check — protect against tampering / page-code reuse with wrong sum.
        if (isSuccess && decimal.TryParse(paymentSumRaw, NumberStyles.Number, CultureInfo.InvariantCulture, out var paid))
        {
            if (Math.Abs(paid - booking.TotalPrice) > 0.01m)
            {
                _logger.LogError(
                    "Grow webhook amount mismatch for booking {BookingId}: paid={Paid}, expected={Expected}",
                    bookingId, paid, booking.TotalPrice);
                return BadRequest(new { message = "Amount mismatch." });
            }
        }

        booking.TransactionId = transactionCode;

        if (isSuccess)
        {
            booking.PaymentStatus = PaymentStatus.Paid;
            _logger.LogInformation(
                "Booking {BookingId} marked Paid via Grow webhook (txn {Txn}, sum {Sum})",
                bookingId, transactionCode, paymentSumRaw);
        }
        else
        {
            booking.PaymentStatus = PaymentStatus.Failed;
            _logger.LogWarning(
                "Booking {BookingId} payment failed via Grow webhook (txn {Txn}, status {Status})",
                bookingId, transactionCode, statusRaw);
        }

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Grow webhook failed to persist booking {BookingId}", bookingId);
            // Non-2xx makes Grow retry — what we want on a transient DB error.
            return StatusCode(500, new { message = "Failed to persist webhook." });
        }

        if (booking.PaymentStatus == PaymentStatus.Paid)
        {
            await _achievements.EvaluateOwnerAsync(booking.OwnerId);
            await _achievements.EvaluateProviderAsync(booking.ProviderProfileId);
        }

        return Ok(new { message = "Webhook processed." });
    }

    private bool ValidateWebhookKey(IReadOnlyDictionary<string, string> fields)
    {
        var expected = _growSettings.WebhookKey?.Trim();
        if (string.IsNullOrEmpty(expected))
        {
            _logger.LogError("Grow:WebhookKey is not configured; rejecting all webhooks.");
            return false;
        }

        if (!fields.TryGetValue("webhookKey", out var provided) || string.IsNullOrWhiteSpace(provided))
            return false;

        return FixedTimeEqualsUtf8(provided.Trim(), expected);
    }

    private static bool FixedTimeEqualsUtf8(string a, string b)
    {
        var ab = Encoding.UTF8.GetBytes(a);
        var bb = Encoding.UTF8.GetBytes(b);
        if (ab.Length != bb.Length)
            return false;
        return CryptographicOperations.FixedTimeEquals(ab, bb);
    }

    /// <summary>
    /// Reads the Grow callback body as a flat string dictionary. Supports form-urlencoded (the
    /// documented default) and JSON bodies. JSON nested objects are flattened to "data.transactionCode"-style keys
    /// and also exposed under the leaf key ("transactionCode") so downstream code can be agnostic.
    /// </summary>
    private static async Task<Dictionary<string, string>> ReadPayloadAsync(HttpContext ctx)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (ctx.Request.HasFormContentType)
        {
            var form = await ctx.Request.ReadFormAsync();
            foreach (var kv in form)
            {
                if (!string.IsNullOrEmpty(kv.Key) && !string.IsNullOrEmpty(kv.Value.ToString()))
                    result[kv.Key] = kv.Value.ToString();
            }
            return result;
        }

        ctx.Request.EnableBuffering();
        using var reader = new StreamReader(
            ctx.Request.Body,
            encoding: Encoding.UTF8,
            detectEncodingFromByteOrderMarks: false,
            leaveOpen: true);
        var raw = await reader.ReadToEndAsync();
        ctx.Request.Body.Position = 0;

        if (string.IsNullOrWhiteSpace(raw))
            return result;

        // JSON body (some Grow setups post JSON).
        try
        {
            using var doc = JsonDocument.Parse(raw);
            FlattenJson(doc.RootElement, prefix: string.Empty, into: result);
            return result;
        }
        catch (JsonException)
        {
            // Fall through: try form-encoded parse as a fallback.
        }

        foreach (var pair in raw.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var eq = pair.IndexOf('=');
            if (eq <= 0) continue;
            var k = Uri.UnescapeDataString(pair[..eq]);
            var v = Uri.UnescapeDataString(pair[(eq + 1)..]);
            if (!string.IsNullOrEmpty(k))
                result[k] = v;
        }

        return result;
    }

    private static void FlattenJson(JsonElement el, string prefix, IDictionary<string, string> into)
    {
        switch (el.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var prop in el.EnumerateObject())
                {
                    var path = string.IsNullOrEmpty(prefix) ? prop.Name : $"{prefix}.{prop.Name}";
                    FlattenJson(prop.Value, path, into);
                    // Also expose the leaf name directly for ergonomic lookups (transactionCode, paymentSum, status, cField1...).
                    if (prop.Value.ValueKind is JsonValueKind.String or JsonValueKind.Number
                        or JsonValueKind.True or JsonValueKind.False)
                    {
                        if (!into.ContainsKey(prop.Name))
                            into[prop.Name] = JsonLeafToString(prop.Value);
                    }
                }
                break;

            case JsonValueKind.Array:
                var i = 0;
                foreach (var item in el.EnumerateArray())
                {
                    FlattenJson(item, $"{prefix}[{i}]", into);
                    i++;
                }
                break;

            case JsonValueKind.String:
            case JsonValueKind.Number:
            case JsonValueKind.True:
            case JsonValueKind.False:
                if (!string.IsNullOrEmpty(prefix))
                    into[prefix] = JsonLeafToString(el);
                break;
        }
    }

    private static string JsonLeafToString(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.String => el.GetString() ?? string.Empty,
        JsonValueKind.Number => el.GetRawText(),
        JsonValueKind.True => "true",
        JsonValueKind.False => "false",
        _ => el.GetRawText(),
    };
}
