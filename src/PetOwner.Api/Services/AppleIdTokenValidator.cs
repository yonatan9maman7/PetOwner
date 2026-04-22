using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace PetOwner.Api.Services;

public class AppleIdTokenValidator : IAppleIdTokenValidator
{
    private readonly IReadOnlyList<string> _validAudiences;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configManager;
    private readonly ILogger<AppleIdTokenValidator> _logger;

    private const string AppleIssuer = "https://appleid.apple.com";
    private const string AppleOidcEndpoint = "https://appleid.apple.com/.well-known/openid-configuration";

    public AppleIdTokenValidator(IConfiguration config, ILogger<AppleIdTokenValidator> logger)
    {
        _validAudiences = config
            .GetSection("Authentication:Apple:ClientIds")
            .Get<List<string>>() ?? [];
        _logger = logger;

        _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            AppleOidcEndpoint,
            new OpenIdConnectConfigurationRetriever(),
            new HttpDocumentRetriever());
    }

    public async Task<AppleTokenClaims?> ValidateAsync(string idToken, string? rawNonce = null)
    {
        try
        {
            var oidcConfig = await _configManager.GetConfigurationAsync(CancellationToken.None);

            var validationParameters = new TokenValidationParameters
            {
                ValidIssuer = AppleIssuer,
                ValidAudiences = _validAudiences,
                IssuerSigningKeys = oidcConfig.SigningKeys,
                ValidateLifetime = true,
            };

            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(idToken, validationParameters, out _);

            // Verify nonce if provided
            if (!string.IsNullOrEmpty(rawNonce))
            {
                var nonceClaim = principal.FindFirst("nonce")?.Value;
                if (string.IsNullOrEmpty(nonceClaim))
                {
                    _logger.LogWarning("Apple token missing nonce claim but rawNonce was provided");
                    return null;
                }

                var expectedNonce = Convert.ToHexString(
                    SHA256.HashData(Encoding.UTF8.GetBytes(rawNonce))).ToLowerInvariant();

                if (!string.Equals(nonceClaim, expectedNonce, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Apple token nonce mismatch");
                    return null;
                }
            }

            var sub = principal.FindFirst("sub")?.Value;
            var email = principal.FindFirst("email")?.Value;

            if (string.IsNullOrEmpty(sub))
                return null;

            return new AppleTokenClaims(sub, email);
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning("Apple token validation failed: {Message}", ex.Message);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during Apple token validation");
            return null;
        }
    }
}
