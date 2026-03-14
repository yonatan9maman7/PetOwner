namespace PetOwner.Api.Services;

public record TeletriageResult(
    string Severity,
    string Assessment,
    string Recommendations,
    bool IsEmergency
);

public interface ITeletriageService
{
    Task<TeletriageResult> AssessAsync(string petName, string species, int age, string symptoms, string? medicalHistory, string? imageBase64 = null);
}
