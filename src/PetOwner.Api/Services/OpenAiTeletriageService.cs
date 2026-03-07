using System.ClientModel;
using System.Text.Json;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;

namespace PetOwner.Api.Services;

public class OpenAiTeletriageService : ITeletriageService
{
    private readonly OpenAiSettings _settings;
    private readonly ILogger<OpenAiTeletriageService> _logger;

    public OpenAiTeletriageService(IOptions<OpenAiSettings> settings, ILogger<OpenAiTeletriageService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<TeletriageResult> AssessAsync(
        string petName, string species, int age, string symptoms, string? medicalHistory)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            _logger.LogWarning("OpenAI API key not configured — returning fallback assessment");
            return BuildFallbackAssessment(symptoms);
        }

        try
        {
            var client = new OpenAIClient(new ApiKeyCredential(_settings.ApiKey));
            var chatClient = client.GetChatClient(_settings.Model);

            var systemPrompt = BuildSystemPrompt();
            var userPrompt = BuildUserPrompt(petName, species, age, symptoms, medicalHistory);

            var options = new ChatCompletionOptions { MaxOutputTokenCount = _settings.MaxTokens };

            var completion = await chatClient.CompleteChatAsync(
                [
                    new SystemChatMessage(systemPrompt),
                    new UserChatMessage(userPrompt),
                ],
                options);

            var content = completion.Value.Content[0].Text;
            return ParseAssessment(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OpenAI teletriage call failed — returning fallback");
            return BuildFallbackAssessment(symptoms);
        }
    }

    private static string BuildSystemPrompt() => """
        You are a veterinary teletriage assistant. Your role is to provide a preliminary health assessment for pets based on symptoms described by their owner. You are NOT a replacement for a veterinarian.

        Always respond in valid JSON with exactly these fields:
        {
          "severity": "Low" | "Medium" | "High" | "Critical",
          "assessment": "A clear 2-4 sentence explanation of what the symptoms might indicate.",
          "recommendations": "Bullet-point list of recommended actions (use \\n for newlines).",
          "isEmergency": true | false
        }

        Rules:
        - If any symptom suggests a life-threatening condition (difficulty breathing, seizures, poisoning, severe bleeding, collapse), set isEmergency to true and severity to "Critical".
        - Be compassionate but factual.
        - Always recommend consulting a veterinarian for Medium, High, and Critical cases.
        - Never diagnose definitively — use phrases like "may indicate", "could suggest", "possible".
        """;

    private static string BuildUserPrompt(string petName, string species, int age, string symptoms, string? medicalHistory)
    {
        var prompt = $"Pet: {petName}, a {age}-year-old {species}.\nSymptoms: {symptoms}";
        if (!string.IsNullOrWhiteSpace(medicalHistory))
            prompt += $"\nMedical history: {medicalHistory}";
        return prompt;
    }

    private TeletriageResult ParseAssessment(string content)
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
            _logger.LogWarning(ex, "Failed to parse OpenAI teletriage JSON — using raw content");
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
}
