using System.Globalization;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Api.Infrastructure;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public UsersController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Register (upsert) an Expo push token for the current user's device.
    /// Upserts by token value so rotating tokens don't create duplicates.
    /// </summary>
    [HttpPost("push-token")]
    public async Task<IActionResult> RegisterPushToken([FromBody] RegisterPushTokenDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Token))
            return BadRequest(new { message = "Token is required." });

        var userId = GetUserId();
        var now = DateTime.UtcNow;

        var existing = await _db.UserPushTokens
            .FirstOrDefaultAsync(t => t.Token == dto.Token);

        if (existing is null)
        {
            _db.UserPushTokens.Add(new UserPushToken
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Token = dto.Token,
                Platform = dto.Platform?.ToLowerInvariant() ?? "unknown",
                CreatedAt = now,
                LastUsedAt = now,
            });
        }
        else
        {
            existing.UserId = userId;
            existing.LastUsedAt = now;
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Push token registered." });
    }

    /// <summary>
    /// Remove a push token on logout or when the user disables push notifications.
    /// </summary>
    [HttpDelete("push-token")]
    public async Task<IActionResult> RemovePushToken([FromBody] RemovePushTokenDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Token))
            return BadRequest(new { message = "Token is required." });

        var userId = GetUserId();
        var token = await _db.UserPushTokens
            .FirstOrDefaultAsync(t => t.Token == dto.Token && t.UserId == userId);

        if (token is null) return NoContent();

        _db.UserPushTokens.Remove(token);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Get the user's per-category notification preferences.
    /// Creates a default record on first access.
    /// </summary>
    [HttpGet("notification-prefs")]
    public async Task<IActionResult> GetNotificationPrefs()
    {
        var userId = GetUserId();
        var prefs = await GetOrCreatePrefsAsync(userId);
        return Ok(MapToDto(prefs));
    }

    /// <summary>
    /// Persist updated notification preferences.
    /// </summary>
    [HttpPut("notification-prefs")]
    public async Task<IActionResult> UpdateNotificationPrefs([FromBody] NotificationPrefsDto dto)
    {
        var userId = GetUserId();
        var prefs = await GetOrCreatePrefsAsync(userId);

        prefs.PushEnabled = dto.Push;
        prefs.Messages = dto.Messages;
        prefs.Bookings = dto.Bookings;
        prefs.Community = dto.Community;
        prefs.Triage = dto.Triage;
        prefs.Marketing = dto.Marketing;
        prefs.Achievements = dto.Achievements;
        prefs.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(MapToDto(prefs));
    }

    // ── My Stats (Owner) ───────────────────────────────────────────────────────

    /// <summary>
    /// Owner-side stats dashboard. All money fields use bookings where PaymentStatus = Paid
    /// (matches what the user sees on "My Bookings").
    /// </summary>
    [HttpGet("me/stats")]
    public async Task<IActionResult> GetMyStats([FromQuery] string? range)
    {
        var userId = GetUserId();
        var rangeKey = StatRangeHelper.Normalize(range);
        var (start, _) = StatRangeHelper.Resolve(rangeKey);

        var user = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.CreatedAt })
            .FirstOrDefaultAsync();

        if (user is null) return NotFound();

        var baseQuery = _db.Bookings
            .AsNoTracking()
            .Where(b => b.OwnerId == userId);

        if (start.HasValue)
            baseQuery = baseQuery.Where(b => b.CreatedAt >= start.Value);

        var bookings = await baseQuery
            .Select(b => new
            {
                b.Id,
                b.Status,
                b.PaymentStatus,
                b.TotalPrice,
                b.Service,
                b.CancelledByRole,
            })
            .ToListAsync();

        var paid = bookings.Where(b => b.PaymentStatus == PaymentStatus.Paid).ToList();
        var totalSpent = paid.Sum(b => b.TotalPrice);
        var paidCount = paid.Count;
        var totalCount = bookings.Count;

        var cancelledByMe = bookings.Count(b =>
            b.Status == BookingStatus.Cancelled &&
            b.CancelledByRole == BookingActorRole.Owner);
        var cancellationRate = totalCount == 0
            ? 0m
            : Math.Round((decimal)cancelledByMe * 100 / totalCount, 1);

        var upcomingSpend = bookings
            .Where(b => b.Status == BookingStatus.Confirmed && b.PaymentStatus != PaymentStatus.Paid)
            .Sum(b => b.TotalPrice);

        var topService = paid
            .GroupBy(b => b.Service)
            .Select(g => new TopServiceDto(g.Key.ToString(), g.Count(), g.Sum(b => b.TotalPrice)))
            .OrderByDescending(s => s.TotalAmount)
            .FirstOrDefault();

        var favoritesCount = await _db.FavoriteProviders
            .AsNoTracking()
            .CountAsync(f => f.UserId == userId);

        var reviews = await _db.Reviews
            .AsNoTracking()
            .Where(r => r.ReviewerId == userId)
            .Select(r => r.Rating)
            .ToListAsync();

        var reviewsWritten = reviews.Count;
        var avgRatingGiven = reviewsWritten == 0
            ? 0m
            : Math.Round((decimal)reviews.Average(), 2);

        var achievements = await _db.AchievementsUnlocked
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.Scope == "owner")
            .OrderByDescending(a => a.UnlockedAt)
            .Select(a => new AchievementDto(a.Code, a.Scope, a.UnlockedAt))
            .ToListAsync();

        return Ok(new OwnerStatsDto(
            Range: rangeKey,
            TotalSpent: totalSpent,
            PaidBookings: paidCount,
            TotalBookings: totalCount,
            FavoriteProvidersCount: favoritesCount,
            ReviewsWritten: reviewsWritten,
            AverageRatingGiven: avgRatingGiven,
            CancellationRate: cancellationRate,
            UpcomingSpend: upcomingSpend,
            MemberSince: user.CreatedAt,
            TopService: topService,
            Achievements: achievements));
    }

    /// <summary>
    /// Owner-side CSV export of paid bookings (for tax/reimbursement bookkeeping).
    /// </summary>
    [HttpGet("me/stats/export.csv")]
    public async Task<IActionResult> ExportMyStatsCsv()
    {
        var userId = GetUserId();
        var rows = await LoadOwnerSpendingExportRowsAsync(userId);

        var sb = new StringBuilder();
        sb.AppendLine("BookingId,CreatedAt,StartDate,EndDate,Service,ProviderName,TotalPriceILS,Status");
        foreach (var r in rows)
        {
            sb.Append(r.BookingId).Append(',')
              .Append(r.CreatedAt.ToString("o", CultureInfo.InvariantCulture)).Append(',')
              .Append(r.StartDate.ToString("o", CultureInfo.InvariantCulture)).Append(',')
              .Append(r.EndDate.ToString("o", CultureInfo.InvariantCulture)).Append(',')
              .Append(CsvEscape(r.Service)).Append(',')
              .Append(CsvEscape(r.ProviderName)).Append(',')
              .Append(r.TotalPriceIls.ToString(CultureInfo.InvariantCulture)).Append(',')
              .AppendLine(r.Status);
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"my-spending-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    /// <summary>
    /// Owner-side Excel export of paid bookings (same data as CSV; preferred for spreadsheets).
    /// </summary>
    [HttpGet("me/stats/export.xlsx")]
    public async Task<IActionResult> ExportMyStatsXlsx()
    {
        var userId = GetUserId();
        var rows = await LoadOwnerSpendingExportRowsAsync(userId);
        var bytes = StatsExportXlsx.BuildOwnerSpendingWorkbook(rows);
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"my-spending-{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private async Task<List<StatsExportXlsx.OwnerSpendingExportRow>> LoadOwnerSpendingExportRowsAsync(Guid userId) =>
        await _db.Bookings
            .AsNoTracking()
            .Where(b => b.OwnerId == userId && b.PaymentStatus == PaymentStatus.Paid)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new StatsExportXlsx.OwnerSpendingExportRow(
                b.Id,
                b.CreatedAt,
                b.StartDate,
                b.EndDate,
                b.Service.ToString(),
                b.ProviderProfile.User.Name,
                b.TotalPrice,
                b.Status.ToString()))
            .ToListAsync();

    private async Task<UserNotificationPrefs> GetOrCreatePrefsAsync(Guid userId)
    {
        var prefs = await _db.UserNotificationPrefs
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (prefs is null)
        {
            prefs = new UserNotificationPrefs
            {
                UserId = userId,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.UserNotificationPrefs.Add(prefs);
            await _db.SaveChangesAsync();
        }

        return prefs;
    }

    private static object MapToDto(UserNotificationPrefs p) => new
    {
        push = p.PushEnabled,
        messages = p.Messages,
        bookings = p.Bookings,
        community = p.Community,
        triage = p.Triage,
        marketing = p.Marketing,
        achievements = p.Achievements,
    };

    /// <summary>
    /// Quote a CSV cell only when it contains characters that would break parsing
    /// (comma, quote, newline). Doubles inner quotes per RFC 4180.
    /// </summary>
    internal static string CsvEscape(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        var needsQuote = value.IndexOfAny(new[] { ',', '"', '\n', '\r' }) >= 0;
        var escaped = value.Replace("\"", "\"\"");
        return needsQuote ? $"\"{escaped}\"" : escaped;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
