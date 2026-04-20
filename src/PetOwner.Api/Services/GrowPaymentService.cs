using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

/// <summary>
/// Production-oriented Grow integration: POST JSON to the configured Grow API URL and parse the checkout URL from the response.
/// Exact request/response shapes may be adjusted when integrating against the live Grow API contract.
/// </summary>
public class GrowPaymentService : IGrowPaymentService
{
    private readonly HttpClient _httpClient;
    private readonly GrowSettings _settings;
    private readonly ILogger<GrowPaymentService> _logger;

    public GrowPaymentService(
        HttpClient httpClient,
        IOptions<GrowSettings> settings,
        ILogger<GrowPaymentService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<string> GeneratePaymentLinkAsync(Booking booking)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiUrl))
            throw new InvalidOperationException("Grow:ApiUrl is not configured.");

        var payload = new GrowCreatePaymentRequest(
            Amount: booking.TotalPrice,
            Currency: string.IsNullOrWhiteSpace(_settings.Currency) ? "ILS" : _settings.Currency.Trim().ToUpperInvariant(),
            BookingId: booking.Id,
            Description: $"PetOwner booking {booking.Id}");

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        var json = JsonSerializer.Serialize(payload, jsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var request = new HttpRequestMessage(HttpMethod.Post, _settings.ApiUrl.Trim())
        {
            Content = content,
        };

        if (!string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey.Trim());
        }

        if (!string.IsNullOrWhiteSpace(_settings.PrivateKey))
        {
            var keyBytes = Encoding.UTF8.GetBytes(_settings.PrivateKey);
            var bodyBytes = Encoding.UTF8.GetBytes(json);
            using var hmac = new HMACSHA256(keyBytes);
            var hash = hmac.ComputeHash(bodyBytes);
            request.Headers.TryAddWithoutValidation("X-Grow-Request-Signature", Convert.ToHexString(hash).ToLowerInvariant());
        }

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Grow payment link request failed for booking {BookingId}", booking.Id);
            throw;
        }

        var responseBody = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Grow API returned {StatusCode} for booking {BookingId}: {Body}",
                (int)response.StatusCode,
                booking.Id,
                Truncate(responseBody, 500));
            throw new InvalidOperationException(
                $"Grow payment API error ({(int)response.StatusCode}).");
        }

        string? checkoutUrl = TryExtractCheckoutUrl(responseBody);
        if (string.IsNullOrWhiteSpace(checkoutUrl))
        {
            _logger.LogWarning(
                "Grow API success but no checkout URL in response for booking {BookingId}: {Body}",
                booking.Id,
                Truncate(responseBody, 500));
            throw new InvalidOperationException("Grow API response did not contain a checkout URL.");
        }

        _logger.LogInformation("Grow checkout URL created for booking {BookingId}", booking.Id);
        return checkoutUrl.Trim();
    }

    private static string? TryExtractCheckoutUrl(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            foreach (var name in new[]
                     {
                         "checkoutUrl", "paymentUrl", "url", "redirectUrl", "checkout_url", "payment_url",
                     })
            {
                if (root.TryGetProperty(name, out var el) && el.ValueKind == JsonValueKind.String)
                {
                    var s = el.GetString();
                    if (!string.IsNullOrWhiteSpace(s))
                        return s;
                }
            }

            if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
            {
                foreach (var name in new[] { "checkoutUrl", "url", "paymentUrl" })
                {
                    if (data.TryGetProperty(name, out var el) && el.ValueKind == JsonValueKind.String)
                    {
                        var s = el.GetString();
                        if (!string.IsNullOrWhiteSpace(s))
                            return s;
                    }
                }
            }
        }
        catch (JsonException)
        {
            // fall through
        }

        return null;
    }

    private static string Truncate(string s, int max)
    {
        if (string.IsNullOrEmpty(s) || s.Length <= max)
            return s;
        return s[..max] + "…";
    }

    private sealed record GrowCreatePaymentRequest(
        decimal Amount,
        string Currency,
        Guid BookingId,
        string Description);
}
