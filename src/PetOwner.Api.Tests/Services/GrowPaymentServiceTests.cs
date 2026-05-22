using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PetOwner.Api.Services;
using PetOwner.Api.Tests.Infrastructure;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Services;

public class GrowPaymentServiceTests
{
    private const string CheckoutUrl = "https://grow.test/checkout/abc";

    [Fact]
    public async Task GeneratePaymentLinkAsync_WhenGrowNotConfigured_ReturnsMockSandboxUrl()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var bookingId = Guid.NewGuid();
        var booking = CreateBooking(bookingId, ownerId: Guid.NewGuid());
        var sut = CreateSut(db, settings: new GrowSettings(), handler: new StubHandler());

        // Act
        var url = await sut.GeneratePaymentLinkAsync(booking);

        // Assert
        Assert.Contains(bookingId.ToString(), url, StringComparison.Ordinal);
        Assert.Contains("mock.payment.sandbox", url, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GeneratePaymentLinkAsync_WhenConfiguredAndSuccess_ReturnsCheckoutUrl()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerAsync(db, ownerId, "Jane Doe", "jane@example.com");
        var booking = CreateBooking(Guid.NewGuid(), ownerId);
        var handler = new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(new { status = 1, err = "", data = new { url = CheckoutUrl } }),
                Encoding.UTF8,
                "application/json"),
        });
        var sut = CreateSut(db, ConfiguredSettings(), handler);

        // Act
        var url = await sut.GeneratePaymentLinkAsync(booking);

        // Assert
        Assert.Equal(CheckoutUrl, url);
    }

    [Fact]
    public async Task GeneratePaymentLinkAsync_WhenHttpError_ThrowsInvalidOperationException()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerAsync(db, ownerId, "Jane Doe", null);
        var booking = CreateBooking(Guid.NewGuid(), ownerId);
        var handler = new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError));
        var sut = CreateSut(db, ConfiguredSettings(), handler);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.GeneratePaymentLinkAsync(booking));
    }

    [Fact]
    public async Task GeneratePaymentLinkAsync_WhenStatusNotSuccess_ThrowsInvalidOperationException()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerAsync(db, ownerId, "Jane Doe", null);
        var booking = CreateBooking(Guid.NewGuid(), ownerId);
        var handler = new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(new { status = 0, err = "rejected" }),
                Encoding.UTF8,
                "application/json"),
        });
        var sut = CreateSut(db, ConfiguredSettings(), handler);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => sut.GeneratePaymentLinkAsync(booking));
        Assert.Contains("status=0", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GeneratePaymentLinkAsync_WhenOwnerMissingFromDatabase_ThrowsInvalidOperationException()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var booking = CreateBooking(Guid.NewGuid(), Guid.NewGuid());
        var sut = CreateSut(db, ConfiguredSettings(), new StubHandler());

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.GeneratePaymentLinkAsync(booking));
    }

    [Fact]
    public async Task GeneratePaymentLinkAsync_WhenSingleWordOwnerName_AppendsFallbackSurnameInPayload()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerAsync(db, ownerId, "Moshe", null);
        var booking = CreateBooking(Guid.NewGuid(), ownerId);
        string? capturedBody = null;
        var handler = new StubHandler(req =>
        {
            capturedBody = req.Content!.ReadAsStringAsync().GetAwaiter().GetResult();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(new { status = 1, data = new { url = CheckoutUrl } }),
                    Encoding.UTF8,
                    "application/json"),
            };
        });
        var settings = ConfiguredSettings();
        settings.FullNameFallbackSurname = "Cohen";
        var sut = CreateSut(db, settings, handler);

        // Act
        await sut.GeneratePaymentLinkAsync(booking);

        // Assert
        Assert.NotNull(capturedBody);
        Assert.Contains("Moshe Cohen", capturedBody, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GeneratePaymentLinkAsync_WhenPostThrows_PropagatesException()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerAsync(db, ownerId, "Jane Doe", null);
        var booking = CreateBooking(Guid.NewGuid(), ownerId);
        var handler = new StubHandler(_ => throw new HttpRequestException("network down"));
        var sut = CreateSut(db, ConfiguredSettings(), handler);

        // Act & Assert
        await Assert.ThrowsAsync<HttpRequestException>(() => sut.GeneratePaymentLinkAsync(booking));
    }

    [Fact]
    public async Task GeneratePaymentLinkAsync_WhenOwnerOnBookingNavigation_UsesNavigationWithoutDbLookup()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var owner = new User
        {
            Id = Guid.NewGuid(),
            Name = "Nav Owner",
            Email = "nav@example.com",
            Phone = "0501112222",
            Role = "Owner",
            CreatedAt = DateTime.UtcNow,
        };
        var booking = CreateBooking(Guid.NewGuid(), owner.Id);
        booking.Owner = owner;
        var handler = new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(new { status = 1, data = new { url = CheckoutUrl } }),
                Encoding.UTF8,
                "application/json"),
        });
        var sut = CreateSut(db, ConfiguredSettings(), handler);

        // Act
        var url = await sut.GeneratePaymentLinkAsync(booking);

        // Assert
        Assert.Equal(CheckoutUrl, url);
    }

    private static GrowSettings ConfiguredSettings() => new()
    {
        ApiUrl = "https://grow.test/api/createPaymentProcess",
        PageCode = "page-1",
        UserId = "user-1",
        ApiKey = "key-1",
        CallbackUrl = "https://petowner.app/api/webhooks/grow",
    };

    private static GrowPaymentService CreateSut(
        PetOwner.Data.ApplicationDbContext db,
        GrowSettings settings,
        HttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler);
        return new GrowPaymentService(
            httpClient,
            Options.Create(settings),
            db,
            NullLogger<GrowPaymentService>.Instance);
    }

    private static Booking CreateBooking(Guid bookingId, Guid ownerId) => new()
    {
        Id = bookingId,
        OwnerId = ownerId,
        ProviderProfileId = Guid.NewGuid(),
        Service = ServiceType.DogWalking,
        StartDate = DateTime.UtcNow,
        EndDate = DateTime.UtcNow.AddHours(1),
        TotalPrice = 150.50m,
        CreatedAt = DateTime.UtcNow,
    };

    private static async Task SeedOwnerAsync(
        PetOwner.Data.ApplicationDbContext db,
        Guid ownerId,
        string name,
        string? email)
    {
        db.Users.Add(new User
        {
            Id = ownerId,
            Name = name,
            Email = email ?? $"{ownerId:N}@test.example",
            Phone = "0503334444",
            Role = "Owner",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public StubHandler(Func<HttpRequestMessage, HttpResponseMessage>? responder = null) =>
            _responder = responder ?? (_ => new HttpResponseMessage(HttpStatusCode.OK));

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            Task.FromResult(_responder(request));
    }
}
