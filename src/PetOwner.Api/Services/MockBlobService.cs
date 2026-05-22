namespace PetOwner.Api.Services;

/// <summary>
/// Development / CI mock that stores uploads in-process memory and serves them
/// as data-URIs. Registered when the Azure Blob connection string is absent or
/// set to the Azurite development sentinel "UseDevelopmentStorage=true" while
/// Azurite is not running.
/// </summary>
public class MockBlobService : IBlobService
{
    private readonly ILogger<MockBlobService> _logger;
    private readonly Dictionary<string, (byte[] Bytes, string ContentType)> _store = new();

    public MockBlobService(ILogger<MockBlobService> logger)
    {
        _logger = logger;
    }

    public async Task<BlobUploadResult> UploadAsync(
        Stream stream,
        string originalFileName,
        Guid userId,
        string folder,
        bool generateThumbnail = false)
    {
        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();
        var blobName = $"users/{userId:D}/{SanitizeFolder(folder)}/{Guid.NewGuid():N}{extension}";
        var contentType = GetContentType(extension);

        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms);
        var bytes = ms.ToArray();

        lock (_store) { _store[blobName] = (bytes, contentType); }

        // Return a data-URI so the frontend can display the image immediately.
        var dataUri = $"data:{contentType};base64,{Convert.ToBase64String(bytes)}";

        _logger.LogInformation(
            "[MockBlobService] Stored blob '{BlobName}' ({Size} bytes) as data-URI",
            blobName, bytes.Length);

        return new BlobUploadResult(blobName, dataUri, dataUri, bytes.Length);
    }

    public Task<Stream?> DownloadAsync(string blobName)
    {
        lock (_store)
        {
            if (_store.TryGetValue(blobName, out var entry))
                return Task.FromResult<Stream?>(new MemoryStream(entry.Bytes));
        }
        return Task.FromResult<Stream?>(null);
    }

    public Task DeleteAsync(string blobName)
    {
        lock (_store) { _store.Remove(blobName); }
        return Task.CompletedTask;
    }

    public string GetSasUrl(string blobName, TimeSpan expiry)
    {
        lock (_store)
        {
            if (_store.TryGetValue(blobName, out var entry))
                return $"data:{entry.ContentType};base64,{Convert.ToBase64String(entry.Bytes)}";
        }
        return blobName;
    }

    private static string SanitizeFolder(string folder)
    {
        if (string.IsNullOrWhiteSpace(folder)) return "files";
        var seg = folder.Replace('\\', '/').Split('/').FirstOrDefault()?.Trim() ?? "files";
        return seg.Length > 0 ? seg : "files";
    }

    private static string GetContentType(string extension) => extension switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png"            => "image/png",
        ".gif"            => "image/gif",
        ".webp"           => "image/webp",
        ".bmp"            => "image/bmp",
        _                 => "application/octet-stream",
    };
}
