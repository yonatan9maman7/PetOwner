namespace PetOwner.Api.Services;

public record TeletriageResult(
    string Severity,
    string Assessment,
    string Recommendations,
    bool IsEmergency
);

public interface IGeminiAiService
{
    Task<TeletriageResult> AssessTeletriageAsync(string petDetails, string symptoms, string? imageBase64);

    Task<string> GenerateProfileBioAsync(string baseInfo);

    Task<string> GenerateTextAsync(string prompt);
}
