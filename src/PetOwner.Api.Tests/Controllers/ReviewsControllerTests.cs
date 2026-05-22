using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.Controllers;
using PetOwner.Api.DTOs;
using PetOwner.Api.Tests.Infrastructure;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Controllers;

public class ReviewsControllerTests
{
    [Fact]
    public async Task CreateReview_WhenCompletedBooking_CreatesReviewAndUpdatesProviderRating()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedCompletedBookingAsync(db, bookingId, ownerId, providerId);
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.CreateReview(new CreateBookingReviewDto(bookingId, 5, "Excellent service!"));

        // Assert
        Assert.IsType<CreatedAtActionResult>(result);
        var review = await db.Reviews.SingleAsync(r => r.BookingId == bookingId);
        Assert.Equal(5, review.Rating);
        Assert.True(review.IsVerified);
        var profile = await db.ProviderProfiles.SingleAsync(p => p.UserId == providerId);
        Assert.Equal(1, profile.ReviewCount);
        Assert.Equal(5.0m, profile.AverageRating);
    }

    [Fact]
    public async Task CreateReview_WhenNotOwner_ReturnsForbid()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedCompletedBookingAsync(db, bookingId, ownerId, providerId);
        var sut = CreateSut(db, providerId);

        // Act
        var result = await sut.CreateReview(new CreateBookingReviewDto(bookingId, 5, "Great"));

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task CreateReview_WhenBookingNotCompleted_ReturnsBadRequest()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedCompletedBookingAsync(db, bookingId, ownerId, providerId, BookingStatus.Confirmed);
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.CreateReview(new CreateBookingReviewDto(bookingId, 5, "Too early"));

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreateReview_WhenDuplicateReview_ReturnsConflict()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedCompletedBookingAsync(db, bookingId, ownerId, providerId);
        db.Reviews.Add(new Review
        {
            Id = Guid.NewGuid(),
            BookingId = bookingId,
            ReviewerId = ownerId,
            RevieweeId = providerId,
            Rating = 4,
            Comment = "First",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.CreateReview(new CreateBookingReviewDto(bookingId, 5, "Second"));

        // Assert
        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public async Task CreateReview_WhenRatingOutOfRange_ReturnsBadRequest()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedCompletedBookingAsync(db, bookingId, ownerId, providerId);
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.CreateReview(new CreateBookingReviewDto(bookingId, 0, "Invalid"));

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetProviderReviews_WhenReviewsExist_ReturnsOkList()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        db.Users.AddRange(
            new User
            {
                Id = ownerId,
                Name = "Reviewer",
                Email = "reviewer@test.example",
                Phone = "0501111111",
                Role = "Owner",
                CreatedAt = DateTime.UtcNow,
            },
            new User
            {
                Id = providerId,
                Name = "Provider",
                Email = "provider@test.example",
                Phone = "0502222222",
                Role = "Provider",
                CreatedAt = DateTime.UtcNow,
                ProviderProfile = new ProviderProfile
                {
                    UserId = providerId,
                    Status = ProviderStatus.Approved,
                    City = "Tel Aviv",
                    Street = "Main",
                    BuildingNumber = "1",
                },
            });
        db.Reviews.Add(new Review
        {
            Id = Guid.NewGuid(),
            ReviewerId = ownerId,
            RevieweeId = providerId,
            Rating = 5,
            Comment = "Great",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.GetProviderReviews(providerId);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var reviews = Assert.IsAssignableFrom<IReadOnlyList<ReviewDto>>(ok.Value);
        Assert.Single(reviews);
    }

    private static ReviewsController CreateSut(PetOwner.Data.ApplicationDbContext db, Guid userId) =>
        new(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.NameIdentifier, userId.ToString())],
                        authenticationType: "Test")),
                },
            },
        };

    private static async Task SeedCompletedBookingAsync(
        PetOwner.Data.ApplicationDbContext db,
        Guid bookingId,
        Guid ownerId,
        Guid providerId,
        BookingStatus status = BookingStatus.Completed)
    {
        db.Users.Add(new User
        {
            Id = ownerId,
            Name = "Owner",
            Email = $"{ownerId:N}@owner.test",
            Phone = "0503334444",
            Role = "Owner",
            CreatedAt = DateTime.UtcNow,
        });
        db.Users.Add(new User
        {
            Id = providerId,
            Name = "Provider",
            Email = $"{providerId:N}@provider.test",
            Phone = "0505556666",
            Role = "Provider",
            CreatedAt = DateTime.UtcNow,
            ProviderProfile = new ProviderProfile
            {
                UserId = providerId,
                Status = ProviderStatus.Approved,
                City = "Tel Aviv",
                Street = "Main",
                BuildingNumber = "1",
                ReviewCount = 0,
            },
        });
        db.Bookings.Add(new Booking
        {
            Id = bookingId,
            OwnerId = ownerId,
            ProviderProfileId = providerId,
            Service = ServiceType.DogWalking,
            StartDate = DateTime.UtcNow.AddDays(-1),
            EndDate = DateTime.UtcNow,
            TotalPrice = 100m,
            Status = status,
            PaymentStatus = PaymentStatus.Paid,
            CreatedAt = DateTime.UtcNow.AddDays(-2),
        });
        await db.SaveChangesAsync();
    }
}
