using Microsoft.EntityFrameworkCore;
using PetOwner.Data;

namespace PetOwner.Api.Services;

public class BookingExpirationService : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(1);
    private static readonly TimeSpan PendingExpiry = TimeSpan.FromHours(48);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BookingExpirationService> _logger;

    public BookingExpirationService(IServiceScopeFactory scopeFactory, ILogger<BookingExpirationService> logger)
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
                await ExpireStaleRequests(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error expiring stale booking requests.");
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task ExpireStaleRequests(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var cutoff = DateTime.UtcNow - PendingExpiry;

        var staleRequests = await db.ServiceRequests
            .Where(sr => sr.Status == "Pending" && sr.CreatedAt < cutoff)
            .ToListAsync(ct);

        if (staleRequests.Count == 0) return;

        foreach (var request in staleRequests)
        {
            request.Status = "Cancelled";
            request.CancellationReason = "Auto-expired: no response within 48 hours.";
        }

        await db.SaveChangesAsync(ct);
        _logger.LogInformation("Auto-expired {Count} stale pending requests.", staleRequests.Count);
    }
}
