using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IPaymentService _paymentService;

    public PaymentsController(ApplicationDbContext db, IPaymentService paymentService)
    {
        _db = db;
        _paymentService = paymentService;
    }

    [HttpPost("checkout/{bookingId:guid}")]
    public async Task<IActionResult> Checkout(Guid bookingId)
    {
        var userId = GetUserId();

        var booking = await _db.ServiceRequests
            .Include(sr => sr.Payment)
            .FirstOrDefaultAsync(sr => sr.Id == bookingId);

        if (booking is null)
            return NotFound(new { message = "Booking not found." });

        if (booking.PetOwnerId != userId)
            return Forbid();

        if (booking.Status is not ("Pending" or "Accepted"))
            return BadRequest(new { message = "Payment can only be initiated for Pending or Accepted bookings." });

        if (!booking.TotalPrice.HasValue || booking.TotalPrice <= 0)
            return BadRequest(new { message = "Booking has no valid price. Schedule a time slot first." });

        if (booking.Payment is not null)
            return Conflict(new { message = "A payment already exists for this booking.", clientSecret = booking.Payment.StripePaymentIntentId });

        var result = await _paymentService.CreatePaymentIntentAsync(
            booking.TotalPrice.Value,
            "ils",
            booking.Id.ToString(),
            customerEmail: null!);

        var payment = new Payment
        {
            ServiceRequestId = booking.Id,
            StripePaymentIntentId = result.PaymentIntentId,
            Amount = booking.TotalPrice.Value,
            PlatformFee = result.PlatformFee / 100m,
            Currency = "ILS",
            Status = "Authorized",
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        return Ok(new CheckoutResponseDto(
            result.ClientSecret,
            result.PaymentIntentId,
            payment.Amount,
            payment.PlatformFee,
            payment.Currency));
    }

    [HttpPost("{bookingId:guid}/capture")]
    public async Task<IActionResult> Capture(Guid bookingId)
    {
        var userId = GetUserId();

        var payment = await _db.Payments
            .Include(p => p.ServiceRequest)
            .FirstOrDefaultAsync(p => p.ServiceRequestId == bookingId);

        if (payment is null)
            return NotFound(new { message = "No payment found for this booking." });

        var sr = payment.ServiceRequest;
        if (sr.PetOwnerId != userId && sr.ProviderId != userId)
            return Forbid();

        if (payment.Status != "Authorized")
            return BadRequest(new { message = $"Cannot capture a payment with status '{payment.Status}'." });

        var result = await _paymentService.CapturePaymentIntentAsync(payment.StripePaymentIntentId);

        payment.Status = "Captured";
        payment.CapturedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { payment.Id, payment.Status, capturedAt = payment.CapturedAt });
    }

    [HttpGet("{bookingId:guid}")]
    public async Task<IActionResult> GetPaymentStatus(Guid bookingId)
    {
        var userId = GetUserId();

        var payment = await _db.Payments
            .AsNoTracking()
            .Include(p => p.ServiceRequest)
            .FirstOrDefaultAsync(p => p.ServiceRequestId == bookingId);

        if (payment is null)
            return NotFound(new { message = "No payment found for this booking." });

        var sr = payment.ServiceRequest;
        if (sr.PetOwnerId != userId && sr.ProviderId != userId)
            return Forbid();

        return Ok(new PaymentStatusDto(
            payment.Id,
            payment.ServiceRequestId,
            payment.StripePaymentIntentId,
            payment.Amount,
            payment.PlatformFee,
            payment.Currency,
            payment.Status,
            payment.CreatedAt,
            payment.CapturedAt,
            payment.RefundedAt,
            payment.RefundAmount));
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
