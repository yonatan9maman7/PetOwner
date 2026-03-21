using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;
    private readonly IEmailService _emailService;
    private readonly ITokenService _tokenService;

    public AuthController(
        ApplicationDbContext db,
        IConfiguration config,
        IEmailService emailService,
        ITokenService tokenService)
    {
        _db = db;
        _config = config;
        _emailService = emailService;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var emailNorm = NormalizeEmail(dto.Email);
        var emailExists = await _db.Users.AnyAsync(u => u.Email.ToLower() == emailNorm);
        if (emailExists)
            return BadRequest(new { message = "A user with this email already exists." });

        var phoneExists = await _db.Users.AnyAsync(u => u.Phone == dto.Phone);
        if (phoneExists)
            return BadRequest(new { message = "This phone number is already registered." });

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = emailNorm,
            Phone = dto.Phone,
            Name = dto.Name,
            Role = dto.Role,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = _tokenService.GenerateAccessToken(user);
        return Ok(new { token, userId = user.Id });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var emailNorm = NormalizeEmail(dto.Email);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNorm);

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        var token = _tokenService.GenerateAccessToken(user);
        return Ok(new { token, userId = user.Id });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var emailNorm = NormalizeEmail(dto.Email);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNorm);

        if (user is not null)
        {
            var tokenBytes = RandomNumberGenerator.GetBytes(32);
            var resetToken = Convert.ToBase64String(tokenBytes);

            user.ResetPasswordToken = resetToken;
            user.ResetPasswordTokenExpiry = DateTime.UtcNow.AddHours(1);
            await _db.SaveChangesAsync();

            var encodedToken = Uri.EscapeDataString(resetToken);
            var encodedEmail = Uri.EscapeDataString(emailNorm);
            var baseUrl = _config["FrontendBaseUrl"]?.TrimEnd('/');
            var resetLink = $"{baseUrl}/reset-password?token={encodedToken}&email={encodedEmail}";

            var body = $@"
<div dir='ltr' style='font-family: Arial, sans-serif; color: #333; text-align: left; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;'>
    <h2 style='color: #4F46E5;'>Reset Your Password - PetOwner</h2>
    <p>Hello,</p>
    <p>We received a request to reset the password for your account.</p>
    <p>Click the button below to choose a new password:</p>
    <div style='margin: 30px 0;'>
        <a href='{resetLink}' style='background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;'>Reset Password</a>
    </div>
    <p style='font-size: 12px; color: #888;'>If you didn't request a password reset, you can safely ignore this email.</p>
    <p>Best regards,<br/>The PetOwner Team</p>
</div>";

            await _emailService.SendEmailAsync(emailNorm, "Reset Your Password - PetOwner", body);
        }

        return Ok(new { message = "If the email exists in our system, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var emailNorm = NormalizeEmail(dto.Email);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNorm);

        if (user is null
            || user.ResetPasswordToken != dto.Token
            || user.ResetPasswordTokenExpiry is null
            || user.ResetPasswordTokenExpiry < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invalid or expired reset token." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.ResetPasswordToken = null;
        user.ResetPasswordTokenExpiry = null;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password has been reset successfully." });
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
