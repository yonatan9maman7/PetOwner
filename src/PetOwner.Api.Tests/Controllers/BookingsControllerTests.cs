using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using PetOwner.Api.Controllers;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Api.Tests.Infrastructure;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Controllers;

public class BookingsControllerTests
{
    [Fact]
    public async Task Create_WhenPetIdsEmpty_ReturnsBadRequest()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var sut = CreateSut(db, Guid.NewGuid());

        // Act
        var result = await sut.Create(new CreateBookingRequest(
            Guid.NewGuid(), ServiceType.DogWalking, [], DateTime.UtcNow, DateTime.UtcNow.AddHours(1)));

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_WhenProviderNotFound_ReturnsNotFound()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerWithPetAsync(db, ownerId, Guid.NewGuid());
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.Create(new CreateBookingRequest(
            Guid.NewGuid(),
            ServiceType.DogWalking,
            [Guid.NewGuid()],
            DateTime.UtcNow,
            DateTime.UtcNow.AddHours(1)));

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Create_WhenProviderDoesNotOfferService_ReturnsBadRequest()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerWithPetAsync(db, ownerId, petId);
        await SeedProviderAsync(db, providerId, ServiceType.PetSitting);
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.Create(new CreateBookingRequest(
            providerId,
            ServiceType.DogWalking,
            [petId],
            DateTime.UtcNow,
            DateTime.UtcNow.AddHours(1)));

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_WhenValidRequest_CreatesBookingAndNotifiesProvider()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerWithPetAsync(db, ownerId, petId);
        await SeedProviderAsync(db, providerId, ServiceType.DogWalking);

        var pricing = Substitute.For<IPricingService>();
        pricing.Calculate(Arg.Any<ProviderServiceRate>(), Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<int>())
            .Returns(new PricingBreakdown(90m, 100m, 4m, 104m));

        var notifications = Substitute.For<INotificationService>();
        var grow = Substitute.For<IGrowPaymentService>();
        var achievements = Substitute.For<IAchievementService>();
        var sut = new BookingsController(db, grow, pricing, notifications, achievements)
        {
            ControllerContext = ControllerContextForUser(ownerId),
        };

        var start = DateTime.UtcNow.AddDays(1);
        var end = start.AddHours(2);

        // Act
        var result = await sut.Create(new CreateBookingRequest(
            providerId,
            ServiceType.DogWalking,
            [petId],
            start,
            end,
            "Please be gentle"));

