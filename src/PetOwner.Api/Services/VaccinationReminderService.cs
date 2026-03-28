using Microsoft.EntityFrameworkCore;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

public class VaccinationReminderService : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(24);
    private static readonly int[] ReminderDays = [7, 1];

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<VaccinationReminderService> _logger;

    public VaccinationReminderService(
        IServiceScopeFactory scopeFactory,
        ILogger<VaccinationReminderService> logger)
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
                await SendVaccinationReminders(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing vaccination reminders.");
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task SendVaccinationReminders(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var today = DateTime.UtcNow.Date;
        var totalSent = 0;

        foreach (var daysAhead in ReminderDays)
        {
            var targetDate = today.AddDays(daysAhead);

            var dueVaccinations = await db.Vaccinations
                .AsNoTracking()
                .Include(v => v.Pet)
                .Where(v => v.NextDueDate.HasValue
                         && v.NextDueDate.Value.Date == targetDate)
                .ToListAsync(ct);

            foreach (var vaccination in dueVaccinations)
            {
                var petName = vaccination.Pet.Name;
                var vaccineName = vaccination.VaccineName.ToString();
                var userId = vaccination.Pet.UserId;

                var title = daysAhead == 1
                    ? $"Vaccine due tomorrow for {petName}"
                    : $"Vaccine due in {daysAhead} days for {petName}";

                var message = daysAhead == 1
                    ? $"{petName}'s {vaccineName} vaccine is due tomorrow ({targetDate:MMM dd, yyyy}). Please schedule an appointment."
                    : $"{petName}'s {vaccineName} vaccine is due in {daysAhead} days ({targetDate:MMM dd, yyyy}). Time to plan ahead!";

                await notifications.CreateAsync(
                    userId,
                    "vaccination_reminder",
                    title,
                    message,
                    vaccination.PetId);

                totalSent++;
            }
        }

        if (totalSent > 0)
            _logger.LogInformation("Sent {Count} vaccination reminder notification(s).", totalSent);
    }
}
