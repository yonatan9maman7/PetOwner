using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

/// <summary>
/// Grow (Meshulam) Light-Server integration.
///
/// Creates a payment page via POST createPaymentProcess and returns the hosted checkout URL.
/// Docs: https://grow-il.readme.io/reference/post_api-light-server-1-0-createpaymentprocess
///
/// Request fields used (JSON body):
///   pageCode, userId, apiKey, sum, description,
///   successUrl, cancelUrl, notifyUrl,
///   pageField[fullName], pageField[phone], pageField[email],
///   cField1 = BookingId  (returned verbatim in the server-to-server callback)
///
/// Response shape (on success):
///   { "status": 1, "err": "", "data": { "url": "https://..." } }
/// </summary>
public class GrowPaymentService : IGrowPaymentService
{
    private readonly HttpClient _httpClient;
    private readonly GrowSettings _settings;
    private readonly ApplicationDbContext _db;
    private readonly ILogger<GrowPaymentService> _logger;

    public GrowPaymentService(
        HttpClient httpClient,
        IOptions<GrowSettings> settings,
        ApplicationDbContext db,
        ILogger<GrowPaymentService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _db = db;
        _logger = logger;
    }

    public async Task<string> GeneratePaymentLinkAsync(Booking booking)
    {
        ValidateSettings();

        var owner = booking.Owner ?? await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == booking.OwnerId)
            ?? throw new InvalidOperationException($"Owner {booking.OwnerId} not found for booking {booking.Id}.");

        var payload = new Dictionary<string, object?>
        {
            ["pageCode"] = _settings.PageCode,
            ["userId"] = _settings.UserId,
            ["apiKey"] = _settings.ApiKey,
            ["chargeType"] = 1,
            ["sum"] = booking.TotalPrice.ToString("0.00", CultureInfo.InvariantCulture),
            ["description"] = SanitizeDescription($"{_settings.DescriptionPrefix} {booking.Service}"),
            ["successUrl"] = _settings.SuccessUrl,
            ["cancelUrl"] = _settings.CancelUrl,
            ["pageField[fullName]"] = BuildFullName(owner.Name),
            ["pageField[phone]"] = owner.Phone ?? string.Empty,
            ["cField1"] = booking.Id.ToString(),
            ["cField2"] = booking.ProviderProfileId.ToString(),
        };

        if (!string.IsNullOrWhiteSpace(owner.Email))
            payload["pageField[email]"] = owner.Email;

        if (!string.IsNullOrWhiteSpace(_settings.CallbackUrl))
            payload["notifyUrl"] = _settings.CallbackUrl;

        var json = JsonSerializer.Serialize(payload);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsync(_settings.ApiUrl.Trim(), content).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Grow createPaymentProcess request failed for booking {BookingId}", booking.Id);
            throw;
        }

        var body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Grow API returned HTTP {StatusCode} for booking {BookingId}: {Body}",
                (int)response.StatusCode, booking.Id, Truncate(body, 500));
            throw new InvalidOperationException($"Grow API error (HTTP {(int)response.StatusCode}).");
        }

        var parsed = ParseResponse(body);
        if (parsed.Status != 1 || string.IsNullOrWhiteSpace(parsed.Url))
        {
            _logger.LogWarning(
                "Grow API rejected createPaymentProcess for booking {BookingId}: status={Status} err={Err} body={Body}",
                booking.Id, parsed.Status, parsed.Err, Truncate(body, 500));
            throw new InvalidOperationException(
                $"Grow rejected payment creation (status={parsed.Status}, err={parsed.Err ?? "n/a"}).");
        }

        _logger.LogInformation(
            "Grow checkout URL created for booking {BookingId} (sum={Sum})", booking.Id, booking.TotalPrice);
        return parsed.Url!;
    }

    private void ValidateSettings()
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiUrl))
            throw new InvalidOperationException("Grow:ApiUrl is not configured.");
        if (string.IsNullOrWhiteSpace(_settings.PageCode))
            throw new InvalidOperationException("Grow:PageCode is not configured.");
        if (string.IsNullOrWhiteSpace(_settings.UserId))
            throw new InvalidOperationException("Grow:UserId is not configured.");
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            throw new InvalidOperationException("Grow:ApiKey is not configured.");
    }

    private string BuildFullName(string? raw)
    {
        var name = (raw ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name))
            name = "PetOwner User";
        // Grow requires the full name to contain at least two name parts.
        return name.Contains(' ') ? name : $"{name} {_settings.FullNameFallbackSurname}";
    }

    private static string SanitizeDescription(string value)
    {
        // Grow forbids special characters in description/successUrl/cField*.
        var sb = new StringBuilder(value.Length);
        foreach (var ch in value)
        {
            if (char.IsLetterOrDigit(ch) || ch == ' ' || ch == '-' || ch == '_' || ch == '.')
                sb.Append(ch);
        }
        var cleaned = sb.ToString().Trim();
        return string.IsNullOrEmpty(cleaned) ? "PetOwner booking" : cleaned;
    }

    private static (int Status, string? Err, string? Url) ParseResponse(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var status = root.TryGetProperty("status", out var s) && s.ValueKind == JsonValueKind.Number
                ? s.GetInt32()
                : 0;

            var err = root.TryGetProperty("err", out var e) && e.ValueKind == JsonValueKind.String
                ? e.GetString()
                : null;

            string? url = null;
            if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
            {
                if (data.TryGetProperty("url", out var u) && u.ValueKind == JsonValueKind.String)
                    url = u.GetString();
            }

            return (status, err, url);
        }
        catch (JsonException)
        {
            return (0, "Invalid JSON response from Grow.", null);
        }
    }

    private static string Truncate(string s, int max) =>
        string.IsNullOrEmpty(s) || s.Length <= max ? s : s[..max] + "…";
}
