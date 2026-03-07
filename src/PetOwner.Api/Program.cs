using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PetOwner.Api.Hubs;
using PetOwner.Api.Infrastructure;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

var builder = WebApplication.CreateBuilder(args);

const string developmentJwtFallback = "DevOnly_JwtKey_ChangeBeforeSharing_1234567890";
const string developmentAdminPasswordFallback = "DevOnly_AdminPassword_ChangeMe_123!";
var developmentAdminDefaults = new List<AdminSeedUser>
{
    new() { Phone = "0500000001", Name = "JonathanAdmin" },
    new() { Phone = "0500000002", Name = "TomerAdmin" }
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
builder.Services.AddScoped<IMapService, MapService>();
builder.Services.AddScoped<DatabaseSeeder>();
builder.Services.AddHostedService<BookingExpirationService>();

builder.Services.Configure<StripeSettings>(builder.Configuration.GetSection(StripeSettings.SectionName));
builder.Services.AddScoped<IPaymentService, StripePaymentService>();

builder.Services.Configure<BlobStorageSettings>(builder.Configuration.GetSection(BlobStorageSettings.SectionName));
builder.Services.AddScoped<IBlobService, BlobService>();

builder.Services.Configure<OpenAiSettings>(builder.Configuration.GetSection(OpenAiSettings.SectionName));
builder.Services.AddScoped<ITeletriageService, OpenAiTeletriageService>();
builder.Services.AddScoped<IAiService, OpenAiService>();

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
    var configuredAdmins = configuration.GetSection("AdminSeed:Users")
        .Get<List<AdminSeedUser>>() ?? new List<AdminSeedUser>();

    var admins = configuredAdmins.Count > 0
        ? configuredAdmins
        : environment.IsDevelopment()
            ? developmentDefaults.ToList()
            : new List<AdminSeedUser>();

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

    foreach (var admin in admins.Where(a => !string.IsNullOrWhiteSpace(a.Phone) && !string.IsNullOrWhiteSpace(a.Name)))
    {
        if (!await db.Users.AnyAsync(u => u.Phone == admin.Phone))
        {
            db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Phone = admin.Phone,
                Name = admin.Name,
                Role = "Admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                CreatedAt = DateTime.UtcNow
            });
        }
    }

    await db.SaveChangesAsync();
}

internal class AdminSeedUser
{
    public string Phone { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}
