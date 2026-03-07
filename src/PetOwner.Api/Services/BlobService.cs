using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;

namespace PetOwner.Api.Services;

public class BlobService : IBlobService
{
    private readonly BlobContainerClient _container;
    private readonly BlobStorageSettings _settings;
    private readonly ILogger<BlobService> _logger;

    public BlobService(IOptions<BlobStorageSettings> settings, ILogger<BlobService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
        var client = new BlobServiceClient(_settings.ConnectionString);
        _container = client.GetBlobContainerClient(_settings.ContainerName);
    }

    public async Task<BlobUploadResult> UploadAsync(
        Stream stream, string originalFileName, string folder, bool generateThumbnail = false)
    {
        await _container.CreateIfNotExistsAsync(PublicAccessType.Blob);

        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();
        var blobName = $"{folder}/{Guid.NewGuid():N}{extension}";

        var blobClient = _container.GetBlobClient(blobName);

        stream.Position = 0;
        await blobClient.UploadAsync(stream, new BlobHttpHeaders
        {
            ContentType = GetContentType(extension)
        });

        _logger.LogInformation("Uploaded blob {BlobName} ({Size} bytes)", blobName, stream.Length);

        string? thumbnailUrl = null;

        if (generateThumbnail && IsImageExtension(extension))
        {
            try
            {
                stream.Position = 0;
                thumbnailUrl = await GenerateThumbnailAsync(stream, blobName, extension);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to generate thumbnail for {BlobName}", blobName);
            }
        }

        return new BlobUploadResult(blobName, blobClient.Uri.ToString(), thumbnailUrl, stream.Length);
    }

    public async Task<Stream?> DownloadAsync(string blobName)
    {
        var blobClient = _container.GetBlobClient(blobName);

        if (!await blobClient.ExistsAsync())
            return null;

        var response = await blobClient.DownloadStreamingAsync();
        return response.Value.Content;
    }

    public async Task DeleteAsync(string blobName)
    {
        var blobClient = _container.GetBlobClient(blobName);
        await blobClient.DeleteIfExistsAsync();

        var thumbName = GetThumbnailName(blobName);
        var thumbClient = _container.GetBlobClient(thumbName);
        await thumbClient.DeleteIfExistsAsync();

        _logger.LogInformation("Deleted blob {BlobName}", blobName);
    }

    public string GetSasUrl(string blobName, TimeSpan expiry)
    {
        var blobClient = _container.GetBlobClient(blobName);

        if (!blobClient.CanGenerateSasUri)
        {
            _logger.LogWarning("Cannot generate SAS URI for {BlobName} — returning direct URI", blobName);
            return blobClient.Uri.ToString();
        }

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = _settings.ContainerName,
            BlobName = blobName,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(expiry),
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        return blobClient.GenerateSasUri(sasBuilder).ToString();
    }

    private async Task<string> GenerateThumbnailAsync(Stream originalStream, string originalBlobName, string extension)
    {
        using var image = await Image.LoadAsync(originalStream);

        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(_settings.ThumbnailWidth, _settings.ThumbnailHeight),
            Mode = ResizeMode.Max,
        }));

        var thumbName = GetThumbnailName(originalBlobName);
        var thumbClient = _container.GetBlobClient(thumbName);

        using var thumbStream = new MemoryStream();
        await image.SaveAsync(thumbStream, new JpegEncoder { Quality = 80 });
        thumbStream.Position = 0;

        await thumbClient.UploadAsync(thumbStream, new BlobHttpHeaders
        {
            ContentType = "image/jpeg"
        });

        _logger.LogInformation("Generated thumbnail {ThumbName} ({W}x{H})",
            thumbName, _settings.ThumbnailWidth, _settings.ThumbnailHeight);

        return thumbClient.Uri.ToString();
    }

    private static string GetThumbnailName(string blobName)
    {
        var dir = Path.GetDirectoryName(blobName)?.Replace('\\', '/') ?? "";
        var name = Path.GetFileNameWithoutExtension(blobName);
        return $"{dir}/{name}_thumb.jpg";
    }

    private static bool IsImageExtension(string extension) =>
        extension is ".jpg" or ".jpeg" or ".png" or ".gif" or ".webp" or ".bmp";

    private static string GetContentType(string extension) => extension switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".bmp" => "image/bmp",
        ".pdf" => "application/pdf",
        ".doc" => "application/msword",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        _ => "application/octet-stream",
    };
}
