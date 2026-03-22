using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/reviews")]
[Authorize]
public class ReviewsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ReviewsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> CreateReview([FromBody] CreateBookingReviewDto request)
    {
        var userId = GetUserId();

        if (request.Rating is < 1 or > 5)
            return BadRequest(new { message = "Rating must be between 1 and 5." });

        var booking = await _db.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BookingId);

        if (booking is null)
            return NotFound(new { message = "Booking not found." });

        if (booking.OwnerId != userId)
            return Forbid();

        if (booking.Status != BookingStatus.Completed && booking.PaymentStatus != PaymentStatus.Paid)
            return BadRequest(new { message = "Can only review a completed or paid booking." });

        var existingReview = await _db.Reviews
            .AnyAsync(r => r.BookingId == request.BookingId);

        if (existingReview)
            return Conflict(new { message = "A review already exists for this booking." });

        var review = new Review
        {
            BookingId = request.BookingId,
            ReviewerId = userId,
            RevieweeId = booking.ProviderProfileId,
            Rating = request.Rating,
            Comment = request.Comment,
            IsVerified = true,
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();

        await RecalculateProviderRating(booking.ProviderProfileId);

        return CreatedAtAction(nameof(GetProviderReviews), new { providerId = booking.ProviderProfileId }, new { review.Id });
    }

    [HttpPost("service-request")]
    public async Task<IActionResult> CreateServiceRequestReview([FromBody] CreateReviewDto request)
    {
        var userId = GetUserId();

        if (request.Rating is < 1 or > 5)
            return BadRequest(new { message = "Rating must be between 1 and 5." });

        if (request.CommunicationRating.HasValue && request.CommunicationRating is < 1 or > 5)
            return BadRequest(new { message = "CommunicationRating must be between 1 and 5." });

        if (request.ReliabilityRating.HasValue && request.ReliabilityRating is < 1 or > 5)
            return BadRequest(new { message = "ReliabilityRating must be between 1 and 5." });

        var serviceRequest = await _db.ServiceRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(sr => sr.Id == request.RequestId);

        if (serviceRequest is null)
            return NotFound(new { message = "Service request not found." });

        if (serviceRequest.Status != "Completed")
            return BadRequest(new { message = "Can only review a completed service request." });

        if (serviceRequest.PetOwnerId != userId && serviceRequest.ProviderId != userId)
            return Forbid();

        var existingReview = await _db.Reviews
            .AnyAsync(r => r.ServiceRequestId == request.RequestId);

        if (existingReview)
            return Conflict(new { message = "A review already exists for this service request." });

        var revieweeId = serviceRequest.PetOwnerId == userId
            ? serviceRequest.ProviderId
            : serviceRequest.PetOwnerId;

        var isVerified = serviceRequest.ScheduledStart.HasValue;

        var review = new Review
        {
            ServiceRequestId = request.RequestId,
            ReviewerId = userId,
            RevieweeId = revieweeId,
            Rating = request.Rating,
            Comment = request.Comment,
            IsVerified = isVerified,
            CommunicationRating = request.CommunicationRating,
            ReliabilityRating = request.ReliabilityRating,
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();

        await RecalculateProviderRating(revieweeId);

        return CreatedAtAction(nameof(GetProviderReviews), new { providerId = revieweeId }, new { review.Id });
    }

    [HttpGet("provider/{providerId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProviderReviews(Guid providerId)
    {
        var reviews = await _db.Reviews
            .AsNoTracking()
            .Where(r => r.RevieweeId == providerId)
            .Include(r => r.Reviewer)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReviewDto(
                r.Id,
                r.ServiceRequestId,
                r.BookingId,
                r.ReviewerId,
                r.Reviewer.Name,
                r.Reviewer.ProviderProfile != null ? r.Reviewer.ProviderProfile.ProfileImageUrl : null,
                r.RevieweeId,
                r.Rating,
                r.Comment,
                r.IsVerified,
                r.CommunicationRating,
                r.ReliabilityRating,
                r.PhotoUrl,
                r.CreatedAt
            ))
            .ToListAsync();

        return Ok(reviews);
    }

    private async Task RecalculateProviderRating(Guid providerId)
    {
        var profile = await _db.ProviderProfiles
            .FirstOrDefaultAsync(p => p.UserId == providerId);

        if (profile is null) return;

        var stats = await _db.Reviews
            .Where(r => r.RevieweeId == providerId)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Count = g.Count(),
                Average = g.Average(r => (decimal)r.Rating),
            })
            .FirstOrDefaultAsync();

        profile.ReviewCount = stats?.Count ?? 0;
        profile.AverageRating = stats is not null
            ? Math.Round(stats.Average, 2)
            : null;

        await _db.SaveChangesAsync();
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
