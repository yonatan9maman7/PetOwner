namespace PetOwner.Api.Services;

public interface IAiService
{
    Task<string> GenerateBioAsync(string userNotes);
}
