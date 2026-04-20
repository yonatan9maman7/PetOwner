using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Api.Infrastructure;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGrowPaymentService _growPayment;
    private readonly INotificationService _notifications;
    private readonly IAchievementService _achievements;

    public BookingsController(
        ApplicationDbContext db,
        IGrowPaymentService growPayment,
        INotificationService notifications,
        IAchievementService achievements)
    {
        _db = db;
        _growPayment = growPayment;
        _notifications = notifications;
        _achievements = achievements;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBookingRequest request)
    {
        var ownerId = GetUserId();

        if (request.EndDate <= request.StartDate)
            return BadRequest(new { message = "EndDate must be after StartDate." });

        var provider = await _db.ProviderProfiles
            .Include(p => p.User)
            .Include(p => p.ServiceRates)
            .FirstOrDefaultAsync(p => p.UserId == request.ProviderId);

        if (provider is null)
            return NotFound(new { message = "Provider not found." });

        var serviceRate = provider.ServiceRates
            .FirstOrDefault(r => r.Service == request.ServiceType);

        if (serviceRate is null)
            return BadRequest(new { message = $"This provider does not offer {ServiceTypeCatalog.ToDisplayName(request.ServiceType)}." });

        var totalPrice = CalculateTotalPrice(serviceRate, request.StartDate, request.EndDate);

        if (totalPrice <= 0)
            return BadRequest(new { message = "Calculated price must be greater than zero." });

        var owner = await _db.Users.FindAsync(ownerId);

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ProviderProfileId = provider.UserId,
            Service = request.ServiceType,
            StartDate = request.StartDate.ToUniversalTime(),
            EndDate = request.EndDate.ToUniversalTime(),
            TotalPrice = totalPrice,
            Status = BookingStatus.Pending,
            PaymentStatus = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            Notes = request.Notes?.Trim(),
        };

        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync();

        await _notifications.CreateAsync(
            provider.UserId,
            "BookingCreated",
            "New Booking Request",
            $"You have a new request from {owner?.Name ?? "a pet owner"}.",
            booking.Id);

        return CreatedAtAction(nameof(GetById), new { id = booking.Id }, ToDto(booking, provider.User.Name, owner?.Name ?? "", serviceRate.Unit.ToString()));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var userId = GetUserId();

        var booking = await _db.Bookings
            .Include(b => b.Owner)
            .Include(b => b.ProviderProfile).ThenInclude(p => p.User)
            .Include(b => b.ProviderProfile).ThenInclude(p => p.ServiceRates)
            .Include(b => b.Review)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking is null)
            return NotFound(new { message = "Booking not found." });

        if (booking.OwnerId != userId && booking.ProviderProfileId != userId)
            return Forbid();

        var unit = booking.ProviderProfile.ServiceRates
            .FirstOrDefault(r => r.Service == booking.Service)?.Unit.ToString() ?? "";

        return Ok(ToDto(booking, booking.ProviderProfile.User.Name, booking.Owner.Name, unit,
            booking.ProviderProfile.User.Phone, booking.Owner.Phone));
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMyBookings()
    {
        var userId = GetUserId();

        var bookings = await _db.Bookings
            .Include(b => b.Owner)
            .Include(b => b.ProviderProfile).ThenInclude(p => p.User)
            .Include(b => b.ProviderProfile).ThenInclude(p => p.ServiceRates)
            .Include(b => b.Review)
            .Where(b => b.OwnerId == userId || b.ProviderProfileId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        var dtos = bookings.Select(b =>
        {
            var unit = b.ProviderProfile.ServiceRates
                .FirstOrDefault(r => r.Service == b.Service)?.Unit.ToString() ?? "";

            return ToDto(b, b.ProviderProfile.User.Name, b.Owner.Name, unit,
                b.ProviderProfile.User.Phone, b.Owner.Phone);
        });

        return Ok(dtos);
    }

    [HttpPut("{id:guid}/confirm")]
    public async Task<IActionResult> Confirm(Guid id)
    {
        var userId = GetUserId();

        var booking = await _db.Bookings
            .Include(b => b.ProviderProfile).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking is null)
            return NotFound(new { message = "Booking not found." });

        if (booking.ProviderProfileId != userId)
            return Forbid();

        if (booking.Status != BookingStatus.Pending)
            return BadRequest(new { message = "Only pending bookings can be confirmed." });

        booking.Status = BookingStatus.Confirmed;
        booking.RespondedAt = DateTime.UtcNow;
        booking.PaymentUrl = await _growPayment.GeneratePaymentLinkAsync(booking);
        await _db.SaveChangesAsync();

        var providerName = booking.ProviderProfile.User.Name;
        await _notifications.CreateAsync(
            booking.OwnerId,
            "BookingConfirmed",
            "Booking Confirmed",
            $"Your booking with {providerName} was approved!",
            booking.Id);

        return NoContent();
    }

    [HttpPut("{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id)
    {
        var userId = GetUserId();

        var booking = await _db.Bookings
            .Include(b => b.ProviderProfile).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking is null)
            return NotFound(new { message = "Booking not found." });

        if (booking.ProviderProfileId != userId)
            return Forbid();

        if (booking.Status == BookingStatus.Cancelled)
            return BadRequest(new { message = "Cannot complete a cancelled booking." });

        if (booking.Status == BookingStatus.Completed)
            return BadRequest(new { message = "Booking is already completed." });

        if (booking.Status != BookingStatus.Confirmed)
            return BadRequest(new { message = "Only confirmed bookings can be marked complete." });

        booking.Status = BookingStatus.Completed;
        await _db.SaveChangesAsync();

        await _notifications.CreateAsync(
            booking.OwnerId,
            "BookingCompleted",
            "Booking Completed",
            $"Your booking with {booking.ProviderProfile.User.Name} was marked complete.",
            booking.Id);

        return NoContent();
    }

    [HttpPut("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var userId = GetUserId();

        var booking = await _db.Bookings.FindAsync(id);
        if (booking is null)
            return NotFound(new { message = "Booking not found." });

        if (booking.OwnerId != userId && booking.ProviderProfileId != userId)
            return Forbid();

        if (booking.PaymentStatus == PaymentStatus.Paid)
            return BadRequest(new { message = "Cannot cancel a booking after payment has been completed." });

        if (booking.Status == BookingStatus.Cancelled)
            return BadRequest(new { message = "Booking is already cancelled." });

        booking.Status = BookingStatus.Cancelled;
        booking.CancelledByRole = booking.ProviderProfileId == userId
            ? BookingActorRole.Provider
            : BookingActorRole.Owner;

        // Cancellation is also a "response" from the provider's perspective for response-time stats.
        if (booking.CancelledByRole == BookingActorRole.Provider && booking.RespondedAt is null)
            booking.RespondedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static BookingDto ToDto(Booking b, string providerName, string ownerName, string unit,
        string? providerPhone = null, string? ownerPhone = null)
    {
        return new BookingDto(
            b.Id, b.OwnerId, b.ProviderProfileId,
            providerName, ownerName,
            b.Service.ToString(), b.StartDate, b.EndDate,
            b.TotalPrice, unit, b.Status.ToString(),
            b.PaymentStatus.ToString(), b.PaymentUrl,
            b.CreatedAt, b.Notes,
            providerPhone, ownerPhone,
            b.Review is not null
        );
    }

    private static decimal CalculateTotalPrice(ProviderServiceRate rate, DateTime start, DateTime end)
    {
        return rate.Unit switch
        {
            PricingUnit.PerNight => rate.Rate * Math.Max(1, (end.Date - start.Date).Days),
            PricingUnit.PerHour => rate.Rate * (decimal)Math.Max(0, (end - start).TotalHours),
            PricingUnit.PerVisit => rate.Rate,
            PricingUnit.PerSession => rate.Rate,
            PricingUnit.PerPackage => rate.Rate,
            _ => 0m,
        };
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
