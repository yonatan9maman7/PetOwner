using System.ComponentModel.DataAnnotations;

namespace PetOwner.Api.DTOs;

public record CreateContactInquiryRequest(
    [Required, MaxLength(32)] string Topic,
    [MaxLength(200)] string? Subject,
    [Required, MinLength(10), MaxLength(4000)] string Message,
    [MaxLength(32)] string? AppVersion,
    [MaxLength(32)] string? Platform
);

public class ContactInquiryAdminDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = null!;
    public string UserEmail { get; set; } = null!;
    public string Topic { get; set; } = null!;
    public string? Subject { get; set; }
    public string Message { get; set; } = null!;
    public string? AppVersion { get; set; }
    public string? Platform { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}
