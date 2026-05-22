using NetTopologySuite.Geometries;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Api.Tests.Infrastructure;
using PetOwner.Data;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Services;

public class MapServiceTests
{
    /// <summary>2026-01-05 is a Monday.</summary>
    private static readonly DateTime MondayNoon = new(2026, 1, 5, 12, 0, 0);

    private const double DefaultLat = 32.0800;
    private const double DefaultLng = 34.7800;

    // --- Happy path / delegation ---

    [Fact]
    public async Task GetApprovedAvailableProvidersAsync_WithApprovedProvider_ReturnsSinglePin()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            Id = providerId,
            Name = "Alice Walker",
            Latitude = DefaultLat,
            Longitude = DefaultLng,
            ServiceRates =
            [
                (ServiceType.DogWalking, 50m),
                (ServiceType.Boarding, 120m),
            ],
        });
        var sut = new MapService(db);

        // Act
        var result = await sut.GetApprovedAvailableProvidersAsync();

        // Assert
        var pin = Assert.Single(result);
        Assert.Equal(providerId, pin.ProviderId);
        Assert.Equal("Alice Walker", pin.Name);
        Assert.Equal(DefaultLat, pin.Latitude);
        Assert.Equal(DefaultLng, pin.Longitude);
        Assert.Equal(50m, pin.MinRate);
        Assert.Contains("Boarding", pin.Services);
        Assert.Contains("Dog Walker", pin.Services);
        Assert.Equal(2, pin.ServiceRates!.Count);
    }

    [Fact]
    public async Task GetApprovedAvailableProvidersAsync_WithRequestedTime_DelegatesToAvailabilityLogic()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            AcceptsOffHoursRequests = false,
            AvailabilitySlots =
            [
                new AvailabilitySlot
                {
                    Id = Guid.NewGuid(),
                    DayOfWeek = (int)DayOfWeek.Monday,
                    StartTime = TimeSpan.FromHours(9),
                    EndTime = TimeSpan.FromHours(17),
                },
            ],
        });
        var sut = new MapService(db);
        var requestedTime = MondayNoon;

        // Act
        var result = await sut.GetApprovedAvailableProvidersAsync(requestedTime);

        // Assert
        Assert.Single(result);
    }

    // --- Exclusions ---

    [Fact]
    public async Task SearchProvidersAsync_WhenProviderPending_ExcludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions { Status = ProviderStatus.Pending });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter());

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenProviderSuspended_ExcludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions { IsSuspended = true });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter());

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenGeoLocationNull_ExcludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions { IncludeGeoLocation = false });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter());

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenIsAvailableNowFalse_StillIncludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions { IsAvailableNow = false });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter());

        // Assert
        Assert.Single(result);
    }

    // --- RequestedTime / availability ---

    [Fact]
    public async Task SearchProvidersAsync_WhenOutsideSlotAndNoOffHours_ExcludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            AcceptsOffHoursRequests = false,
            AvailabilitySlots =
            [
                new AvailabilitySlot
                {
                    Id = Guid.NewGuid(),
                    DayOfWeek = (int)DayOfWeek.Monday,
                    StartTime = TimeSpan.FromHours(9),
                    EndTime = TimeSpan.FromHours(17),
                },
            ],
        });
        var sut = new MapService(db);
        var mondayEvening = new DateTime(2026, 1, 5, 20, 0, 0);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(RequestedTime: mondayEvening));

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenOutsideSlotButAcceptsOffHours_IncludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            AcceptsOffHoursRequests = true,
            AvailabilitySlots =
            [
                new AvailabilitySlot
                {
                    Id = Guid.NewGuid(),
                    DayOfWeek = (int)DayOfWeek.Monday,
                    StartTime = TimeSpan.FromHours(9),
                    EndTime = TimeSpan.FromHours(17),
                },
            ],
        });
        var sut = new MapService(db);
        var mondayEvening = new DateTime(2026, 1, 5, 20, 0, 0);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(RequestedTime: mondayEvening));

        // Assert
        Assert.Single(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenInsideAvailabilitySlot_IncludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            AcceptsOffHoursRequests = false,
            AvailabilitySlots =
            [
                new AvailabilitySlot
                {
                    Id = Guid.NewGuid(),
                    DayOfWeek = (int)DayOfWeek.Monday,
                    StartTime = TimeSpan.FromHours(9),
                    EndTime = TimeSpan.FromHours(17),
                },
            ],
        });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(RequestedTime: MondayNoon));

        // Assert
        Assert.Single(result);
    }

    // --- ServiceType filter ---

    [Fact]
    public async Task SearchProvidersAsync_WhenServiceTypeMatches_IncludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            ServiceRates = [(ServiceType.DogWalking, 50m)],
        });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(ServiceType: "Dog Walker"));

        // Assert
        Assert.Single(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenServiceTypeCommaSeparated_IncludesIfAnyMatch()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            ServiceRates = [(ServiceType.DogWalking, 50m)],
        });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(ServiceType: "Dog Walker,Boarding"));

        // Assert
        Assert.Single(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenServiceTypeUnknown_IgnoresInvalidSegment()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions());
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(ServiceType: "NotARealService"));

        // Assert
        Assert.Single(result);
    }

    // --- MinRating / MaxRate ---

    [Fact]
    public async Task SearchProvidersAsync_WhenBelowMinRating_ExcludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions { AverageRating = 3.5m });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(MinRating: 4.0));

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenMaxRateExceeded_ExcludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            ServiceRates = [(ServiceType.DogWalking, 80m)],
        });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(MaxRate: 50m));

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenMaxRateWithServiceTypeAndRateWithinLimit_IncludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            ServiceRates =
            [
                (ServiceType.DogWalking, 50m),
                (ServiceType.Boarding, 200m),
            ],
        });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(ServiceType: "Dog Walker", MaxRate: 60m));

        // Assert
        Assert.Single(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenMaxRateWithServiceTypeAndRateExceeded_ExcludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            ServiceRates =
            [
                (ServiceType.DogWalking, 50m),
                (ServiceType.Boarding, 200m),
            ],
        });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(ServiceType: "Dog Walker", MaxRate: 40m));

        // Assert
        Assert.Empty(result);
    }

    // --- SearchTerm ---

    [Fact]
    public async Task SearchProvidersAsync_WhenSearchTermMatchesName_IncludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions { Name = "UniqueProviderName" });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(SearchTerm: "UniqueProvider"));

        // Assert
        Assert.Single(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenSearchTermMatchesServiceDisplayName_IncludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            Name = "Generic Name",
            ServiceRates = [(ServiceType.DogWalking, 50m)],
        });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(SearchTerm: "Walker"));

        // Assert
        Assert.Single(result);
    }

    // --- ProviderTypeFilter ---

    [Fact]
    public async Task SearchProvidersAsync_WhenProviderTypeMismatch_ExcludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions { Type = ProviderType.Individual });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(ProviderTypeFilter: ProviderType.Business));

        // Assert
        Assert.Empty(result);
    }

    // --- Radius ---

    [Fact]
    public async Task SearchProvidersAsync_WhenWithinRadiusKm_IncludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            Latitude = DefaultLat,
            Longitude = DefaultLng,
        });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(
            RadiusKm: 5,
            Latitude: DefaultLat,
            Longitude: DefaultLng));

        // Assert
        Assert.Single(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenOutsideRadiusKm_ExcludesProvider()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            Latitude = 33.5,
            Longitude = 35.5,
        });
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(
            RadiusKm: 5,
            Latitude: DefaultLat,
            Longitude: DefaultLng));

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenRadiusPartialCoordsProvided_SkipsRadiusFilter()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        await SeedProviderAsync(db, new ProviderSeedOptions
        {
            Latitude = 33.5,
            Longitude = 35.5,
        });
        var sut = new MapService(db);

        // Act — only latitude set; radius filter should not apply
        var result = await sut.SearchProvidersAsync(new MapSearchFilter(RadiusKm: 5, Latitude: DefaultLat));

        // Assert
        Assert.Single(result);
    }

    // --- Edge / null ---

    [Fact]
    public async Task SearchProvidersAsync_WhenFilterIsNull_ThrowsArgumentNullException()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var sut = new MapService(db);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(() => sut.SearchProvidersAsync(null!));
    }

    [Fact]
    public async Task SearchProvidersAsync_WhenEmptyDatabase_ReturnsEmptyList()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var sut = new MapService(db);

        // Act
        var result = await sut.SearchProvidersAsync(new MapSearchFilter());

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetApprovedAvailableProvidersAsync_WhenNoProviders_ReturnsEmptyList()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var sut = new MapService(db);

        // Act
        var result = await sut.GetApprovedAvailableProvidersAsync();

        // Assert
        Assert.Empty(result);
    }

    // --- Helpers ---

    private sealed class ProviderSeedOptions
    {
        public Guid? Id { get; init; }
        public string Name { get; init; } = "Test Provider";
        public ProviderStatus Status { get; init; } = ProviderStatus.Approved;
        public bool IsSuspended { get; init; }
        public bool IsAvailableNow { get; init; }
        public bool AcceptsOffHoursRequests { get; init; } = true;
        public bool IncludeGeoLocation { get; init; } = true;
        public double Latitude { get; init; } = DefaultLat;
        public double Longitude { get; init; } = DefaultLng;
        public decimal? AverageRating { get; init; }
        public ProviderType Type { get; init; } = ProviderType.Individual;
        public List<(ServiceType Service, decimal Rate)> ServiceRates { get; init; } =
            [(ServiceType.DogWalking, 50m)];
        public List<AvailabilitySlot>? AvailabilitySlots { get; init; }
    }

    private static async Task<Guid> SeedProviderAsync(ApplicationDbContext db, ProviderSeedOptions options)
    {
        var id = options.Id ?? Guid.NewGuid();
        Point? geo = options.IncludeGeoLocation
            ? new Point(options.Longitude, options.Latitude) { SRID = 4326 }
            : null;

        var rates = options.ServiceRates
            .Select((r, i) => new ProviderServiceRate
            {
                Id = Guid.NewGuid(),
                ProviderProfileId = id,
                Service = r.Service,
                Rate = r.Rate,
                Unit = PricingUnit.PerHour,
            })
            .ToList();

        var slots = options.AvailabilitySlots ?? [];
        foreach (var slot in slots)
            slot.ProviderId = id;

        var user = new User
        {
            Id = id,
            Name = options.Name,
            Email = $"provider-{id:N}@test.example",
            Phone = "+15550000000",
            Role = "Provider",
            CreatedAt = DateTime.UtcNow,
            ProviderProfile = new ProviderProfile
            {
                UserId = id,
                Status = options.Status,
                IsSuspended = options.IsSuspended,
                IsAvailableNow = options.IsAvailableNow,
                AcceptsOffHoursRequests = options.AcceptsOffHoursRequests,
                AverageRating = options.AverageRating,
                Type = options.Type,
                City = "Tel Aviv",
                Street = "Main",
                BuildingNumber = "1",
                ServiceRates = rates,
                AvailabilitySlots = slots,
            },
            Location = new PetOwner.Data.Models.Location
            {
                UserId = id,
                GeoLocation = geo,
            },
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return id;
    }
}
