using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PetOwner.Api.Services;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/files")]
[Authorize]
public class FilesController : ControllerBase
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"
    };

    private static readonly HashSet<string> AllowedDocExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".pdf", ".doc", ".docx"
    };

    private readonly IBlobService _blobService;
    private readonly BlobStorageSettings _settings;

    public FilesController(IBlobService blobService, IOptions<BlobStorageSettings> settings)
    {
        _blobService = blobService;
        _settings = settings.Value;
    }

    [HttpPost("upload/image")]
    public async Task<IActionResult> UploadImage(IFormFile file, [FromQuery] string folder = "images")
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(extension))
            return BadRequest(new { message = $"Invalid image type. Allowed: {string.Join(", ", AllowedImageExtensions)}" });

        if (file.Length > _settings.MaxFileSizeMb * 1024 * 1024)
            return BadRequest(new { message = $"File exceeds the {_settings.MaxFileSizeMb}MB limit." });

        using var stream = file.OpenReadStream();
        var result = await _blobService.UploadAsync(stream, file.FileName, folder, generateThumbnail: true);

        return Ok(new
        {
            result.FileName,
            result.Url,
            result.ThumbnailUrl,
            result.SizeBytes,
        });
    }

    [HttpPost("upload/document")]
    public async Task<IActionResult> UploadDocument(IFormFile file, [FromQuery] string folder = "documents")
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedDocExtensions.Contains(extension))
            return BadRequest(new { message = $"Invalid file type. Allowed: {string.Join(", ", AllowedDocExtensions)}" });

        if (file.Length > _settings.MaxFileSizeMb * 1024 * 1024)
            return BadRequest(new { message = $"File exceeds the {_settings.MaxFileSizeMb}MB limit." });

        var isImage = AllowedImageExtensions.Contains(extension);
        using var stream = file.OpenReadStream();
        var result = await _blobService.UploadAsync(stream, file.FileName, folder, generateThumbnail: isImage);

        return Ok(new
        {
            result.FileName,
            result.Url,
            result.ThumbnailUrl,
            result.SizeBytes,
        });
    }

    [HttpDelete("{*blobName}")]
    public async Task<IActionResult> Delete(string blobName)
    {
        if (string.IsNullOrWhiteSpace(blobName))
            return BadRequest(new { message = "Blob name is required." });

        await _blobService.DeleteAsync(blobName);
        return NoContent();
    }

    [HttpGet("sas/{*blobName}")]
    [AllowAnonymous]
    public IActionResult GetSasUrl(string blobName)
    {
        if (string.IsNullOrWhiteSpace(blobName))
            return BadRequest(new { message = "Blob name is required." });

        var url = _blobService.GetSasUrl(blobName, TimeSpan.FromHours(1));
        return Ok(new { url });
    }
}