        // Assert
        Assert.IsType<CreatedAtActionResult>(result);
        var booking = await db.Bookings.Include(b => b.BookingPets).SingleAsync();
        Assert.Equal(ownerId, booking.OwnerId);
        Assert.Equal(providerId, booking.ProviderProfileId);
        Assert.Equal(104m, booking.TotalPrice);
        Assert.Single(booking.BookingPets);
        await notifications.Received(1).CreateAsync(
            providerId,
            "BookingCreated",
            Arg.Any<string>(),
            Arg.Any<string>(),
            booking.Id);
    }

    [Fact]
    public async Task Create_WhenEndBeforeStart_ReturnsBadRequest()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerWithPetAsync(db, ownerId, petId);
        await SeedProviderAsync(db, providerId, ServiceType.DogWalking);
        var sut = CreateSut(db, ownerId);
        var start = DateTime.UtcNow.AddDays(1);

        // Act
        var result = await sut.Create(new CreateBookingRequest(
            providerId,
            ServiceType.DogWalking,
            [petId],
            start,
            start.AddHours(-1)));

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetById_WhenOwnerRequestsOwnBooking_ReturnsOk()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedBookingGraphAsync(db, bookingId, ownerId, providerId);
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.GetById(bookingId);

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Confirm_WhenProviderConfirmsPending_SetsConfirmedAndPaymentUrl()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedBookingGraphAsync(db, bookingId, ownerId, providerId);

        const string paymentUrl = "https://pay.test/link";
        var grow = Substitute.For<IGrowPaymentService>();
        grow.GeneratePaymentLinkAsync(Arg.Any<Booking>()).Returns(paymentUrl);
        var notifications = Substitute.For<INotificationService>();
        var sut = CreateSut(db, providerId, grow, notifications);

        // Act
        var result = await sut.Confirm(bookingId);

        // Assert
        Assert.IsType<NoContentResult>(result);
        var booking = await db.Bookings.FindAsync(bookingId);
        Assert.Equal(BookingStatus.Confirmed, booking!.Status);
        Assert.Equal(paymentUrl, booking.PaymentUrl);
        await notifications.Received(1).CreateAsync(
            ownerId,
            "BookingConfirmed",
            Arg.Any<string>(),
            Arg.Any<string>(),
            bookingId);
    }

    [Fact]
    public async Task Confirm_WhenCallerIsNotProvider_ReturnsForbid()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedBookingGraphAsync(db, bookingId, ownerId, providerId);
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.Confirm(bookingId);

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Confirm_WhenBookingNotPending_ReturnsBadRequest()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedBookingGraphAsync(db, bookingId, ownerId, providerId, BookingStatus.Confirmed);
        var sut = CreateSut(db, providerId);

        // Act
        var result = await sut.Confirm(bookingId);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Complete_WhenConfirmedBooking_MarksCompletedAndNotifiesOwner()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedBookingGraphAsync(db, bookingId, ownerId, providerId, BookingStatus.Confirmed);
        var notifications = Substitute.For<INotificationService>();
        var sut = CreateSut(db, providerId, notifications: notifications);

        // Act
        var result = await sut.Complete(bookingId);

        // Assert
        Assert.IsType<NoContentResult>(result);
        var booking = await db.Bookings.FindAsync(bookingId);
        Assert.Equal(BookingStatus.Completed, booking!.Status);
        await notifications.Received(1).CreateAsync(
            ownerId,
            "BookingCompleted",
            Arg.Any<string>(),
            Arg.Any<string>(),
            bookingId);
    }

    [Fact]
    public async Task Complete_WhenBookingNotConfirmed_ReturnsBadRequest()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedBookingGraphAsync(db, bookingId, ownerId, providerId, BookingStatus.Pending);
        var sut = CreateSut(db, providerId);

        // Act
        var result = await sut.Complete(bookingId);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Cancel_WhenOwnerCancelsPending_SetsCancelled()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedBookingGraphAsync(db, bookingId, ownerId, providerId);
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.Cancel(bookingId);

        // Assert
        Assert.IsType<NoContentResult>(result);
        var booking = await db.Bookings.FindAsync(bookingId);
        Assert.Equal(BookingStatus.Cancelled, booking!.Status);
        Assert.Equal(BookingActorRole.Owner, booking.CancelledByRole);
    }

    [Fact]
    public async Task Cancel_WhenPaymentPaid_ReturnsBadRequest()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedBookingGraphAsync(db, bookingId, ownerId, providerId, paymentStatus: PaymentStatus.Paid);
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.Cancel(bookingId);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Cancel_WhenAlreadyCancelled_ReturnsBadRequest()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedBookingGraphAsync(db, bookingId, ownerId, providerId, BookingStatus.Cancelled);
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.Cancel(bookingId);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetMyBookings_WhenOwnerHasBookings_ReturnsOkList()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedBookingGraphAsync(db, Guid.NewGuid(), ownerId, providerId);
        await SeedBookingGraphAsync(db, Guid.NewGuid(), ownerId, providerId);
        var sut = CreateSut(db, ownerId);

        // Act
        var result = await sut.GetMyBookings();

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IEnumerable<BookingDto>>(ok.Value);
        Assert.Equal(2, list.Count());
    }

    private static BookingsController CreateSut(
        PetOwner.Data.ApplicationDbContext db,
        Guid userId,
        IGrowPaymentService? grow = null,
        INotificationService? notifications = null)
    {
        var pricing = new PricingService();
        notifications ??= Substitute.For<INotificationService>();
        grow ??= Substitute.For<IGrowPaymentService>();
        var achievements = Substitute.For<IAchievementService>();
        return new BookingsController(db, grow, pricing, notifications, achievements)
        {
            ControllerContext = ControllerContextForUser(userId),
        };
    }

    private static ControllerContext ControllerContextForUser(Guid userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        var identity = new ClaimsIdentity(claims, authenticationType: "Test");
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) },
        };
    }

    private static async Task SeedOwnerWithPetAsync(
        PetOwner.Data.ApplicationDbContext db,
        Guid ownerId,
        Guid petId)
    {
        db.Users.Add(new User
        {
            Id = ownerId,
            Name = "Owner",
            Email = "owner@test.example",
            Phone = "0503334444",
            Role = "Owner",
            CreatedAt = DateTime.UtcNow,
        });
        db.Pets.Add(new Pet
        {
            Id = petId,
            UserId = ownerId,
            Name = "Rex",
            Species = PetSpecies.Dog,
            Age = 3,
            TagsCsv = "",
        });
        await db.SaveChangesAsync();
    }

    private static async Task SeedProviderAsync(
        PetOwner.Data.ApplicationDbContext db,
        Guid providerId,
        ServiceType service)
    {
        db.Users.Add(new User
        {
            Id = providerId,
            Name = "Provider",
            Email = "provider@test.example",
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
                ServiceRates =
                [
                    new ProviderServiceRate
                    {
                        Id = Guid.NewGuid(),
                        ProviderProfileId = providerId,
                        Service = service,
                        Rate = 90m,
                        Unit = PricingUnit.PerHour,
                        MaxConcurrentBookings = 5,
                        MaxPetCapacity = 10,
                    },
                ],
            },
        });
        await db.SaveChangesAsync();
    }

    private static async Task SeedBookingGraphAsync(
        PetOwner.Data.ApplicationDbContext db,
        Guid bookingId,
        Guid ownerId,
        Guid providerId,
        BookingStatus status = BookingStatus.Pending,
        PaymentStatus paymentStatus = PaymentStatus.Pending)
    {
        if (!await db.Users.AnyAsync(u => u.Id == ownerId))
            await SeedOwnerWithPetAsync(db, ownerId, Guid.NewGuid());
        if (!await db.Users.AnyAsync(u => u.Id == providerId))
            await SeedProviderAsync(db, providerId, ServiceType.DogWalking);

        db.Bookings.Add(new Booking
        {
            Id = bookingId,
            OwnerId = ownerId,
            ProviderProfileId = providerId,
            Service = ServiceType.DogWalking,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddHours(1),
            TotalPrice = 104m,
            ProviderNetAmount = 90m,
            GrossAmount = 100m,
            ServiceFee = 4m,
            Status = status,
            PaymentStatus = paymentStatus,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}
