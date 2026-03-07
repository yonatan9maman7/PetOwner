using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PetOwner.Api.Services;
using PetOwner.Data;
using Stripe;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/webhooks/stripe")]
[AllowAnonymous]
public class StripeWebhookController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly StripeSettings _settings;
    private readonly ILogger<StripeWebhookController> _logger;

    public StripeWebhookController(
        ApplicationDbContext db,
        IOptions<StripeSettings> settings,
        ILogger<StripeWebhookController> logger)
    {
        _db = db;
        _settings = settings.Value;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Handle()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(
                json,
                Request.Headers["Stripe-Signature"],
                _settings.WebhookSecret);
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(ex, "Stripe webhook signature verification failed.");
            return BadRequest(new { message = "Invalid signature." });
        }

        _logger.LogInformation("Stripe webhook received: {EventType} ({EventId})", stripeEvent.Type, stripeEvent.Id);

        switch (stripeEvent.Type)
        {
            case EventTypes.PaymentIntentSucceeded:
                await HandlePaymentIntentSucceeded(stripeEvent);
                break;

            case EventTypes.PaymentIntentPaymentFailed:
                await HandlePaymentIntentFailed(stripeEvent);
                break;

            case EventTypes.ChargeRefunded:
                await HandleChargeRefunded(stripeEvent);
                break;

            default:
                _logger.LogDebug("Unhandled Stripe event type: {EventType}", stripeEvent.Type);
                break;
        }

        return Ok();
    }

    private async Task HandlePaymentIntentSucceeded(Event stripeEvent)
    {
        if (stripeEvent.Data.Object is not PaymentIntent intent) return;

        var payment = await _db.Payments
            .FirstOrDefaultAsync(p => p.StripePaymentIntentId == intent.Id);

        if (payment is null)
        {
            _logger.LogWarning("PaymentIntent {IntentId} succeeded but no matching Payment record found.", intent.Id);
            return;
        }

        if (payment.Status is "Captured" or "Refunded") return;

        payment.Status = "Captured";
        payment.CapturedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Payment {PaymentId} marked Captured via webhook for intent {IntentId}.",
            payment.Id, intent.Id);
    }

    private async Task HandlePaymentIntentFailed(Event stripeEvent)
    {
        if (stripeEvent.Data.Object is not PaymentIntent intent) return;

        var payment = await _db.Payments
            .FirstOrDefaultAsync(p => p.StripePaymentIntentId == intent.Id);

        if (payment is null) return;

        payment.Status = "Failed";
        await _db.SaveChangesAsync();

        _logger.LogWarning("Payment {PaymentId} marked Failed via webhook for intent {IntentId}.",
            payment.Id, intent.Id);
    }

    private async Task HandleChargeRefunded(Event stripeEvent)
    {
        if (stripeEvent.Data.Object is not Charge charge) return;
        if (string.IsNullOrEmpty(charge.PaymentIntentId)) return;

        var payment = await _db.Payments
            .FirstOrDefaultAsync(p => p.StripePaymentIntentId == charge.PaymentIntentId);

        if (payment is null) return;

        payment.Status = "Refunded";
        payment.RefundedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Payment {PaymentId} marked Refunded via webhook for charge {ChargeId}.",
            payment.Id, charge.Id);
    }
}
