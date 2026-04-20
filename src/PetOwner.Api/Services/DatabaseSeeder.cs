using Bogus;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using PetOwner.Data;
using PetOwner.Data.Models;
using Location = PetOwner.Data.Models.Location;

namespace PetOwner.Api.Services;

public class DatabaseSeeder
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<DatabaseSeeder> _logger;

    private const int ProviderCount = 30;
    private const string SeedPassword = "Seeded_Provider_123!";

    private static readonly string[] DogLoverBios =
    [
        "Lifelong dog lover with years of experience caring for pups of all sizes.",
        "Passionate about animals — I treat every dog like my own family member.",
        "Experienced dog walker who loves spending time outdoors with furry friends.",
        "Devoted pet caretaker with a calm and patient approach to every breed.",
        "Animal enthusiast who believes every dog deserves love, walks, and belly rubs.",
        "Reliable and caring pet sitter — your dog's happiness is my top priority.",
        "I grew up surrounded by dogs and can't imagine life without them.",
        "Professional and loving pet care provider with a soft spot for rescue dogs.",
        "Energetic and attentive walker — I make every outing an adventure for your pup.",
        "Certified pet first-aid trained and deeply passionate about canine wellbeing."
    ];

    // Tel Aviv bounding box (used by SeedProvidersAsync)
    private const double MinLatitude = 32.0400;
    private const double MaxLatitude = 32.1200;
    private const double MinLongitude = 34.7400;
    private const double MaxLongitude = 34.8100;

    private static readonly string[] ServiceDefinitions = ["Dog Walker", "Pet Sitter", "Boarding", "Drop-in Visit", "Pet Trainer", "Pet Insurance", "Pet Store"];

    private static readonly (ServiceType Type, string Name, PricingUnit Unit, decimal MinRate, decimal MaxRate)[] ServiceRateDefinitions =
    [
        (ServiceType.DogWalking, "Dog Walker", PricingUnit.PerHour, 40, 120),
        (ServiceType.PetSitting, "Pet Sitter", PricingUnit.PerHour, 50, 150),
        (ServiceType.Boarding, "Boarding", PricingUnit.PerNight, 80, 250),
        (ServiceType.DropInVisit, "Drop-in Visit", PricingUnit.PerVisit, 30, 80),
        (ServiceType.Training, "Pet Trainer", PricingUnit.PerSession, 100, 300),
        (ServiceType.Insurance, "Pet Insurance", PricingUnit.PerPackage, 150, 500),
        (ServiceType.PetStore, "Pet Store", PricingUnit.PerVisit, 20, 200),
    ];

    /// <summary>
    /// Service types that have a row in <see cref="ServiceDefinitions"/> / <see cref="ServiceRateDefinitions"/>.
    /// Do not use <see cref="Enum.GetValues{TEnum}"/> here: extra enum members (e.g. HouseSitting) map to the same ServiceId in
    /// <see cref="ServiceIdFor"/> and violate the composite PK (ProviderId, ServiceId) on <see cref="ProviderService"/>.
    /// </summary>
    private static readonly ServiceType[] DemoSeedServiceTypes = ServiceRateDefinitions.Select(d => d.Type).ToArray();

    private static readonly string[] IsraeliCities = ["Tel Aviv"];

    private static readonly string[] DogBreeds =
    [
        "Golden Retriever", "Labrador Retriever", "French Bulldog", "German Shepherd",
        "Poodle", "Beagle", "Rottweiler", "Cocker Spaniel", "Shih Tzu",
        "Cavalier King Charles", "Bichon Frise", "Israeli Canaan Dog", "Mixed Breed",
    ];

    private static readonly string[] CatBreeds =
    [
        "Persian", "Siamese", "Maine Coon", "Ragdoll", "British Shorthair",
        "Russian Blue", "Scottish Fold", "Mixed Breed",
    ];

    private static readonly string[] PetNames =
    [
        "Luna", "Charlie", "Max", "Bella", "Leo", "Milo", "Coco", "Simba",
        "Rocky", "Lucky", "Daisy", "Oliver", "Lola", "Shadow", "Rex", "Buddy",
        "Nala", "Ginger", "Pixel", "Mitz", "Shoko", "Lulu", "Teddy", "Oscar",
    ];

    public DatabaseSeeder(ApplicationDbContext db, ILogger<DatabaseSeeder> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<(int Providers, int Owners, int Pets, int Bookings, int Reviews, int GroupPosts, int SocialPosts)>
        SeedFullDemoEcosystemAsync()
    {
        var faker = new Faker("en");
        var fakerEn = faker;
        var serviceIds = await EnsureServicesExistAsync();
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(SeedPassword);

        // Tel Aviv bounding box
        const double centralMinLat = 32.0400, centralMaxLat = 32.1200;
        const double centralMinLng = 34.7400, centralMaxLng = 34.8100;

        var phoneSalt = (int)(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() % 100_000);
        var phoneIdx = 0;
        string NextPhone()
        {
            var idx = phoneIdx++;
            return $"05{2 + idx % 8}{phoneSalt:D5}{idx:D2}";
        }

        int ServiceIdFor(ServiceType type) => type switch
        {
            ServiceType.DogWalking => serviceIds[0],
            ServiceType.PetSitting => serviceIds[1],
            ServiceType.Boarding => serviceIds[2],
            ServiceType.DropInVisit => serviceIds[3],
            ServiceType.Training => serviceIds[4],
            ServiceType.Insurance => serviceIds[5],
            ServiceType.PetStore => serviceIds[6],
            _ => serviceIds[0],
        };

        // ===== 1. CREATE 10 PROVIDERS =====
        const int providerCount = 10;
        var providerUsers = new User[providerCount];

        for (var i = 0; i < providerCount; i++)
        {
            var id = Guid.NewGuid();
            var seed = Guid.NewGuid().ToString("N")[..8];

            var assignedServices = faker.Random.Shuffle(DemoSeedServiceTypes)
                .Take(faker.Random.Int(1, DemoSeedServiceTypes.Length))
                .ToArray();

            var providerServices = assignedServices
                .Select(st => new ProviderService { ProviderId = id, ServiceId = ServiceIdFor(st) })
                .ToList();

            var serviceRates = assignedServices
                .Select(st =>
                {
                    var rateDef = ServiceRateDefinitions.First(d => d.Type == st);
                    return new ProviderServiceRate
                    {
                        ProviderProfileId = id,
                        Service = st,
                        Rate = fakerEn.Finance.Amount(rateDef.MinRate, rateDef.MaxRate, 0),
                        Unit = rateDef.Unit,
                    };
                })
                .ToList();

            providerUsers[i] = new User
            {
                Id = id,
                Name = faker.Name.FullName(),
                Email = $"{fakerEn.Internet.UserName()}.{seed}@demo.petowner.co.il",
                Phone = NextPhone(),
                Role = "Provider",
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow.AddDays(-faker.Random.Int(30, 90)),
                IsActive = true,
                ProviderProfile = new ProviderProfile
                {
                    UserId = id,
                    Bio = fakerEn.Lorem.Paragraph(),
                    ProfileImageUrl = $"https://api.dicebear.com/9.x/avataaars/svg?seed={seed}",
                    Status = ProviderStatus.Approved,
                    IsAvailableNow = faker.Random.Bool(0.8f),
                    City = faker.PickRandom(IsraeliCities),
                    Street = faker.Address.StreetName(),
                    BuildingNumber = faker.Random.Int(1, 120).ToString(),
                    ApartmentNumber = faker.Random.Bool(0.2f) ? faker.Random.Int(1, 20).ToString() : null,
                    ReferenceName = faker.Name.FullName(),
                    ReferenceContact = $"05{faker.Random.Int(20000000, 59999999)}",
                    ProviderServices = providerServices,
                    ServiceRates = serviceRates,
                },
                Location = new Location
                {
                    UserId = id,
                    GeoLocation = new Point(
                        faker.Random.Double(centralMinLng, centralMaxLng),
                        faker.Random.Double(centralMinLat, centralMaxLat))
                    { SRID = 4326 },
                },
            };
        }

        _db.Users.AddRange(providerUsers);

        // ===== 2. CREATE 15 OWNERS WITH PETS =====
        const int ownerCount = 15;
        var ownerUsers = new User[ownerCount];
        var totalPets = 0;

        for (var i = 0; i < ownerCount; i++)
        {
            var id = Guid.NewGuid();
            var seed = Guid.NewGuid().ToString("N")[..8];
            var numPets = faker.Random.Int(1, 3);

            var pets = Enumerable.Range(0, numPets).Select(_ =>
            {
                var species = faker.PickRandom(PetSpecies.Dog, PetSpecies.Cat);
                return new Pet
                {
                    UserId = id,
                    Name = faker.PickRandom(PetNames),
                    Species = species,
                    Breed = species == PetSpecies.Dog
                        ? faker.PickRandom(DogBreeds)
                        : faker.PickRandom(CatBreeds),
                    Age = faker.Random.Int(1, 14),
                    Weight = Math.Round(faker.Random.Double(2, 45), 1),
                    IsNeutered = faker.Random.Bool(0.6f),
                    MedicalNotes = faker.Random.Bool(0.2f) ? fakerEn.Lorem.Sentence() : null,
                    Notes = faker.Random.Bool(0.3f) ? fakerEn.Lorem.Sentence() : null,
                };
            }).ToList();

            totalPets += pets.Count;

            ownerUsers[i] = new User
            {
                Id = id,
                Name = faker.Name.FullName(),
                Email = $"{fakerEn.Internet.UserName()}.{seed}@demo.petowner.co.il",
                Phone = NextPhone(),
                Role = "Owner",
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow.AddDays(-faker.Random.Int(15, 120)),
                IsActive = true,
                Pets = pets,
            };
        }

        _db.Users.AddRange(ownerUsers);

        // ===== 3. CREATE COMPLETED BOOKINGS =====
        var bookings = new List<Booking>();
        foreach (var owner in ownerUsers)
        {
            var numBookings = faker.Random.Int(1, 2);
            for (var b = 0; b < numBookings; b++)
            {
                var provider = faker.PickRandom(providerUsers);
                var serviceType = faker.PickRandom(DemoSeedServiceTypes);
                var daysAgo = faker.Random.Int(5, 45);

                bookings.Add(new Booking
                {
                    Id = Guid.NewGuid(),
                    OwnerId = owner.Id,
                    ProviderProfileId = provider.Id,
                    Service = serviceType,
                    StartDate = DateTime.UtcNow.AddDays(-daysAgo),
                    EndDate = DateTime.UtcNow.AddDays(-daysAgo + (serviceType == ServiceType.Boarding ? 3 : 1)),
                    TotalPrice = fakerEn.Finance.Amount(80, 250, 0),
                    Status = BookingStatus.Completed,
                    PaymentStatus = PaymentStatus.Paid,
                    CreatedAt = DateTime.UtcNow.AddDays(-daysAgo - 2),
                });
            }
        }

        _db.Bookings.AddRange(bookings);

        // ===== 4. CREATE REVIEWS FOR EACH BOOKING =====
        var reviews = new List<Review>();
        foreach (var bk in bookings)
        {
            reviews.Add(new Review
            {
                BookingId = bk.Id,
                ReviewerId = bk.OwnerId,
                RevieweeId = bk.ProviderProfileId,
                Rating = faker.Random.Int(4, 5),
                Comment = fakerEn.Lorem.Sentence(),
                CommunicationRating = faker.Random.Int(4, 5),
                ReliabilityRating = faker.Random.Int(4, 5),
                IsVerified = true,
                CreatedAt = bk.StartDate.AddDays(1),
            });
        }

        _db.Reviews.AddRange(reviews);

        // ===== 5. UPDATE PROVIDER RATING AGGREGATES =====
        foreach (var pu in providerUsers)
        {
            var providerReviews = reviews.Where(r => r.RevieweeId == pu.Id).ToList();
            if (providerReviews.Count <= 0) continue;
            pu.ProviderProfile!.ReviewCount = providerReviews.Count;
            pu.ProviderProfile.AverageRating =
                (decimal)Math.Round(providerReviews.Average(r => r.Rating), 2);
        }

        // ===== 6. CREATE COMMUNITY GROUPS & POSTS =====
        var groupCity1 = faker.PickRandom(IsraeliCities);
        var group1 = new CommunityGroup
        {
            Id = Guid.NewGuid(),
            Name = $"{groupCity1} Pet Owners",
            Description = fakerEn.Lorem.Paragraph(),
            TargetCountry = "Israel",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-faker.Random.Int(30, 90)),
        };

        var groupCity2 = faker.PickRandom(IsraeliCities);
        var group2 = new CommunityGroup
        {
            Id = Guid.NewGuid(),
            Name = $"{groupCity2} Dog Walkers",
            Description = fakerEn.Lorem.Paragraph(),
            TargetCountry = "Israel",
            TargetCity = groupCity2,
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-faker.Random.Int(20, 60)),
        };

        _db.CommunityGroups.AddRange(group1, group2);

        var allUserIds = providerUsers.Select(u => u.Id)
            .Concat(ownerUsers.Select(u => u.Id)).ToArray();

        const int groupPostCount = 12;
        var groupPosts = new List<GroupPost>();
        for (var i = 0; i < groupPostCount; i++)
        {
            var targetGroup = faker.PickRandom(group1, group2);
            groupPosts.Add(new GroupPost
            {
                GroupId = targetGroup.Id,
                AuthorId = faker.PickRandom(allUserIds),
                Content = fakerEn.Lorem.Sentence(),
                Country = "Israel",
                City = targetGroup.TargetCity,
                CreatedAt = DateTime.UtcNow.AddDays(-faker.Random.Int(1, 30)).AddHours(-faker.Random.Int(1, 12)),
            });
        }

        _db.GroupPosts.AddRange(groupPosts);

        // ===== 7. CREATE SOCIAL FEED POSTS =====
        const int socialPostCount = 10;
        var socialPosts = new List<Post>();
        for (var i = 0; i < socialPostCount; i++)
        {
            socialPosts.Add(new Post
            {
                UserId = faker.PickRandom(ownerUsers).Id,
                Content = fakerEn.Lorem.Sentence(),
                City = faker.PickRandom(IsraeliCities),
                CreatedAt = DateTime.UtcNow.AddDays(-faker.Random.Int(1, 20)).AddHours(-faker.Random.Int(1, 12)),
            });
        }

        _db.Posts.AddRange(socialPosts);

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Demo ecosystem seeded: {P} providers, {O} owners, {Pets} pets, {B} bookings, {R} reviews, {GP} group posts, {SP} social posts",
            providerUsers.Length, ownerUsers.Length, totalPets,
            bookings.Count, reviews.Count, groupPosts.Count, socialPosts.Count);

        return (providerUsers.Length, ownerUsers.Length, totalPets,
            bookings.Count, reviews.Count, groupPosts.Count, socialPosts.Count);
    }

    public async Task<int> SeedProvidersAsync()
    {
        var serviceIds = await EnsureServicesExistAsync();
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(SeedPassword);

        var faker = new Faker("en");
        var users = new List<User>(ProviderCount);

        for (var i = 0; i < ProviderCount; i++)
        {
            var userId = Guid.NewGuid();
            var isAvailable = faker.Random.Double() < 0.8;

            var providerServices = GenerateProviderServices(faker, userId, serviceIds);
            var serviceRates = GenerateServiceRates(faker, userId, providerServices, serviceIds);

            var user = new User
            {
                Id = userId,
                Phone = GenerateIsraeliPhone(faker, i),
                Email = faker.Internet.Email(),
                Name = faker.Name.FullName(),
                Role = "Provider",
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow,
                ProviderProfile = new ProviderProfile
                {
                    UserId = userId,
                    Bio = faker.PickRandom(DogLoverBios),
                    Status = ProviderStatus.Approved,
                    IsAvailableNow = isAvailable,
                    City = "Tel Aviv",
                    Street = faker.Address.StreetName(),
                    BuildingNumber = faker.Address.BuildingNumber(),
                    ApartmentNumber = faker.Random.Int(0, 4) == 0 ? faker.Random.Int(1, 32).ToString() : null,
                    ReferenceName = faker.Name.FullName(),
                    ReferenceContact = faker.Phone.PhoneNumber("05########"),
                    ProviderServices = providerServices,
                    ServiceRates = serviceRates,
                },
                Location = new Location
                {
                    UserId = userId,
                    GeoLocation = new Point(
                        faker.Random.Double(MinLongitude, MaxLongitude),
                        faker.Random.Double(MinLatitude, MaxLatitude))
                    { SRID = 4326 },
                }
            };

            users.Add(user);
        }

        _db.Users.AddRange(users);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} dummy providers in Tel Aviv area", users.Count);
        return users.Count;
    }

    private async Task<List<int>> EnsureServicesExistAsync()
    {
        var ids = new List<int>();

        foreach (var name in ServiceDefinitions)
        {
            var service = await _db.Services
                .FirstOrDefaultAsync(s => s.Name == name);

            if (service is null)
            {
                service = new Service { Name = name, Category = "PetCare" };
                _db.Services.Add(service);
                await _db.SaveChangesAsync();
            }

            ids.Add(service.Id);
        }

        return ids;
    }

    private static List<ProviderService> GenerateProviderServices(
        Faker faker, Guid providerId, List<int> serviceIds)
    {
        var count = faker.Random.Int(1, serviceIds.Count);
        return faker.Random.Shuffle(serviceIds)
            .Take(count)
            .Select(sid => new ProviderService
            {
                ProviderId = providerId,
                ServiceId = sid
            })
            .ToList();
    }

    private static List<ProviderServiceRate> GenerateServiceRates(
        Faker faker, Guid providerId, List<ProviderService> providerServices, List<int> allServiceIds)
    {
        var rates = new List<ProviderServiceRate>();

        foreach (var ps in providerServices)
        {
            var idx = allServiceIds.IndexOf(ps.ServiceId);
            if (idx < 0 || idx >= ServiceRateDefinitions.Length) continue;

            var def = ServiceRateDefinitions[idx];
            rates.Add(new ProviderServiceRate
            {
                ProviderProfileId = providerId,
                Service = def.Type,
                Rate = faker.Finance.Amount(def.MinRate, def.MaxRate, 0),
                Unit = def.Unit,
            });
        }

        return rates;
    }

    private static string GenerateIsraeliPhone(Faker faker, int index)
    {
        return $"05{faker.Random.Int(0, 9)}{900_0000 + index:D7}";
    }

    public async Task<int> SeedBogusPetsForUsersWithoutPetsAsync(int maxUsers = 15, int petsPerUser = 1)
    {
        var faker = new Faker("en");

        var eligibleIds = await _db.Users
            .AsNoTracking()
            .Where(u => !_db.Pets.Any(p => p.UserId == u.Id))
            .OrderBy(u => u.CreatedAt)
            .Select(u => u.Id)
            .Take(maxUsers)
            .ToListAsync();

        if (eligibleIds.Count == 0)
            return 0;

        var pets = new List<Pet>();
        foreach (var userId in eligibleIds)
        {
            for (var i = 0; i < petsPerUser; i++)
                pets.Add(CreateBogusPet(faker, userId));
        }

        _db.Pets.AddRange(pets);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Seeded {PetCount} bogus pets for {UserCount} users without pets", pets.Count, eligibleIds.Count);
        return pets.Count;
    }

    private static Pet CreateBogusPet(Faker faker, Guid userId)
    {
        return new Pet
        {
            UserId = userId,
            Name = faker.Name.FirstName(),
            Species = faker.PickRandom<PetSpecies>(),
            Breed = faker.PickRandom("Mixed / Mutt", "Golden Retriever", "Labrador Retriever", "French Bulldog", "Persian", "Poodle", "Other"),
            Age = faker.Random.Int(1, 16),
            Weight = faker.Random.Bool(0.7f) ? Math.Round(faker.Random.Double(2, 45), 1) : null,
            IsNeutered = faker.Random.Bool(),
            Allergies = faker.Random.Bool(0.25f)
                ? faker.PickRandom("Chicken", "Beef, Grains", "Fleas", "Chicken, Beef")
                : null,
            MedicalConditions = faker.Random.Bool(0.12f) ? faker.Lorem.Word() : null,
            Notes = faker.Random.Bool(0.35f) ? faker.Lorem.Sentence() : null,
        };
    }
}
