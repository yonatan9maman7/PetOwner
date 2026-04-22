namespace PetOwner.Api.Services;

public interface IAppleIdTokenValidator
{
    /// <summary>Validates the identityToken from Sign-in-with-Apple.</summary>
    /// <returns>Parsed claims (sub, email) or null if invalid.</returns>
    Task<AppleTokenClaims?> ValidateAsync(string idToken, string? rawNonce = null);
}

public record AppleTokenClaims(string Subject, string? Email);
