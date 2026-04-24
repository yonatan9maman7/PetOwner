using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NetTopologySuite.Geometries;
using PetOwner.Api.Hubs;
using PetOwner.Api.Infrastructure;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

var builder = WebApplication.CreateBuilder(args);

if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("DefaultConnection")))
{
    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrWhiteSpace(databaseUrl))
    {
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = databaseUrl
        });
    }
}

const string developmentAdminPasswordFallback = "123123";

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();
}

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
    if (builder.Environment.IsDevelopment())
    {
        options.AddDefaultPolicy(policy =>
            policy.SetIsOriginAllowed(_ => true)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials());
    }
    else
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? Array.Empty<string>();
        var allowed = origins
            .Select(o => o.Trim())
            .Where(o => o.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        if (allowed.Length == 0)
        {
            throw new InvalidOperationException(
                "Cors:AllowedOrigins must list at least one origin when ASPNETCORE_ENVIRONMENT is not Development. " +
                "Set Cors:AllowedOrigins in configuration (e.g. appsettings or environment variables).");
        }

        options.AddDefaultPolicy(policy =>
            policy.WithOrigins(allowed)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials());
    }
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

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("AuthPolicy", context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            ip,
            _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
            });
    });
});

builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddSingleton<IGoogleIdTokenValidator, GoogleIdTokenValidator>();
builder.Services.AddSingleton<IAppleIdTokenValidator, AppleIdTokenValidator>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IMapService, MapService>();
builder.Services.AddScoped<IProviderShareCardService, ProviderShareCardService>();
builder.Services.AddScoped<DatabaseSeeder>();
builder.Services.AddHostedService<BookingExpirationService>();
builder.Services.AddHostedService<VaccinationReminderService>();

builder.Services.Configure<GrowSettings>(builder.Configuration.GetSection(GrowSettings.SectionName));
builder.Services.AddHttpClient<IGrowPaymentService, GrowPaymentService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
});

builder.Services.Configure<BlobStorageSettings>(builder.Configuration.GetSection(BlobStorageSettings.SectionName));
builder.Services.AddScoped<IBlobService, BlobService>();

builder.Services.AddHttpClient<IGeminiAiService, GeminiAiService>();

builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection(EmailSettings.SectionName));
builder.Services.AddScoped<IEmailService, SmtpEmailService>();

builder.Services.AddSignalR();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IAchievementService, AchievementService>();
builder.Services.AddHttpClient<IExpoPushService, ExpoPushService>(client =>
{
    client.BaseAddress = new Uri("https://exp.host");
    client.Timeout = TimeSpan.FromSeconds(15);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
    client.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate");
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (app.Environment.IsDevelopment())
        db.Database.EnsureCreated();
    else if (app.Environment.IsProduction())
        db.Database.Migrate();

    if (app.Environment.IsDevelopment())
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("AdminSeeding");
        await SeedAdminUsers(
            db,
            builder.Configuration,
            app.Environment,
            logger,
            developmentAdminPasswordFallback);
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler();

app.UseRouting();
app.UseRateLimiter();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<ChatHub>("/hubs/chat");

app.MapFallbackToFile("index.html");

app.Run();

static async Task SeedAdminUsers(
    ApplicationDbContext db,
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger logger,
    string developmentPasswordFallback)
{
    static string NormEmail(string email) => email.Trim().ToLowerInvariant();
    static string NormPhone(string phone) => phone.Trim();

    // Always ensure these accounts exist (custom User + Role string; auth uses BCrypt like AuthController).
    const string builtInAdminPassword = "Admin1!";
    AdminSeedUser[] builtInAdmins =
    [
        new() { Phone = "0500000001", Email = "yonatan9maman7@gmail.com", Name = "JonathanAdmin" },
        new() { Phone = "0500000002", Email = "tomerappleid@gmail.com", Name = "TomerAdmin" },
        new() { Phone = "0500000003", Email = "meyromlevin@gmail.com", Name = "MeyromAdmin" },
    ];
    var builtInEmailSet = new HashSet<string>(builtInAdmins.Select(a => NormEmail(a.Email)), StringComparer.Ordinal);

    var configuredAdmins = configuration.GetSection("AdminSeed:Users")
        .Get<List<AdminSeedUser>>() ?? new List<AdminSeedUser>();

    var admins = configuredAdmins.Count > 0
        ? configuredAdmins.ToList()
        : new List<AdminSeedUser>();

    foreach (var seed in builtInAdmins)
    {
        var key = NormEmail(seed.Email);
        var idx = admins.FindIndex(a => NormEmail(a.Email) == key);
        if (idx < 0)
            admins.Add(seed);
        else
            admins[idx] = seed;
    }

    string? adminPassword = configuration["AdminSeed:Password"];
    if (string.IsNullOrWhiteSpace(adminPassword) && environment.IsDevelopment())
        adminPassword = developmentPasswordFallback;

    if (admins.Count == 0)
    {
        logger.LogWarning("Admin seeding skipped: no admin users configured.");
        return;
    }

    foreach (var admin in admins.Where(a =>
        !string.IsNullOrWhiteSpace(a.Phone)
        && !string.IsNullOrWhiteSpace(a.Email)
        && !string.IsNullOrWhiteSpace(a.Name)))
    {
        var phone = NormPhone(admin.Phone);
        var email = NormEmail(admin.Email);
        var isBuiltIn = builtInEmailSet.Contains(email);

        var plainPassword = isBuiltIn ? builtInAdminPassword : adminPassword;
        if (plainPassword is null)
        {
            logger.LogWarning(
                "Skipping admin seed for {Email}: AdminSeed:Password is not configured (built-in admins use a fixed password).",
                email);
            continue;
        }

        // Fresh BCrypt hash each startup so login matches the plain password (AuthController uses BCrypt.Verify).
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(plainPassword);

        // Built-in admins: match by email first so we never repoint another user's row that only shares the seed phone.
        User? existing = null;
        var matchedBy = "";
        if (isBuiltIn)
        {
            existing = await db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
            if (existing is not null)
                matchedBy = "email";
            else
            {
                existing = await db.Users.FirstOrDefaultAsync(u => u.Phone == phone);
                if (existing is not null)
                    matchedBy = "phone";
            }
        }
        else
        {
            existing = await db.Users.FirstOrDefaultAsync(u => u.Phone == phone);
            if (existing is not null)
                matchedBy = "phone";
            else
            {
                existing = await db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
                if (existing is not null)
                    matchedBy = "email";
            }
        }

        if (existing is not null)
        {
            existing.Email = email;
            existing.Phone = phone;
            existing.Name = admin.Name.Trim();
            existing.Role = "Admin";
            existing.PasswordHash = passwordHash;
            logger.LogInformation("Admin user updated ({Email}, matched by {Match})", email, matchedBy);
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
        ("Pet Trainer", ServiceType.Training, PricingUnit.PerSession, 200m),
        ("Pet Insurance", ServiceType.Insurance, PricingUnit.PerPackage, 350m),
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
            Status = ProviderStatus.Approved,
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
