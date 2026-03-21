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

    // Florentin, Tel Aviv bounding box
    private const double MinLatitude = 32.0540;
    private const double MaxLatitude = 32.0600;
    private const double MinLongitude = 34.7640;
    private const double MaxLongitude = 34.7750;

    private static readonly string[] ServiceDefinitions = ["Dog Walker", "Pet Sitter", "Boarding"];

    public DatabaseSeeder(ApplicationDbContext db, ILogger<DatabaseSeeder> logger)
    {
        _db = db;
        _logger = logger;
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
                    HourlyRate = faker.Finance.Amount(40, 120, 0),
                    Status = "Approved",
                    IsAvailableNow = isAvailable,
                    City = faker.Address.City(),
                    Street = faker.Address.StreetName(),
                    BuildingNumber = faker.Address.BuildingNumber(),
                    ApartmentNumber = faker.Random.Int(0, 4) == 0 ? faker.Random.Int(1, 32).ToString() : null,
                    ReferenceName = faker.Name.FullName(),
                    ReferenceContact = faker.Phone.PhoneNumber("05########"),
                    ProviderServices = GenerateProviderServices(faker, userId, serviceIds)
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

        _logger.LogInformation("Seeded {Count} dummy providers in Florentin area", users.Count);
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

    private static string GenerateIsraeliPhone(Faker faker, int index)
    {
        return $"05{faker.Random.Int(0, 9)}{900_0000 + index:D7}";
    }
}
