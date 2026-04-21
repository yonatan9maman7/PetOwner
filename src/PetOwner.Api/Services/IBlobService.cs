namespace PetOwner.Api.Services;

public record BlobUploadResult(string FileName, string Url, string? ThumbnailUrl, long SizeBytes);

public interface IBlobService
{
    /// <summary>Uploads under <c>users/{userId}/&lt;folder&gt;/&lt;guid&gt;&lt;ext&gt;</c>.</summary>
    Task<BlobUploadResult> UploadAsync(Stream stream, string originalFileName, Guid userId, string folder, bool generateThumbnail = false);
    Task<Stream?> DownloadAsync(string blobName);
    Task DeleteAsync(string blobName);
    string GetSasUrl(string blobName, TimeSpan expiry);
}
