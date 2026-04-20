using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        ApplicationDbContext db,
        IConfiguration config,
        IEmailService emailService,
        ITokenService tokenService,
        ILogger<AuthController> logger)
    {
        _db = db;
        _config = config;
        _emailService = emailService;
        _tokenService = tokenService;
        _logger = logger;
    }

    [EnableRateLimiting("AuthPolicy")]
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

        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendWelcomeEmailAsync(user.Email, user.Name, dto.LanguagePreference);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send welcome email to {Email}", user.Email);
            }
        });

        var token = _tokenService.GenerateAccessToken(user);
        return Ok(new { token, userId = user.Id });
    }

    [EnableRateLimiting("AuthPolicy")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var emailNorm = NormalizeEmail(dto.Email);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNorm);

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Your account has been suspended. Please contact support." });

        var token = _tokenService.GenerateAccessToken(user);
        return Ok(new { token, userId = user.Id });
    }

    [EnableRateLimiting("AuthPolicy")]
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
            var baseUrl = (_config["FrontendBaseUrl"] ?? "http://localhost:4200").TrimEnd('/');
            var resetLink = $"{baseUrl}/reset-password?token={encodedToken}&email={encodedEmail}";

            _logger.LogInformation(
                "Password reset requested for {Email}. Dev/test reset link: {ResetLink}",
                emailNorm,
                resetLink);

            const string subject = "איפוס סיסמה למערכת";
            var body =
                $"<div dir='rtl' style='text-align: right; font-family: sans-serif;'><h2>שלום,</h2>" +
                "<p>קיבלנו בקשה לאיפוס הסיסמה שלך.</p>" +
                "<p>לחיצה על הקישור הבא תוביל אותך למסך איפוס הסיסמה:</p>" +
                $"<p><a href='{resetLink}'>לחץ כאן לאיפוס הסיסמה</a></p>" +
                "<p>אם לא ביקשת לאפס את הסיסמה, התעלם מהודעה זו.</p></div>";

            await _emailService.SendEmailAsync(emailNorm, subject, body);
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

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        return Ok(new UserProfileDto(user.Name, user.Email, user.Phone));
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileDto dto)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        user.Name = dto.Name.Trim();
        if (dto.Phone is not null)
            user.Phone = dto.Phone.Trim();

        await _db.SaveChangesAsync();

        var token = _tokenService.GenerateAccessToken(user);
        return Ok(new { token, userId = user.Id });
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
