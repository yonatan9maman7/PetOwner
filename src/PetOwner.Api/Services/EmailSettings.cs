namespace PetOwner.Api.Services;

public class EmailSettings
{
    public const string SectionName = "Email";

    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 1025;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = "noreply@petowner.co.il";
    public string FromName { get; set; } = "PetOwner";
}
