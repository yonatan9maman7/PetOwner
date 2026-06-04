using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using NSubstitute;
using PetOwner.Api.Controllers;
using PetOwner.Api.DTOs;
using PetOwner.Api.Infrastructure;
using PetOwner.Api.Services;
using PetOwner.Api.Tests.Infrastructure;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Controllers;

public class MapControllerTests
{
    private const double CenterLat = 32.08;
    private const double CenterLng = 34.78;

    [Fact]
    public async Task GetPins_WhenMapServiceReturnsPins_ReturnsOkAndIncrementsSearchAppearance()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedApprovedProviderAsync(db, providerId, searchAppearanceCount: 0);
        var pins = new List<MapPinDto>
        {
            new(providerId, "Provider", CenterLat, CenterLng, 50m, null, "Dog Walker", null, 0, true, "Individual", null, null, false, null),
        };
        var mapService = Substitute.For<IMapService>();
        mapService.SearchProvidersAsync(Arg.Any<MapSearchFilter>()).Returns(pins);
        var sut = CreateSut(mapService, db);

        // Act
        var result = await sut.GetPins(null, null, null, null, null, null, null, null, null, null, null);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(pins, ok.Value);
        var profile = await db.ProviderProfiles.AsNoTracking().SingleAsync(p => p.UserId == providerId);
        Assert.Equal(1, profile.SearchAppearanceCount);
    }

    [Fact]
    public async Task GetPins_WhenMapServiceReturnsEmpty_DoesNotIncrementSearchAppearance()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedApprovedProviderAsync(db, providerId, searchAppearanceCount: 3);
        var mapService = Substitute.For<IMapService>();
        mapService.SearchProvidersAsync(Arg.Any<MapSearchFilter>()).Returns([]);
        var sut = CreateSut(mapService, db);

        // Act
        await sut.GetPins(null, null, null, null, null, null, null, null, null, null, null);

        // Assert
        var profile = await db.ProviderProfiles.AsNoTracking().SingleAsync(p => p.UserId == providerId);
        Assert.Equal(3, profile.SearchAppearanceCount);
    }

    [Fact]
    public void GetServiceTypes_ReturnsOkWithCatalog()
    {
        // Arrange
        var mapService = Substitute.For<IMapService>();
        var sut = CreateSut(mapService, TestDbFactory.Create());

        // Act
        var result = sut.GetServiceTypes();

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var names = Assert.IsAssignableFrom<IReadOnlyList<string>>(ok.Value);
        Assert.Equal(ServiceTypeCatalog.AllDisplayNamesOrdered.Count, names.Count);
    }

    [Fact]
    public async Task GetProviderProfile_WhenApprovedProvider_ReturnsOk()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedApprovedProviderAsync(db, providerId);
        var mapService = Substitute.For<IMapService>();
        var sut = CreateSut(mapService, db);

        // Act
        var result = await sut.GetProviderProfile(providerId);

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task GetProviderProfile_WhenUnknownProvider_ReturnsNotFound()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var mapService = Substitute.For<IMapService>();
        var sut = CreateSut(mapService, db);

        // Act
        var result = await sut.GetProviderProfile(Guid.NewGuid());

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetProviderProfile_WhenOtherUserViews_IncrementsProfileViewCount()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var viewerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedApprovedProviderAsync(db, providerId, profileViewCount: 0);
        await SeedOwnerAsync(db, viewerId);
        var mapService = Substitute.For<IMapService>();
        var sut = CreateSut(mapService, db);
        sut.ControllerContext = ControllerContextForUser(viewerId);

        // Act
        await sut.GetProviderProfile(providerId);

        // Assert
        var profile = await db.ProviderProfiles.AsNoTracking().SingleAsync(p => p.UserId == providerId);
        Assert.Equal(1, profile.ProfileViewCount);
    }

    [Fact]
    public async Task GetProviderProfile_WhenSelfView_DoesNotIncrementProfileViewCount()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedApprovedProviderAsync(db, providerId, profileViewCount: 0);
        var mapService = Substitute.For<IMapService>();
        var sut = CreateSut(mapService, db);
        sut.ControllerContext = ControllerContextForUser(providerId);

        // Act
        await sut.GetProviderProfile(providerId);

        // Assert
        var profile = await db.ProviderProfiles.AsNoTracking().SingleAsync(p => p.UserId == providerId);
        Assert.Equal(0, profile.ProfileViewCount);
    }

    [Fact]
    public async Task GetPlaydatePins_WhenCancelledEvent_ExcludesFromResults()
    {
        // Arrange
        var hostId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerAsync(db, hostId);
        await SeedPlaydateAsync(db, hostId, cancelled: true, lat: CenterLat, lng: CenterLng);
        var mapService = Substitute.For<IMapService>();
        var sut = CreateSut(mapService, db);

        // Act
        var result = await sut.GetPlaydatePins(CenterLat, CenterLng, 10, null, null);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var pins = Assert.IsAssignableFrom<IReadOnlyList<PlaydateMapPinDto>>(ok.Value);
        Assert.Empty(pins);
    }

    [Fact]
    public async Task GetPlaydatePins_WhenEventOutsideRadius_ExcludesFromResults()
    {
        // Arrange
        var hostId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerAsync(db, hostId);
        await SeedPlaydateAsync(db, hostId, cancelled: false, lat: 33.5, lng: 35.5);
        var mapService = Substitute.For<IMapService>();
        var sut = CreateSut(mapService, db);

        // Act
        var result = await sut.GetPlaydatePins(CenterLat, CenterLng, 5, null, null);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var pins = Assert.IsAssignableFrom<IReadOnlyList<PlaydateMapPinDto>>(ok.Value);
        Assert.Empty(pins);
    }

    [Fact]
    public async Task GetPlaydatePins_WhenEventWithinRadius_IncludesPin()
    {
        // Arrange
        var hostId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedOwnerAsync(db, hostId);
        await SeedPlaydateAsync(db, hostId, cancelled: false, lat: CenterLat, lng: CenterLng);
        var mapService = Substitute.For<IMapService>();
        var sut = CreateSut(mapService, db);

        // Act
        var result = await sut.GetPlaydatePins(CenterLat, CenterLng, 5, null, null);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var pins = Assert.IsAssignableFrom<IReadOnlyList<PlaydateMapPinDto>>(ok.Value);
        Assert.Single(pins);
    }

    private static MapController CreateSut(IMapService mapService, PetOwner.Data.ApplicationDbContext db)
    {
        var sut = new MapController(mapService, db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext(),
            },
        };
        return sut;
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

    private static async Task SeedOwnerAsync(PetOwner.Data.ApplicationDbContext db, Guid userId)
    {
        db.Users.Add(new User
        {
            Id = userId,
            Name = "Viewer",
            Email = $"{userId:N}@viewer.example",
            Phone = "0509998877",
            Role = "Owner",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private static async Task SeedApprovedProviderAsync(
        PetOwner.Data.ApplicationDbContext db,
        Guid providerId,
        int searchAppearanceCount = 0,
        int profileViewCount = 0)
    {
        var serviceId = 1;
        if (!await db.Services.AnyAsync(s => s.Id == serviceId))
        {
            db.Services.Add(new Service
            {
                Id = serviceId,
                Name = "Dog Walking",
                Category = "Care",
            });
        }

        db.Users.Add(new User
        {
            Id = providerId,
            Name = "Map Provider",
            Email = $"{providerId:N}@provider.example",
            Phone = "0501234567",
            Role = "Provider",
            CreatedAt = DateTime.UtcNow,
            ProviderProfile = new ProviderProfile
            {
                UserId = providerId,
                Status = ProviderStatus.Approved,
                City = "Tel Aviv",
                Street = "Main",
                BuildingNumber = "1",
                Latitude = 32.08,
                Longitude = 34.78,
                BusinessGeoLocation = new Point(34.78, 32.08) { SRID = 4326 },
                SearchAppearanceCount = searchAppearanceCount,
                ProfileViewCount = profileViewCount,
                ServiceRates =
                [
                    new ProviderServiceRate
                    {
                        Id = Guid.NewGuid(),
                        ProviderProfileId = providerId,
                        Service = ServiceType.DogWalking,
                        Rate = 50m,
                        Unit = PricingUnit.PerHour,
                    },
                ],
                ProviderServices =
                [
                    new ProviderService { ProviderId = providerId, ServiceId = serviceId },
                ],
            },
        });
        await db.SaveChangesAsync();
    }

    private static async Task SeedPlaydateAsync(
        PetOwner.Data.ApplicationDbContext db,
        Guid hostId,
        bool cancelled,
        double lat,
        double lng)
    {
        db.PlaydateEvents.Add(new PlaydateEvent
        {
            Id = Guid.NewGuid(),
            HostUserId = hostId,
            Title = "Park meetup",
            LocationName = "Park",
            GeoLocation = new Point(lng, lat) { SRID = 4326 },
            ScheduledFor = DateTime.UtcNow.AddDays(1),
            CreatedAt = DateTime.UtcNow,
            CancelledAt = cancelled ? DateTime.UtcNow : null,
        });
        await db.SaveChangesAsync();
    }
}
