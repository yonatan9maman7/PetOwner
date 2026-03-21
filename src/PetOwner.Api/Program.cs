using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NetTopologySuite.Geometries;
using PetOwner.Api.Hubs;
using PetOwner.Api.Infrastructure;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

var builder = WebApplication.CreateBuilder(args);

const string developmentJwtFallback = "DevOnly_JwtKey_ChangeBeforeSharing_1234567890";
const string developmentAdminPasswordFallback = "123123";
var developmentAdminDefaults = new List<AdminSeedUser>
{
    new() { Phone = "0500000001", Email = "yonatan9maman7@gmail.com", Name = "JonathanAdmin" }
};

if (builder.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(builder.Configuration["Jwt:Key"]))
{
    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["Jwt:Key"] = developmentJwtFallback
    });
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseInMemoryDatabase("PetOwnerDev"));
}
else
{
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlServer(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            sql =>
            {
                sql.UseNetTopologySuite();
                sql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(30), errorNumbersToAdd: null);
            }));
}

builder.Services.AddCors(options =>
{
    var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins")
        .Get<string[]>()?
        .Where(origin => !string.IsNullOrWhiteSpace(origin))
        .Select(origin => origin.Trim())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray()
        ?? Array.Empty<string>();

    var allowedOrigins = configuredOrigins.Length > 0
        ? configuredOrigins
        : builder.Environment.IsDevelopment()
            ? new[] { "http://localhost:4200" }
            : Array.Empty<string>();

    if (allowedOrigins.Length == 0)
        throw new InvalidOperationException("No CORS origins configured. Set Cors:AllowedOrigins.");

    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials());
});

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("Jwt:Key is not configured.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
    options.Events = new()
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddScoped<IMapService, MapService>();
builder.Services.AddScoped<DatabaseSeeder>();
builder.Services.AddHostedService<BookingExpirationService>();

builder.Services.Configure<StripeSettings>(builder.Configuration.GetSection(StripeSettings.SectionName));
builder.Services.AddScoped<IPaymentService, StripePaymentService>();
builder.Services.AddScoped<IGrowPaymentService, DummyGrowPaymentService>();

builder.Services.Configure<BlobStorageSettings>(builder.Configuration.GetSection(BlobStorageSettings.SectionName));
builder.Services.AddScoped<IBlobService, BlobService>();

builder.Services.AddHttpClient<IGeminiAiService, GeminiAiService>();

builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection(EmailSettings.SectionName));
builder.Services.AddScoped<IEmailService, SmtpEmailService>();

builder.Services.AddSignalR();
builder.Services.AddScoped<INotificationService, NotificationService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (app.Environment.IsDevelopment())
        db.Database.EnsureCreated();
    else
        db.Database.Migrate();

    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("AdminSeeding");
    await SeedAdminUsers(
        db,
        builder.Configuration,
        app.Environment,
        logger,
        developmentAdminDefaults,
        developmentAdminPasswordFallback);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

app.MapFallbackToFile("index.html");

app.Run();

static async Task SeedAdminUsers(
    ApplicationDbContext db,
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger logger,
    IReadOnlyCollection<AdminSeedUser> developmentDefaults,
    string developmentPasswordFallback)
{
    static string NormEmail(string email) => email.Trim().ToLowerInvariant();
    static string NormPhone(string phone) => phone.Trim();

    var configuredAdmins = configuration.GetSection("AdminSeed:Users")
        .Get<List<AdminSeedUser>>() ?? new List<AdminSeedUser>();

    var admins = configuredAdmins.Count > 0
        ? configuredAdmins.ToList()
        : environment.IsDevelopment()
            ? developmentDefaults.ToList()
            : new List<AdminSeedUser>();

    // In Development, always merge in default test admins (e.g. in-memory DB) if missing from config.
    if (environment.IsDevelopment())
    {
        foreach (var dev in developmentDefaults)
        {
            if (admins.Exists(a => string.Equals(NormEmail(a.Email), NormEmail(dev.Email), StringComparison.Ordinal)))
                continue;
            admins.Add(dev);
        }
    }

    var adminPassword = configuration["AdminSeed:Password"];
    if (string.IsNullOrWhiteSpace(adminPassword))
    {
        if (environment.IsDevelopment())
        {
            adminPassword = developmentPasswordFallback;
        }
        else
        {
            logger.LogWarning("Admin seeding skipped: AdminSeed:Password is not configured.");
            return;
        }
    }

    if (admins.Count == 0)
    {
        logger.LogWarning("Admin seeding skipped: no admin users configured.");
        return;
    }

    // Fresh BCrypt hash each startup so login matches the configured plain password (AuthController uses BCrypt.Verify).
    var passwordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);

    foreach (var admin in admins.Where(a =>
        !string.IsNullOrWhiteSpace(a.Phone)
        && !string.IsNullOrWhiteSpace(a.Email)
        && !string.IsNullOrWhiteSpace(a.Name)))
    {
        var phone = NormPhone(admin.Phone);
        var email = NormEmail(admin.Email);

        var existingByPhone = await db.Users.FirstOrDefaultAsync(u => u.Phone == phone);
        if (existingByPhone is not null)
        {
            existingByPhone.Email = email;
            existingByPhone.Name = admin.Name.Trim();
            existingByPhone.Role = "Admin";
            existingByPhone.PasswordHash = passwordHash;
            logger.LogInformation("Admin user updated (matched by phone {Phone})", phone);
            continue;
        }

        var existingByEmail = await db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
        if (existingByEmail is not null)
        {
            existingByEmail.Email = email;
            existingByEmail.Phone = phone;
            existingByEmail.Name = admin.Name.Trim();
            existingByEmail.Role = "Admin";
            existingByEmail.PasswordHash = passwordHash;
            logger.LogInformation("Admin user updated (matched by email {Email})", email);
            continue;
        }

        db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Phone = phone,
            Email = email,
            Name = admin.Name.Trim(),
            Role = "Admin",
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow
        });
        logger.LogInformation("Admin user created ({Email})", email);
    }

    await db.SaveChangesAsync();

    if (environment.IsDevelopment())
        await EnsureSeededAdminsHaveProviderProfilesAsync(db, admins, logger);
}

