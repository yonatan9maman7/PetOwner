namespace PetOwner.Api.Services;

public class StripeSettings
{
    public const string SectionName = "Stripe";

    public string SecretKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public int PlatformFeePercent { get; set; } = 15;
}
