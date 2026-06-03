using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

/// <summary>
/// Grow (Meshulam) Light-Server integration — Auth-and-Capture flow.
///
/// Payment page creation (createPaymentProcess):
///   chargeType 1 = immediate charge (J4).
///   chargeType 2 = authorization only (J5 / hold); capture later.
///
/// Capture (commitTransaction):
///   POST {base}/commitTransaction  { userId, apiKey, transactionCode, sum }
///
/// Void (cancelTransaction):
///   POST {base}/cancelTransaction  { userId, apiKey, transactionCode }
///
/// Docs: https://grow-il.readme.io/reference
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

    // ─── Create authorization/charge page ────────────────────────────────────

    public async Task<string> GeneratePaymentLinkAsync(Booking booking)
    {
        if (!IsGrowConfigured())
        {
            _logger.LogWarning("Grow payment configuration is missing. Using mock payment link generator.");
            var mockUrl = $"https://mock.payment.sandbox/pay?bookingId={booking.Id}";
            _logger.LogInformation("Mock Grow payment URL for booking {BookingId}", booking.Id);
            return mockUrl;
        }

        LogCallbackUrlWarningIfNeeded();

        var owner = booking.Owner ?? await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == booking.OwnerId)
            ?? throw new InvalidOperationException($"Owner {booking.OwnerId} not found for booking {booking.Id}.");

        var payload = new Dictionary<string, object?>
        {
            ["pageCode"]           = _settings.PageCode,
            ["userId"]             = _settings.UserId,
            ["apiKey"]             = _settings.ApiKey,
            ["chargeType"]         = _settings.ChargeType,
            ["sum"]                = booking.TotalPrice.ToString("0.00", CultureInfo.InvariantCulture),
            ["description"]        = SanitizeDescription($"{_settings.DescriptionPrefix} {booking.Service}"),
            ["successUrl"]         = _settings.SuccessUrl,
            ["cancelUrl"]          = _settings.CancelUrl,
            ["pageField[fullName]"] = BuildFullName(owner.Name),
            ["pageField[phone]"]   = owner.Phone ?? string.Empty,
            ["cField1"]            = booking.Id.ToString(),
            ["cField2"]            = booking.ProviderProfileId.ToString(),
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
                "Grow API rejected createPaymentProcess for booking {BookingId}: status={Status} err={Err}",
                booking.Id, parsed.Status, parsed.Err);
            throw new InvalidOperationException(
                $"Grow rejected payment creation (status={parsed.Status}, err={parsed.Err ?? "n/a"}).");
        }

        var chargeLabel = _settings.ChargeType == 2 ? "authorization (J5)" : "immediate charge";
        _logger.LogInformation(
            "Grow checkout URL created ({ChargeType}) for booking {BookingId} (sum={Sum})",
            chargeLabel, booking.Id, booking.TotalPrice);

        return parsed.Url!;
    }

    // ─── Capture ─────────────────────────────────────────────────────────────

    public async Task<bool> CapturePaymentAsync(string transactionId, decimal amount)
    {
        if (!IsGrowConfigured())
        {
            _logger.LogWarning(
                "Grow not configured — mock capture approved for transaction {TransactionId}", transactionId);
            return true;
        }

        var endpoint = BuildEndpoint("commitTransaction");
        var payload = new Dictionary<string, object?>
        {
            ["userId"]          = _settings.UserId,
            ["apiKey"]          = _settings.ApiKey,
            ["transactionCode"] = transactionId,
            ["sum"]             = amount.ToString("0.00", CultureInfo.InvariantCulture),
        };

        return await PostTransactionActionAsync(endpoint, payload, "capture", transactionId);
    }

    // ─── Void ─────────────────────────────────────────────────────────────────

    public async Task<bool> VoidPaymentAsync(string transactionId)
    {
        if (!IsGrowConfigured())
        {
            _logger.LogWarning(
                "Grow not configured — mock void approved for transaction {TransactionId}", transactionId);
            return true;
        }

        var endpoint = BuildEndpoint("cancelTransaction");
        var payload = new Dictionary<string, object?>
        {
            ["userId"]          = _settings.UserId,
            ["apiKey"]          = _settings.ApiKey,
            ["transactionCode"] = transactionId,
        };

        return await PostTransactionActionAsync(endpoint, payload, "void", transactionId);
    }

    // ─── Shared helpers ───────────────────────────────────────────────────────

    private async Task<bool> PostTransactionActionAsync(
        string endpoint,
        Dictionary<string, object?> payload,
        string actionName,
        string transactionId)
    {
        var json = JsonSerializer.Serialize(payload);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsync(endpoint, content).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Grow {Action} HTTP call failed for transaction {TransactionId}", actionName, transactionId);
            return false;
        }

        var body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Grow {Action} returned HTTP {StatusCode} for transaction {TransactionId}: {Body}",
                actionName, (int)response.StatusCode, transactionId, Truncate(body, 500));
            return false;
        }

        var parsed = ParseResponse(body);
        if (parsed.Status != 1)
        {
            _logger.LogWarning(
                "Grow {Action} rejected for transaction {TransactionId}: status={Status} err={Err}",
                actionName, transactionId, parsed.Status, parsed.Err);
            return false;
        }

        _logger.LogInformation(
            "Grow {Action} succeeded for transaction {TransactionId}", actionName, transactionId);
        return true;
    }

    /// <summary>
    /// Derives a sibling endpoint URL from <c>Grow:ApiUrl</c> by replacing the last path segment.
    /// e.g. "…/createPaymentProcess" → "…/commitTransaction".
    /// </summary>
    private string BuildEndpoint(string action)
    {
        try
        {
            var uri = new Uri(_settings.ApiUrl.Trim());
            var segments = uri.Segments;
            var basePath = string.Concat(segments.Take(segments.Length - 1));
            return $"{uri.Scheme}://{uri.Host}{basePath}{action}";
        }
        catch
        {
            // Fallback: replace the last path component by string manipulation.
            var lastSlash = _settings.ApiUrl.LastIndexOf('/');
            return lastSlash >= 0
                ? _settings.ApiUrl[..(lastSlash + 1)] + action
                : _settings.ApiUrl + "/" + action;
        }
    }

    private bool IsGrowConfigured() =>
        !string.IsNullOrWhiteSpace(_settings.ApiUrl)
        && !string.IsNullOrWhiteSpace(_settings.PageCode)
        && !string.IsNullOrWhiteSpace(_settings.UserId)
        && !string.IsNullOrWhiteSpace(_settings.ApiKey);

    private void LogCallbackUrlWarningIfNeeded()
    {
        if (string.IsNullOrWhiteSpace(_settings.CallbackUrl))
            _logger.LogWarning(
                "Grow:CallbackUrl is empty — notifyUrl will not be sent; payment status relies on client polling only.");
    }

    private string BuildFullName(string? raw)
    {
        var name = (raw ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name)) name = "PetOwner User";
        return name.Contains(' ') ? name : $"{name} {_settings.FullNameFallbackSurname}";
    }

    private static string SanitizeDescription(string value)
    {
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
                ? s.GetInt32() : 0;

            var err = root.TryGetProperty("err", out var e) && e.ValueKind == JsonValueKind.String
                ? e.GetString() : null;

            string? url = null;
            if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
                if (data.TryGetProperty("url", out var u) && u.ValueKind == JsonValueKind.String)
                    url = u.GetString();

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
