using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using PetOwner.Api.Controllers;
using PetOwner.Api.Services;
using PetOwner.Api.Tests.Infrastructure;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Controllers;

public class WebhooksControllerTests
{
    private const string WebhookSecret = "test-webhook-secret-key";

    [Fact]
    public async Task GrowWebhook_WhenPayloadEmpty_ReturnsBadRequest()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var achievements = Substitute.For<IAchievementService>();
        var sut = CreateSut(db, achievements);
        SetFormBody(sut, "");

        // Act
        var result = await sut.GrowWebhook();

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GrowWebhook_WhenInvalidWebhookKey_ReturnsUnauthorized()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var achievements = Substitute.For<IAchievementService>();
        var sut = CreateSut(db, achievements);
        SetFormBody(sut, BuildForm(webhookKey: "wrong"));

        // Act
        var result = await sut.GrowWebhook();

        // Assert
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task GrowWebhook_WhenBookingIdMissing_ReturnsBadRequest()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var achievements = Substitute.For<IAchievementService>();
        var sut = CreateSut(db, achievements);
        SetFormBody(sut, BuildForm(bookingId: null));

        // Act
        var result = await sut.GrowWebhook();

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GrowWebhook_WhenBookingUnknown_ReturnsOkIgnored()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var achievements = Substitute.For<IAchievementService>();
        var sut = CreateSut(db, achievements);
        SetFormBody(sut, BuildForm(bookingId: Guid.NewGuid()));

        // Act
        var result = await sut.GrowWebhook();

        // Assert
        Assert.IsType<OkObjectResult>(result);
        await achievements.DidNotReceiveWithAnyArgs().EvaluateOwnerAsync(default);
    }

    [Fact]
    public async Task GrowWebhook_WhenPaymentSuccess_MarksPaidAndEvaluatesAchievements()
    {
        // Arrange
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedPendingBookingAsync(db, bookingId, totalPrice: 150.50m);
        var achievements = Substitute.For<IAchievementService>();
        var sut = CreateSut(db, achievements);
        SetFormBody(sut, BuildForm(bookingId, status: "1", paymentSum: "150.50", transactionCode: "txn-1"));

        // Act
        var result = await sut.GrowWebhook();

        // Assert
        Assert.IsType<OkObjectResult>(result);
        var booking = await db.Bookings.FindAsync(bookingId);
        Assert.Equal(PaymentStatus.Paid, booking!.PaymentStatus);
        Assert.Equal("txn-1", booking.TransactionId);
        await achievements.Received(1).EvaluateOwnerAsync(booking.OwnerId);
        await achievements.Received(1).EvaluateProviderAsync(booking.ProviderProfileId);
    }

    [Fact]
    public async Task GrowWebhook_WhenAlreadyPaid_ReturnsOkWithoutReevaluatingAchievements()
    {
        // Arrange
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedPendingBookingAsync(db, bookingId, paymentStatus: PaymentStatus.Paid, transactionId: "old-txn");
        var achievements = Substitute.For<IAchievementService>();
        var sut = CreateSut(db, achievements);
        SetFormBody(sut, BuildForm(bookingId, status: "1", paymentSum: "150.50", transactionCode: "new-txn"));

        // Act
        var result = await sut.GrowWebhook();

        // Assert
        Assert.IsType<OkObjectResult>(result);
        await achievements.DidNotReceiveWithAnyArgs().EvaluateOwnerAsync(default);
        await achievements.DidNotReceiveWithAnyArgs().EvaluateProviderAsync(default);
    }

    [Fact]
    public async Task GrowWebhook_WhenAmountMismatch_ReturnsBadRequest()
    {
        // Arrange
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedPendingBookingAsync(db, bookingId, totalPrice: 150.50m);
        var achievements = Substitute.For<IAchievementService>();
        var sut = CreateSut(db, achievements);
        SetFormBody(sut, BuildForm(bookingId, status: "1", paymentSum: "99.00"));

        // Act
        var result = await sut.GrowWebhook();

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
        var booking = await db.Bookings.FindAsync(bookingId);
        Assert.Equal(PaymentStatus.Pending, booking!.PaymentStatus);
    }

    [Fact]
    public async Task GrowWebhook_WhenStatusFailed_MarksPaymentFailed()
    {
        // Arrange
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedPendingBookingAsync(db, bookingId);
        var achievements = Substitute.For<IAchievementService>();
        var sut = CreateSut(db, achievements);
        SetFormBody(sut, BuildForm(bookingId, status: "0", paymentSum: "150.50"));

        // Act
        await sut.GrowWebhook();

        // Assert
        var booking = await db.Bookings.FindAsync(bookingId);
        Assert.Equal(PaymentStatus.Failed, booking!.PaymentStatus);
        await achievements.DidNotReceiveWithAnyArgs().EvaluateOwnerAsync(default);
    }

    private static WebhooksController CreateSut(
        PetOwner.Data.ApplicationDbContext db,
        IAchievementService achievements) =>
        new(db, Options.Create(new GrowSettings { WebhookKey = WebhookSecret }), NullLogger<WebhooksController>.Instance, achievements);

    private static void SetFormBody(WebhooksController sut, string formBody)
    {
        var bytes = Encoding.UTF8.GetBytes(formBody);
        var context = new DefaultHttpContext();
        context.Request.ContentType = "application/x-www-form-urlencoded";
        context.Request.ContentLength = bytes.Length;
        context.Request.Body = new MemoryStream(bytes);
        sut.ControllerContext = new ControllerContext { HttpContext = context };
    }

    private static string BuildForm(
        Guid? bookingId = null,
        string? webhookKey = WebhookSecret,
        string status = "1",
        string paymentSum = "150.50",
        string? transactionCode = "txn-1")
    {
        var parts = new List<string>();
        if (webhookKey is not null)
            parts.Add($"webhookKey={Uri.EscapeDataString(webhookKey)}");
        if (bookingId.HasValue)
            parts.Add($"cField1={bookingId.Value}");
        parts.Add($"status={status}");
        parts.Add($"paymentSum={paymentSum}");
        if (transactionCode is not null)
            parts.Add($"transactionCode={transactionCode}");
        return string.Join('&', parts);
    }

    private static async Task SeedPendingBookingAsync(
        PetOwner.Data.ApplicationDbContext db,
        Guid bookingId,
        decimal totalPrice = 150.50m,
        PaymentStatus paymentStatus = PaymentStatus.Pending,
        string? transactionId = null)
    {
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        db.Users.AddRange(
            new User
            {
                Id = ownerId,
                Name = "Owner",
                Email = "owner@test.example",
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
            });
        db.Bookings.Add(new Booking
        {
            Id = bookingId,
            OwnerId = ownerId,
            ProviderProfileId = providerId,
            Service = ServiceType.DogWalking,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddHours(1),
            TotalPrice = totalPrice,
            PaymentStatus = paymentStatus,
            TransactionId = transactionId,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}
