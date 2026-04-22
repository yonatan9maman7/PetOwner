namespace PetOwner.Api.Services;

/// <summary>
/// Configuration for the Grow (Meshulam) Light-Server API.
/// Dashboard values: <c>pageCode</c>, <c>userId</c>, <c>apiKey</c>, and the webhook private key.
/// See https://grow-il.readme.io/reference/post_api-light-server-1-0-createpaymentprocess
/// and https://grow-il.readme.io/reference/server-response
/// </summary>
public class GrowSettings
{
    public const string SectionName = "Grow";

    /// <summary>
    /// Full URL of the createPaymentProcess endpoint.
    /// Sandbox: https://sandbox.meshulam.co.il/api/light/server/1.0/createPaymentProcess
    /// Production: https://secure.meshulam.co.il/api/light/server/1.0/createPaymentProcess
    /// </summary>
    public string ApiUrl { get; set; } = string.Empty;

    /// <summary>Grow "pageCode" — identifies the merchant's payment page. Required.</summary>
    public string PageCode { get; set; } = string.Empty;

    /// <summary>Grow "userId" — identifies the merchant business. Required.</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Grow API key (from dashboard). Sent in the request body as "apiKey".
    /// Grow validates this on every createPaymentProcess call.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Shared "Webhook Private Key" from the Grow dashboard.
    /// Grow includes this value in the callback payload as the field "webhookKey"; we
    /// validate it with fixed-time equality on every incoming webhook.
    /// </summary>
    public string WebhookKey { get; set; } = string.Empty;

    /// <summary>
    /// HTTPS URL the browser is redirected to after a successful payment.
    /// Must match the mobile WebView SUCCESS_PREFIX so the app can intercept it.
    /// </summary>
    public string SuccessUrl { get; set; } = "https://petowner.app/payment/success";

    /// <summary>
    /// HTTPS URL the browser is redirected to if the user cancels.
    /// Must match the mobile WebView CANCEL_PREFIX.
    /// </summary>
    public string CancelUrl { get; set; } = "https://petowner.app/payment/cancel";

    /// <summary>
    /// Public HTTPS URL of our Grow webhook: https://&lt;host&gt;/api/webhooks/grow
    /// Sent as "notifyUrl" so Grow performs the server-to-server callback.
    /// </summary>
    public string CallbackUrl { get; set; } = string.Empty;

    /// <summary>Optional: override the "description" prefix shown on Grow's invoice/transaction details.</summary>
    public string DescriptionPrefix { get; set; } = "PetOwner booking";

    /// <summary>
    /// Fallback used for pageField[fullName] when the owner's stored name is a single word
    /// (Grow requires the full name to consist of at least two names).
    /// </summary>
    public string FullNameFallbackSurname { get; set; } = "PetOwner";
}
