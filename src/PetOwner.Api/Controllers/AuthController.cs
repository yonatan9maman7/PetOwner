using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Api.Infrastructure;
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
    private readonly IGoogleIdTokenValidator _googleValidator;
    private readonly IAppleIdTokenValidator _appleValidator;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        ApplicationDbContext db,
        IConfiguration config,
        IEmailService emailService,
        ITokenService tokenService,
        IGoogleIdTokenValidator googleValidator,
        IAppleIdTokenValidator appleValidator,
        ILogger<AuthController> logger)
    {
        _db = db;
        _config = config;
        _emailService = emailService;
        _tokenService = tokenService;
        _googleValidator = googleValidator;
        _appleValidator = appleValidator;
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

        if (user is null || string.IsNullOrEmpty(user.PasswordHash) ||
            !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Your account has been suspended. Please contact support." });

        var token = _tokenService.GenerateAccessToken(user);
        return Ok(new { token, userId = user.Id });
    }

    [EnableRateLimiting("AuthPolicy")]
    [HttpPost("social-login")]
    public async Task<IActionResult> SocialLogin([FromBody] SocialLoginDto dto)
    {
        string? providerUserId = null;
        string? providerEmail = null;
        string? providerName = null;

        if (dto.Provider.Equals("Google", StringComparison.OrdinalIgnoreCase))
        {
            var claims = await _googleValidator.ValidateAsync(dto.IdToken);
            if (claims is null)
                return Unauthorized(new { message = "Invalid social token." });

            providerUserId = claims.Subject;
            providerEmail = claims.Email;
            providerName = claims.Name;
        }
        else if (dto.Provider.Equals("Apple", StringComparison.OrdinalIgnoreCase))
        {
            var claims = await _appleValidator.ValidateAsync(dto.IdToken, dto.RawNonce);
            if (claims is null)
                return Unauthorized(new { message = "Invalid social token." });

            providerUserId = claims.Subject;
            providerEmail = claims.Email;
        }
        else
        {
            return BadRequest(new { message = "Unsupported provider." });
        }

        bool isGoogle = dto.Provider.Equals("Google", StringComparison.OrdinalIgnoreCase);

        // Step 1: find by provider ID
        User? user = isGoogle
            ? await _db.Users.FirstOrDefaultAsync(u => u.GoogleId == providerUserId)
            : await _db.Users.FirstOrDefaultAsync(u => u.AppleId == providerUserId);

        if (user is null && !string.IsNullOrEmpty(providerEmail))
        {
            // Step 2: find by email
            var emailNorm = NormalizeEmail(providerEmail);
            user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNorm);

            if (user is not null)
            {
                if (!string.IsNullOrEmpty(user.PasswordHash))
                {
                    // Password user — do not auto-link
                    return Conflict(new { message = "Please log in with your password." });
                }

                // Social-only user: attach this provider
                if (isGoogle) user.GoogleId = providerUserId;
                else user.AppleId = providerUserId;
                await _db.SaveChangesAsync();
            }
        }

        if (user is null)
        {
            // Step 3: create new user
            var resolvedName = providerName
                ?? (dto.GivenName is not null || dto.FamilyName is not null
                    ? $"{dto.GivenName} {dto.FamilyName}".Trim()
                    : null)
                ?? providerEmail?.Split('@')[0]
                ?? "User";

            var newEmail = !string.IsNullOrEmpty(providerEmail)
                ? NormalizeEmail(providerEmail)
                : $"{(isGoogle ? "google" : "apple")}.{providerUserId}@social.petowner.app";

            user = new User
            {
                Id = Guid.NewGuid(),
                Email = newEmail,
                Name = resolvedName,
                Role = "Owner",
                PasswordHash = null,
                Phone = null,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                GoogleId = isGoogle ? providerUserId : null,
                AppleId = isGoogle ? null : providerUserId
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        if (!user.IsActive)
            return Unauthorized(new { message = "Your account has been suspended. Please contact support." });

        var token = _tokenService.GenerateAccessToken(user);
        return Ok(new { token, userId = user.Id, requiresPhone = user.Phone == null });
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
        {
            var phone = dto.Phone.Trim();
            if (!PhoneValidator.IsValidFormat(phone))
                return BadRequest(new { message = "Please enter a valid phone number.", code = "INVALID_PHONE" });

            if (await PhoneValidator.IsTakenAsync(_db, phone, userId))
                return BadRequest(new { message = "Phone already in use.", code = "PHONE_TAKEN" });

            user.Phone = phone;
        }

        await _db.SaveChangesAsync();

        var token = _tokenService.GenerateAccessToken(user);
        return Ok(new { token, userId = user.Id });
    }

    [EnableRateLimiting("AuthPolicy")]
    [Authorize]
    [HttpPut("me/phone")]
    public async Task<IActionResult> UpdatePhone([FromBody] UpdatePhoneDto dto)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        var phone = dto.Phone.Trim();
        if (!PhoneValidator.IsValidFormat(phone))
            return BadRequest(new { message = "Please enter a valid phone number.", code = "INVALID_PHONE" });

        if (await PhoneValidator.IsTakenAsync(_db, phone, userId))
            return BadRequest(new { message = "Phone already in use.", code = "PHONE_TAKEN" });

        user.Phone = phone;
        await _db.SaveChangesAsync();

        return Ok();
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
