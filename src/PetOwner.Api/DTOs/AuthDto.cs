using System.ComponentModel.DataAnnotations;

namespace PetOwner.Api.DTOs;

public record RegisterDto(
    [Required, EmailAddress] string Email,
    [Required] string Phone,
    [Required] string Password,
    [Required] string Name,
    string Role = "Owner",
    string LanguagePreference = "he"
);

public record LoginDto(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record ForgotPasswordDto(
    [Required, EmailAddress] string Email
);

public record ResetPasswordDto(
    [Required, EmailAddress] string Email,
    [Required] string Token,
    [Required, MinLength(6)] string NewPassword
);
