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

        if (booking.Status != BookingStatus.Completed)
            return BadRequest(new { message = "Can only review a completed booking." });

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

    /// <summary>
    /// Owner-submitted review for a business provider without a completed booking. Not verified.
    /// </summary>
    [HttpPost("direct")]
    public async Task<IActionResult> CreateDirectReview([FromBody] CreateDirectReviewDto request)
    {
        var userId = GetUserId();

        if (request.Rating is < 1 or > 5)
            return BadRequest(new { message = "Rating must be between 1 and 5." });

        if (request.RevieweeId == userId)
            return BadRequest(new { message = "You cannot review your own profile." });

        var comment = request.Comment.Trim();
        if (comment.Length is < 10 or > 1000)
            return BadRequest(new { message = "Comment must be between 10 and 1000 characters." });

        var providerProfile = await _db.ProviderProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == request.RevieweeId);

        if (providerProfile is null)
            return BadRequest(new { message = "Review target is not a provider." });

        if (providerProfile.Type != ProviderType.Business)
            return BadRequest(new { message = "Direct reviews are only available for business providers." });

        var alreadyReviewed = await _db.Reviews
            .AnyAsync(r => r.ReviewerId == userId && r.RevieweeId == request.RevieweeId);

        if (alreadyReviewed)
            return BadRequest(new { message = "You have already reviewed this business." });

        var review = new Review
        {
            BookingId = null,
            ReviewerId = userId,
            RevieweeId = request.RevieweeId,
            Rating = request.Rating,
            Comment = comment,
            IsVerified = false,
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();

        await RecalculateProviderRating(request.RevieweeId);

        var dto = await _db.Reviews
            .AsNoTracking()
            .Where(r => r.Id == review.Id)
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
                r.CreatedAt))
            .FirstAsync();

        return CreatedAtAction(nameof(GetProviderReviews), new { providerId = request.RevieweeId }, dto);
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
