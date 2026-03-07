namespace PetOwner.Api.Services;

public record BlobUploadResult(string FileName, string Url, string? ThumbnailUrl, long SizeBytes);

public interface IBlobService
{
    Task<BlobUploadResult> UploadAsync(Stream stream, string originalFileName, string folder, bool generateThumbnail = false);
    Task<Stream?> DownloadAsync(string blobName);
    Task DeleteAsync(string blobName);
    string GetSasUrl(string blobName, TimeSpan expiry);
}
