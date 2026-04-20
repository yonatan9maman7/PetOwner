namespace PetOwner.Api.Services;

public class GrowSettings
{
    public const string SectionName = "Grow";

    /// <summary>Full URL for the Grow API endpoint that creates a checkout session (POST).</summary>
    public string ApiUrl { get; set; } = string.Empty;

    /// <summary>API key sent as Authorization: Bearer (or overridden via ApiKeyHeader).</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Optional HMAC key used to sign the JSON body (X-Grow-Request-Signature).</summary>
    public string PrivateKey { get; set; } = string.Empty;

    /// <summary>Shared secret validated on incoming webhooks (X-Grow-Signature or Authorization Bearer).</summary>
    public string WebhookSecret { get; set; } = string.Empty;

    /// <summary>ISO 4217 currency code for payment creation.</summary>
    public string Currency { get; set; } = "ILS";
}
