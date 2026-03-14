using Microsoft.AspNetCore.Mvc;
using PetOwner.Api.Services;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/ai")]
public class AiController : ControllerBase
{
    private readonly IGeminiAiService _aiService;

    public AiController(IGeminiAiService aiService)
    {
        _aiService = aiService;
    }

    [HttpPost("generate-bio")]
    public async Task<IActionResult> GenerateBio([FromBody] GenerateBioPayload payload)
    {
        if (string.IsNullOrWhiteSpace(payload.Info))
            return BadRequest(new { message = "Info field is required." });

        var bio = await _aiService.GenerateProfileBioAsync(payload.Info);
        return Ok(new { bio });
    }

    [HttpPost("generate-text")]
    public async Task<IActionResult> GenerateText([FromBody] GenerateTextPayload payload)
    {
        if (string.IsNullOrWhiteSpace(payload.Prompt))
            return BadRequest(new { message = "Prompt is required." });

        var text = await _aiService.GenerateTextAsync(payload.Prompt);
        return Ok(new { text });
    }
}

public record GenerateBioPayload(string Info);
public record GenerateTextPayload(string Prompt);
