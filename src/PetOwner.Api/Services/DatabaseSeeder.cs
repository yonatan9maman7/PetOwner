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

    private static readonly string[] ServiceDefinitions = ["Dog Walker", "Pet Sitter", "Boarding", "Drop-in Visit"];

    private static readonly (ServiceType Type, string Name, PricingUnit Unit, decimal MinRate, decimal MaxRate)[] ServiceRateDefinitions =
    [
        (ServiceType.DogWalking, "Dog Walker", PricingUnit.PerHour, 40, 120),
        (ServiceType.PetSitting, "Pet Sitter", PricingUnit.PerHour, 50, 150),
        (ServiceType.Boarding, "Boarding", PricingUnit.PerNight, 80, 250),
        (ServiceType.DropInVisit, "Drop-in Visit", PricingUnit.PerVisit, 30, 80),
    ];

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
                    Status = "Approved",
                    IsAvailableNow = isAvailable,
                    City = faker.Address.City(),
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

    /// <summary>
    /// Creates demo pets for non-provider, non-admin users that have no pets yet (e.g. after manual owner registration).
    /// </summary>
    public async Task<int> SeedBogusPetsForUsersWithoutPetsAsync(int maxUsers = 15, int petsPerUser = 1)
    {
        var faker = new Faker("en");

        var eligibleIds = await _db.Users
            .AsNoTracking()
            .Where(u => u.Role != "Provider" && u.Role != "Admin")
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
