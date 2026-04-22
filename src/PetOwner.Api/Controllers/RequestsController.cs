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
[Route("api/requests")]
[Authorize]
public class RequestsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly INotificationService _notifications;
    private readonly ILogger<RequestsController> _logger;

    public RequestsController(
        ApplicationDbContext db,
        INotificationService notifications,
        ILogger<RequestsController> logger)
    {
        _db = db;
        _notifications = notifications;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> CreateRequest([FromBody] CreateServiceRequestDto request)
    {
        var userId = GetUserId();

        var providerProfile = await _db.ProviderProfiles
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.ServiceRates)
            .FirstOrDefaultAsync(p => p.UserId == request.ProviderId);

        if (providerProfile is null)
            return NotFound(new { message = "Provider not found." });

        if (providerProfile.UserId == userId)
            return BadRequest(new { message = "You cannot create a request for yourself." });

        if (providerProfile.Status != ProviderStatus.Approved)
            return BadRequest(new { message = "This provider is not currently approved." });

        if (request.PetId.HasValue)
        {
            var petExists = await _db.Pets.AnyAsync(p => p.Id == request.PetId.Value && p.UserId == userId);
            if (!petExists)
                return BadRequest(new { message = "Pet not found or does not belong to you." });
        }

        if (request.ServiceId.HasValue)
        {
            var serviceExists = await _db.Services.AnyAsync(s => s.Id == request.ServiceId.Value);
            if (!serviceExists)
                return BadRequest(new { message = "Service type not found." });
        }

        decimal? totalPrice = null;

        if (request.ScheduledStart.HasValue && request.ScheduledEnd.HasValue)
        {
            var start = request.ScheduledStart.Value;
            var end = request.ScheduledEnd.Value;

            if (start >= end)
                return BadRequest(new { message = "ScheduledStart must be before ScheduledEnd." });

            if (start < DateTime.UtcNow.AddMinutes(-5))
                return BadRequest(new { message = "Cannot book a time slot in the past." });

            var hasConflict = await _db.ServiceRequests.AnyAsync(sr =>
                sr.ProviderId == request.ProviderId
                && sr.Status != "Rejected" && sr.Status != "Cancelled" && sr.Status != "Completed"
                && sr.ScheduledStart.HasValue && sr.ScheduledEnd.HasValue
                && sr.ScheduledStart < end
                && start < sr.ScheduledEnd);

            if (hasConflict)
                return Conflict(new { message = "The provider already has a booking during this time." });

            var applicableRate = providerProfile.ServiceRates.FirstOrDefault()?.Rate ?? 0m;
            if (request.ServiceId.HasValue)
            {
                var svcName = await _db.Services.Where(s => s.Id == request.ServiceId.Value)
                    .Select(s => s.Name).FirstOrDefaultAsync();
                var matched = providerProfile.ServiceRates
                    .FirstOrDefault(r => r.Service.ToString() == svcName?.Replace(" ", "").Replace("-", ""));
                if (matched is not null)
                    applicableRate = matched.Rate;
            }

            var hours = (decimal)(end - start).TotalHours;
            totalPrice = Math.Round(applicableRate * hours, 2);
        }

        var serviceRequest = new ServiceRequest
        {
            PetOwnerId = userId,
            ProviderId = request.ProviderId,
            PetId = request.PetId,
            ServiceId = request.ServiceId,
            ScheduledStart = request.ScheduledStart,
            ScheduledEnd = request.ScheduledEnd,
            TotalPrice = totalPrice,
            Notes = request.Notes,
            ShareMedicalRecords = request.ShareMedicalRecords,
        };

        _db.ServiceRequests.Add(serviceRequest);
        await _db.SaveChangesAsync();

        _ = _notifications.CreateAsync(
            request.ProviderId, "NewRequest", "New Booking Request",
            $"You have a new booking request.", serviceRequest.Id);

        return CreatedAtAction(nameof(GetMyRequests), new { id = serviceRequest.Id }, new { serviceRequest.Id });
    }

    [HttpGet]
    public async Task<IActionResult> GetMyRequests()
    {
        var userId = GetUserId();

        var requests = await _db.ServiceRequests
            .AsNoTracking()
            .Where(sr => sr.PetOwnerId == userId || sr.ProviderId == userId)
            .OrderByDescending(sr => sr.CreatedAt)
            .Select(sr => new ServiceRequestDto(
                sr.Id,
                sr.PetOwnerId,
                sr.PetOwner.Name,
                sr.ProviderId,
                sr.Provider.Name,
                sr.PetId,
                sr.Pet != null ? sr.Pet.Name : null,
                sr.Status,
                sr.CreatedAt,
                sr.Provider.Phone,
                sr.Review != null,
                sr.ServiceId,
                sr.Service != null ? sr.Service.Name : null,
                sr.ScheduledStart,
                sr.ScheduledEnd,
                sr.TotalPrice,
                sr.Notes,
                sr.CancellationReason,
                sr.Payment != null ? sr.Payment.Status : null,
                sr.ShareMedicalRecords
            ))
            .ToListAsync();

        return Ok(requests);
    }

    [HttpPut("{id:guid}/accept")]
    public async Task<IActionResult> AcceptRequest(Guid id)
    {
        return await UpdateStatusInternal(id, "Accepted");
    }

    [HttpPut("{id:guid}/reject")]
    public async Task<IActionResult> RejectRequest(Guid id)
    {
        return await UpdateStatusInternal(id, "Rejected");
    }

    [HttpPut("{id:guid}/complete")]
    public async Task<IActionResult> CompleteRequest(Guid id)
    {
        var userId = GetUserId();

        var serviceRequest = await _db.ServiceRequests
            .Include(sr => sr.Payment)
            .FirstOrDefaultAsync(sr => sr.Id == id);

        if (serviceRequest is null)
            return NotFound(new { message = "Service request not found." });

        if (serviceRequest.PetOwnerId != userId && serviceRequest.ProviderId != userId)
            return Forbid();

        if (serviceRequest.Status != "Accepted")
            return BadRequest(new { message = "Only an Accepted request can be marked as Completed." });

        serviceRequest.Status = "Completed";
        var completedRecipient = serviceRequest.PetOwnerId == userId ? serviceRequest.ProviderId : serviceRequest.PetOwnerId;
        _ = _notifications.CreateAsync(completedRecipient, "RequestCompleted", "Booking Completed",
            "A booking has been marked as completed.", serviceRequest.Id);

        // Capture/refund via payment gateway is handled by the Booking/Grow flow (see BookingsController
        // + /api/webhooks/grow). The legacy ServiceRequest.Payment row is left as-is on completion.
        await _db.SaveChangesAsync();

        return Ok(new { serviceRequest.Id, serviceRequest.Status });
    }

    [HttpPut("{id:guid}/cancel")]
    public async Task<IActionResult> CancelRequest(Guid id, [FromBody] CancelRequestDto request)
    {
        var userId = GetUserId();

        var serviceRequest = await _db.ServiceRequests
            .Include(sr => sr.Payment)
            .FirstOrDefaultAsync(sr => sr.Id == id);

        if (serviceRequest is null)
            return NotFound(new { message = "Service request not found." });

        if (serviceRequest.PetOwnerId != userId && serviceRequest.ProviderId != userId)
            return Forbid();

        if (serviceRequest.Status is not ("Pending" or "Accepted"))
            return BadRequest(new { message = "Only Pending or Accepted requests can be cancelled." });

        serviceRequest.Status = "Cancelled";
        serviceRequest.CancellationReason = request.Reason?.Trim();
        var cancelRecipient = serviceRequest.PetOwnerId == userId ? serviceRequest.ProviderId : serviceRequest.PetOwnerId;
        _ = _notifications.CreateAsync(cancelRecipient, "RequestCancelled", "Booking Cancelled",
            "A booking has been cancelled.", serviceRequest.Id);

        decimal? refundAmount = null;
        string? refundPolicy = null;

        if (serviceRequest.Payment is { Status: "Authorized" or "Captured" })
        {
            var payment = serviceRequest.Payment;
            var refundPercent = CalculateRefundPercent(serviceRequest.ScheduledStart);
            refundPolicy = refundPercent switch
            {
                100 => "Full refund (cancelled >24h before start)",
                50 => "50% refund (cancelled 2-24h before start)",
                _ => "No refund (cancelled <2h before start)"
            };

            if (refundPercent > 0)
            {
                refundAmount = Math.Round(payment.Amount * refundPercent / 100m, 2);
                // TODO(Grow refunds): Grow refunds are performed manually via the Grow dashboard today.
                // Once the Grow refund API is wired, trigger it here using booking.TransactionId.
                payment.Status = refundPercent == 100 ? "Refunded" : "PartiallyRefunded";
                payment.RefundAmount = refundAmount;
                payment.RefundedAt = DateTime.UtcNow;
                _logger.LogInformation(
                    "Booking {BookingId} cancelled; refund {Amount} pending manual Grow refund.",
                    id, refundAmount);
            }
            else
            {
                payment.Status = "NoRefund";
                payment.RefundAmount = 0;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            serviceRequest.Id,
            serviceRequest.Status,
            RefundAmount = refundAmount,
            RefundPolicy = refundPolicy
        });
    }

    private async Task<IActionResult> UpdateStatusInternal(Guid id, string newStatus)
    {
        var userId = GetUserId();

        var serviceRequest = await _db.ServiceRequests
            .FirstOrDefaultAsync(sr => sr.Id == id);

        if (serviceRequest is null)
            return NotFound(new { message = "Service request not found." });

        var currentStatus = serviceRequest.Status;

        if (newStatus is "Accepted" or "Rejected")
        {
            if (serviceRequest.ProviderId != userId)
                return Forbid();

            if (currentStatus != "Pending")
                return BadRequest(new { message = $"Cannot {newStatus.ToLower()} a request that is not Pending." });
        }
        else if (newStatus is "Completed")
        {
            if (serviceRequest.PetOwnerId != userId && serviceRequest.ProviderId != userId)
                return Forbid();

            if (currentStatus != "Accepted")
                return BadRequest(new { message = "Only an Accepted request can be marked as Completed." });
        }

        serviceRequest.Status = newStatus;
        await _db.SaveChangesAsync();

        var recipientId = newStatus switch
        {
            "Accepted" or "Rejected" => serviceRequest.PetOwnerId,
            _ => serviceRequest.ProviderId
        };
        var title = newStatus switch
        {
            "Accepted" => "Booking Accepted",
            "Rejected" => "Booking Rejected",
            _ => $"Booking {newStatus}"
        };
        _ = _notifications.CreateAsync(recipientId, $"Request{newStatus}", title,
            $"Your booking has been {newStatus.ToLower()}.", serviceRequest.Id);

        return Ok(new { serviceRequest.Id, serviceRequest.Status });
    }

    private static int CalculateRefundPercent(DateTime? scheduledStart)
    {
        if (!scheduledStart.HasValue)
            return 100;

        var hoursUntilStart = (scheduledStart.Value - DateTime.UtcNow).TotalHours;

        return hoursUntilStart switch
        {
            > 24 => 100,
            > 2 => 50,
            _ => 0
        };
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
