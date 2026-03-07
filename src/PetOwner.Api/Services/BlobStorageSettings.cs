namespace PetOwner.Api.Services;

public class BlobStorageSettings
{
    public const string SectionName = "BlobStorage";

    public string ConnectionString { get; set; } = string.Empty;
    public string ContainerName { get; set; } = "uploads";
    public int MaxFileSizeMb { get; set; } = 10;
    public int ThumbnailWidth { get; set; } = 300;
    public int ThumbnailHeight { get; set; } = 300;
}
