using System.ClientModel;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;

namespace PetOwner.Api.Services;

public class OpenAiService : IAiService
{
    private readonly OpenAiSettings _settings;
    private readonly ILogger<OpenAiService> _logger;

    private const string SystemPrompt =
        "You are an expert copywriter for a premium pet-care platform. " +
        "The user will give you rough notes about their experience with pets. " +
        "Write a warm, trustworthy, and professional 2-paragraph bio in Hebrew. " +
        "Keep it engaging but under 100 words.";

    public OpenAiService(IOptions<OpenAiSettings> settings, ILogger<OpenAiService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<string> GenerateBioAsync(string userNotes)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            _logger.LogWarning("OpenAI API key not configured — returning fallback bio");
            return BuildFallbackBio(userNotes);
        }

        try
        {
            var client = new OpenAIClient(new ApiKeyCredential(_settings.ApiKey));
            var chatClient = client.GetChatClient(_settings.Model);

            var options = new ChatCompletionOptions { MaxOutputTokenCount = _settings.MaxTokens };

            var completion = await chatClient.CompleteChatAsync(
                [
                    new SystemChatMessage(SystemPrompt),
                    new UserChatMessage(userNotes),
                ],
                options);

            return completion.Value.Content[0].Text;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OpenAI bio generation failed — returning fallback");
            return BuildFallbackBio(userNotes);
        }
    }

    private static string BuildFallbackBio(string userNotes) =>
        $"I'm a passionate and reliable pet care professional. " +
        $"{userNotes}. " +
        $"I treat every pet like my own and always go the extra mile " +
        $"to ensure their safety and happiness.";
}
