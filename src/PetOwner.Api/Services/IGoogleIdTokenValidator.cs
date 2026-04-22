namespace PetOwner.Api.Services;

public interface IGoogleIdTokenValidator
{
    /// <summary>Validates the id_token from Google Sign-In.</summary>
    /// <returns>Parsed claims (sub, email, name) or null if invalid.</returns>
    Task<GoogleTokenClaims?> ValidateAsync(string idToken);
}

public record GoogleTokenClaims(string Subject, string Email, string? Name);
