using System.Text.Json;

namespace PetOwner.Api.Services;

public class GeminiAiService : IGeminiAiService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<GeminiAiService> _logger;

    private const string GeminiEndpoint =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    private const string LanguageMirrorDirective =
        "CRITICAL INSTRUCTION: You must analyze the language of the user's input information. " +
        "Your entire response MUST be generated in the EXACT SAME LANGUAGE as the user's input. " +
        "For example, if the input is in Hebrew, you must reply entirely in Hebrew. " +
        "If the input is in English, you must reply entirely in English. " +
        "Do not mix languages unless absolutely necessary for specific terms.";

    public GeminiAiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiAiService> logger)
    {
        _httpClient = httpClient;
        _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;
        _logger = logger;
    }

    public async Task<TeletriageResult> AssessTeletriageAsync(string petDetails, string symptoms, string? imageBase64)
    {
        if (!IsApiKeyConfigured())
        {
            _logger.LogWarning("Gemini API key not configured — returning fallback teletriage assessment");
            return BuildFallbackAssessment(symptoms);
        }

        try
        {
            bool hasImage = !string.IsNullOrWhiteSpace(imageBase64);
            var systemPrompt = BuildTeletriageSystemPrompt(hasImage);
            var userText = $"{petDetails}\nSymptoms: {symptoms}";

            var parts = new List<object>
            {
                new { text = $"{systemPrompt}\n\n{userText}" }
            };

            if (hasImage)
            {
                var base64Data = StripDataUriPrefix(imageBase64!);
                parts.Add(new
                {
                    inlineData = new
                    {
                        mimeType = "image/jpeg",
                        data = base64Data
                    }
                });
            }

            var responseText = await CallGeminiApi(parts);
            return ParseTeletriageAssessment(responseText);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini teletriage call failed — returning fallback");
            return BuildFallbackAssessment(symptoms);
        }
    }

    public async Task<string> GenerateProfileBioAsync(string baseInfo)
    {
        if (!IsApiKeyConfigured())
        {
            _logger.LogWarning("Gemini API key not configured — returning fallback bio");
            return BuildFallbackBio(baseInfo);
        }

        try
        {
            var prompt =
                "You are an expert copywriter for a premium pet-care platform. " +
                "The user will give you rough notes about their experience with pets. " +
                "Write a warm, trustworthy, and professional 3-sentence bio. " +
                "Keep it engaging but under 100 words.\n\n" +
                $"{LanguageMirrorDirective}\n\n" +
                baseInfo;

            var parts = new List<object> { new { text = prompt } };
            return await CallGeminiApi(parts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini bio generation failed — returning fallback");
            return BuildFallbackBio(baseInfo);
        }
    }

    public async Task<string> GenerateTextAsync(string prompt)
    {
        if (!IsApiKeyConfigured())
        {
            _logger.LogWarning("Gemini API key not configured — returning empty response for generic text");
            return string.Empty;
        }

        var fullPrompt = $"{LanguageMirrorDirective}\n\n{prompt}";
        var parts = new List<object> { new { text = fullPrompt } };
        return await CallGeminiApi(parts);
    }

    private async Task<string> CallGeminiApi(List<object> parts)
    {
        var payload = new
        {
            contents = new[]
            {
                new { parts }
            }
        };

        var url = $"{GeminiEndpoint}?key={_apiKey}";
        var response = await _httpClient.PostAsJsonAsync(url, payload);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("Gemini API returned {StatusCode}: {Body}", response.StatusCode, errorBody);
            throw new HttpRequestException($"Gemini API error: {response.StatusCode}");
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? string.Empty;
    }

    private bool IsApiKeyConfigured() =>
        !string.IsNullOrWhiteSpace(_apiKey) && _apiKey != "YOUR_GEMINI_API_KEY";

    private static string StripDataUriPrefix(string base64)
    {
        var commaIndex = base64.IndexOf(',');
        return commaIndex >= 0 ? base64[(commaIndex + 1)..] : base64;
    }

    private static string BuildTeletriageSystemPrompt(bool hasImage) =>
        LanguageMirrorDirective + "\n\n" +
        """
        You are a veterinary teletriage assistant. Your role is to provide a preliminary health assessment for pets based on symptoms described by their owner. You are NOT a replacement for a veterinarian.

        Always respond in valid JSON with exactly these fields:
        {
          "severity": "Low" | "Medium" | "High" | "Critical",
          "assessment": "A clear 2-4 sentence explanation of what the symptoms might indicate.",
          "recommendations": "Bullet-point list of recommended actions (use \n for newlines).",
          "isEmergency": true | false
        }

        Rules:
        - If any symptom suggests a life-threatening condition (difficulty breathing, seizures, poisoning, severe bleeding, collapse), set isEmergency to true and severity to "Critical".
        - Be compassionate but factual.
        - Always recommend consulting a veterinarian for Medium, High, and Critical cases.
        - Never diagnose definitively — use phrases like "may indicate", "could suggest", "possible".
        """
        + (hasImage
            ? """

        An image of the pet's condition is attached. Carefully analyze any visible symptoms — wounds, swelling, discoloration, rashes, lumps, discharge, or abnormalities — and incorporate your visual findings into the assessment alongside the owner's description.
        """
            : "");

    private TeletriageResult ParseTeletriageAssessment(string content)
    {
        try
        {
            var cleaned = content.Trim();
            if (cleaned.StartsWith("```"))
            {
                cleaned = cleaned.Split('\n', 2).Length > 1 ? cleaned.Split('\n', 2)[1] : cleaned;
                if (cleaned.EndsWith("```"))
                    cleaned = cleaned[..^3];
                cleaned = cleaned.Trim();
            }

            var json = JsonSerializer.Deserialize<JsonElement>(cleaned);
            return new TeletriageResult(
                Severity: json.GetProperty("severity").GetString() ?? "Medium",
                Assessment: json.GetProperty("assessment").GetString() ?? "Unable to assess.",
                Recommendations: json.GetProperty("recommendations").GetString() ?? "Please consult a veterinarian.",
                IsEmergency: json.TryGetProperty("isEmergency", out var em) && em.GetBoolean()
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Gemini teletriage JSON — using raw content");
            return new TeletriageResult("Medium", content, "Please consult a veterinarian for a proper diagnosis.", false);
        }
    }

    private static TeletriageResult BuildFallbackAssessment(string symptoms)
    {
        var isUrgent = symptoms.Contains("breath", StringComparison.OrdinalIgnoreCase)
                       || symptoms.Contains("seizure", StringComparison.OrdinalIgnoreCase)
                       || symptoms.Contains("poison", StringComparison.OrdinalIgnoreCase)
                       || symptoms.Contains("bleed", StringComparison.OrdinalIgnoreCase)
                       || symptoms.Contains("collapse", StringComparison.OrdinalIgnoreCase)
                       || symptoms.Contains("unconscious", StringComparison.OrdinalIgnoreCase);

        if (isUrgent)
        {
            return new TeletriageResult(
                "Critical",
                "The symptoms you described may indicate a serious or life-threatening condition. Immediate veterinary attention is strongly recommended.",
                "- Seek emergency veterinary care immediately\n- Keep your pet calm and warm\n- Do not attempt home treatment for these symptoms\n- Call your nearest emergency vet clinic",
                true);
        }

        return new TeletriageResult(
            "Medium",
            "Based on the symptoms described, your pet may benefit from a professional veterinary evaluation. While not necessarily an emergency, these symptoms should be monitored closely.",
            "- Schedule a veterinary appointment within 24-48 hours\n- Monitor your pet's symptoms for any changes\n- Ensure your pet has access to fresh water\n- Keep a log of when symptoms occur and their duration",
            false);
    }

    private static string BuildFallbackBio(string userNotes) =>
        $"I'm a passionate and reliable pet care professional. " +
        $"{userNotes}. " +
        $"I treat every pet like my own and always go the extra mile " +
        $"to ensure their safety and happiness.";
}