/// <summary>
/// Dev-only: seeded admins (e.g. yonatan9maman7@gmail.com) get an approved provider profile so
/// provider UI and /api/providers/* work without onboarding. Role stays Admin for /api/admin.
/// </summary>
static async Task EnsureSeededAdminsHaveProviderProfilesAsync(
    ApplicationDbContext db,
    IReadOnlyCollection<AdminSeedUser> admins,
    ILogger logger)
{
    static string NormEmailLocal(string email) => email.Trim().ToLowerInvariant();

    var definitions = new (string Name, ServiceType Type, PricingUnit Unit, decimal Rate)[]
    {
        ("Dog Walker", ServiceType.DogWalking, PricingUnit.PerHour, 75m),
        ("Pet Sitter", ServiceType.PetSitting, PricingUnit.PerHour, 90m),
        ("Boarding", ServiceType.Boarding, PricingUnit.PerNight, 150m),
        ("Drop-in Visit", ServiceType.DropInVisit, PricingUnit.PerVisit, 55m),
    };

    foreach (var name in definitions.Select(d => d.Name).Distinct())
    {
        if (await db.Services.AnyAsync(s => s.Name == name))
            continue;
        db.Services.Add(new Service { Name = name, Category = "PetCare" });
    }

    await db.SaveChangesAsync();

    foreach (var admin in admins.Where(a =>
                 !string.IsNullOrWhiteSpace(a.Phone)
                 && !string.IsNullOrWhiteSpace(a.Email)
                 && !string.IsNullOrWhiteSpace(a.Name)))
    {
        var email = NormEmailLocal(admin.Email);
        var user = await db.Users
            .Include(u => u.ProviderProfile)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

        if (user is null || user.ProviderProfile is not null)
            continue;

        var userId = user.Id;
        var services = await db.Services
            .AsNoTracking()
            .Where(s => definitions.Select(d => d.Name).Contains(s.Name))
            .ToListAsync();

        var serviceIdsByName = services.ToDictionary(s => s.Name, s => s.Id);

        // InMemory provider can throw DbUpdateConcurrencyException if we assign user.ProviderProfile
        // while User is still tracked (spurious UPDATE). Insert the graph via Add + clear tracker instead.
        db.ChangeTracker.Clear();

        var profile = new ProviderProfile
        {
            UserId = userId,
            Bio = "Local development admin — provider profile for testing provider views.",
            Status = "Approved",
            IsAvailableNow = false,
            City = "Tel Aviv",
            Street = "Dizengoff Street",
            BuildingNumber = "100",
            ApartmentNumber = null,
            ReferenceName = "Dev Admin Reference",
            ReferenceContact = "0500000000",
            AcceptsOffHoursRequests = true,
        };

        foreach (var def in definitions)
        {
            profile.ServiceRates.Add(new ProviderServiceRate
            {
                Id = Guid.NewGuid(),
                ProviderProfileId = userId,
                Service = def.Type,
                Rate = def.Rate,
                Unit = def.Unit,
            });
            profile.ProviderServices.Add(new ProviderService
            {
                ProviderId = userId,
                ServiceId = serviceIdsByName[def.Name],
            });
        }

        db.ProviderProfiles.Add(profile);

        var hasLocation = await db.Locations.AsNoTracking().AnyAsync(l => l.UserId == userId);
        if (!hasLocation)
        {
            db.Locations.Add(new PetOwner.Data.Models.Location
            {
                UserId = userId,
                GeoLocation = new Point(34.7749, 32.0809) { SRID = 4326 },
            });
        }

        logger.LogInformation("Attached approved dev provider profile for admin {Email}", email);
        await db.SaveChangesAsync();
    }
}

internal class AdminSeedUser
{
    public string Phone { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}
