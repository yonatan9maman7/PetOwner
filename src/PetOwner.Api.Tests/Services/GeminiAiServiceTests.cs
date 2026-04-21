using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;
using PetOwner.Api.Services;
using Xunit;

namespace PetOwner.Api.Tests.Services;

/// <summary>
/// Exercises <see cref="GeminiAiService"/> resilience: HTTP failures/timeouts and malformed model output
/// must not bubble as unhandled exceptions — callers get fallback assessments.
/// </summary>
public class GeminiAiServiceTests
{
    private static IConfiguration ConfigWithKey =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Gemini:ApiKey"] = "test-gemini-key"
        }).Build();

    [Fact]
    public async Task AssessTeletriageAsync_WhenHttpClientTimesOut_ReturnsFallbackAssessment()
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new TaskCanceledException("Simulated Gemini timeout"));

        using var httpClient = new HttpClient(handler.Object);
        var sut = new GeminiAiService(httpClient, ConfigWithKey, NullLogger<GeminiAiService>.Instance);

        var result = await sut.AssessTeletriageAsync(
            "Pet: X, a 2-year-old Dog.",
            "mild cough",
            imageBase64: null);

        Assert.Equal("Medium", result.Severity);
        Assert.Contains("professional veterinary evaluation", result.Assessment, StringComparison.OrdinalIgnoreCase);
        Assert.False(result.IsEmergency);
    }

    [Fact]
    public async Task AssessTeletriageAsync_WhenApiReturnsBadRequest_InvalidImage_ReturnsFallbackAssessment()
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.BadRequest)
            {
                Content = new StringContent("{\"error\":{\"message\":\"Invalid image data\"}}")
            });

        using var httpClient = new HttpClient(handler.Object);
        var sut = new GeminiAiService(httpClient, ConfigWithKey, NullLogger<GeminiAiService>.Instance);

        var result = await sut.AssessTeletriageAsync(
            "Pet: X, a 2-year-old Dog.",
            "skin lesion",
            imageBase64: "data:image/jpeg;base64,AAAA");

        Assert.Equal("Medium", result.Severity);
        Assert.False(result.IsEmergency);
    }

    [Fact]
    public async Task AssessTeletriageAsync_WhenModelReturnsNonJsonText_ReturnsGracefulParseFallback()
    {
        const string rawText = "The model returned prose instead of JSON.";
        var payload = JsonSerializer.Serialize(new
        {
            candidates = new[]
            {
                new
                {
                    content = new
                    {
                        parts = new[] { new { text = rawText } }
                    }
                }
            }
        });

        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(payload, System.Text.Encoding.UTF8, "application/json")
            });

        using var httpClient = new HttpClient(handler.Object);
        var sut = new GeminiAiService(httpClient, ConfigWithKey, NullLogger<GeminiAiService>.Instance);

        var result = await sut.AssessTeletriageAsync("Pet details", "symptoms", null);

        Assert.Equal("Medium", result.Severity);
        Assert.Equal(rawText, result.Assessment);
        Assert.Contains("consult a veterinarian", result.Recommendations, StringComparison.OrdinalIgnoreCase);
        Assert.False(result.IsEmergency);
    }
}
