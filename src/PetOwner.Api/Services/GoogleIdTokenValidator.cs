using Google.Apis.Auth;

namespace PetOwner.Api.Services;

public class GoogleIdTokenValidator : IGoogleIdTokenValidator
{
    private readonly IReadOnlyList<string> _validClientIds;
    private readonly ILogger<GoogleIdTokenValidator> _logger;

    public GoogleIdTokenValidator(IConfiguration config, ILogger<GoogleIdTokenValidator> logger)
    {
        _validClientIds = config
            .GetSection("Authentication:Google:ClientIds")
            .Get<List<string>>() ?? [];
        _logger = logger;
    }

    public async Task<GoogleTokenClaims?> ValidateAsync(string idToken)
    {
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = _validClientIds
            };

            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            return new GoogleTokenClaims(payload.Subject, payload.Email, payload.Name);
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning("Google token validation failed: {Message}", ex.Message);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during Google token validation");
            return null;
        }
    }
}
