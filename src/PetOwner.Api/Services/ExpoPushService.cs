using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using PetOwner.Data;

namespace PetOwner.Api.Services;

/// <summary>
/// Sends push notifications via the Expo Push Notification service.
/// Registered as a typed HttpClient in Program.cs.
/// </summary>
public class ExpoPushService : IExpoPushService
{
    private const string PushEndpoint = "/--/api/v2/push/send";
    private const int BatchSize = 100;

    private readonly HttpClient _http;
    private readonly ApplicationDbContext _db;
    private readonly ILogger<ExpoPushService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public ExpoPushService(
        HttpClient http,
        ApplicationDbContext db,
        ILogger<ExpoPushService> logger)
    {
        _http = http;
        _db = db;
        _logger = logger;
    }

    public async Task SendAsync(
        IEnumerable<string> tokens,
        string title,
        string body,
        object? data = null)
    {
        var tokenList = tokens.Distinct().ToList();
        if (tokenList.Count == 0) return;

        // Expo requires batches of ≤100 messages per request.
        var batches = tokenList
            .Chunk(BatchSize)
            .Select(chunk => chunk
                .Select(t => new ExpoMessage(t, title, body, data))
                .ToList())
            .ToList();

        foreach (var batch in batches)
        {
            try
            {
                var response = await _http.PostAsJsonAsync(PushEndpoint, batch, JsonOptions);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Expo Push: batch of {Count} returned HTTP {Status}",
                        batch.Count,
                        response.StatusCode);
                    continue;
                }

                var result = await response.Content
                    .ReadFromJsonAsync<ExpoPushResponse>(JsonOptions);

                if (result?.Data is null) continue;

                // Collect tokens whose device is no longer registered and prune them.
                var deadTokens = batch
                    .Zip(result.Data, (msg, receipt) => (msg.To, receipt))
                    .Where(x =>
                        x.receipt.Status == "error" &&
                        x.receipt.Details?.Error == "DeviceNotRegistered")
                    .Select(x => x.To)
                    .ToList();

                if (deadTokens.Count > 0)
                    _ = PruneDeadTokensAsync(deadTokens);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Expo Push: failed to send batch of {Count}", batch.Count);
            }
        }
    }

    private async Task PruneDeadTokensAsync(IReadOnlyCollection<string> deadTokens)
    {
        try
        {
            var toRemove = await _db.UserPushTokens
                .Where(t => deadTokens.Contains(t.Token))
                .ToListAsync();

            if (toRemove.Count > 0)
            {
                _db.UserPushTokens.RemoveRange(toRemove);
                await _db.SaveChangesAsync();
                _logger.LogInformation(
                    "Expo Push: pruned {Count} DeviceNotRegistered token(s)",
                    toRemove.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Expo Push: failed to prune dead tokens");
        }
    }

    // ── Internal DTO shapes ───────────────────────────────────────────────────

    private record ExpoMessage(
        [property: JsonPropertyName("to")] string To,
        [property: JsonPropertyName("title")] string Title,
        [property: JsonPropertyName("body")] string Body,
        [property: JsonPropertyName("data")] object? Data);

    private record ExpoPushResponse(
        [property: JsonPropertyName("data")] List<ExpoPushReceipt>? Data);

    private record ExpoPushReceipt(
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("message")] string? Message,
        [property: JsonPropertyName("details")] ExpoPushReceiptDetails? Details);

    private record ExpoPushReceiptDetails(
        [property: JsonPropertyName("error")] string? Error);
}
