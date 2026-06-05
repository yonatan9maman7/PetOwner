using Microsoft.EntityFrameworkCore;
using PetOwner.Data;

namespace PetOwner.Api.Services;

public class PetBirthdayWorker : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(24);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PetBirthdayWorker> _logger;

    public PetBirthdayWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<PetBirthdayWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendBirthdayNotifications(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing pet birthday notifications.");
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task SendBirthdayNotifications(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var today = DateTime.UtcNow;
        var month = today.Month;
        var day = today.Day;
        var todayDate = today.Date;

        var birthdayPets = await db.Pets
            .AsNoTracking()
            .Where(p => p.BirthDate.HasValue
                && p.BirthDate.Value.Month == month
                && p.BirthDate.Value.Day == day
                && p.User.IsActive)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.UserId,
                BirthDate = p.BirthDate!.Value,
                p.User.PreferredLanguage,
            })
            .ToListAsync(ct);

        if (birthdayPets.Count == 0)
            return;

        var totalSent = 0;

        foreach (var pet in birthdayPets)
        {
            try
            {
                var alreadySent = await db.Notifications.AnyAsync(
                    n => n.Type == "pet_birthday"
                        && n.RelatedEntityId == pet.Id
                        && n.CreatedAt.Date == todayDate,
                    ct);

                if (alreadySent)
                    continue;

                var newAge = today.Year - pet.BirthDate.Year;
                var isEnglish = pet.PreferredLanguage?.StartsWith("en", StringComparison.OrdinalIgnoreCase) == true;

                var message = isEnglish
                    ? $"Today {pet.Name} is celebrating their {newAge} birthday! Give them a big hug from us."
                    : $"היום {pet.Name} חוגג/ת יום הולדת {newAge}! תנו לו/לה חיבוק ענק מאיתנו.";

                await notifications.CreateAsync(
                    pet.UserId,
                    "pet_birthday",
                    "NOTIFICATIONS.PET_BIRTHDAY_TITLE",
                    message,
                    pet.Id);

                totalSent++;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to send birthday notification for pet {PetId} (owner {UserId}).",
                    pet.Id,
                    pet.UserId);
            }
        }

        if (totalSent > 0)
            _logger.LogInformation("Sent {Count} pet birthday notification(s).", totalSent);
    }
}
