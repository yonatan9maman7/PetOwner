using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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

    public AuthController(ApplicationDbContext db, IConfiguration config, IEmailService emailService)
    {
        _db = db;
        _config = config;
        _emailService = emailService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var emailExists = await _db.Users.AnyAsync(u => u.Email == dto.Email);
        if (emailExists)
            return BadRequest(new { message = "A user with this email already exists." });

        var phoneExists = await _db.Users.AnyAsync(u => u.Phone == dto.Phone);
        if (phoneExists)
            return BadRequest(new { message = "This phone number is already registered." });

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = dto.Email,
            Phone = dto.Phone,
            Name = dto.Name,
            Role = dto.Role,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = GenerateJwt(user);
        return Ok(new { token, userId = user.Id });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        var token = GenerateJwt(user);
        return Ok(new { token, userId = user.Id });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user is not null)
        {
            var tokenBytes = RandomNumberGenerator.GetBytes(32);
            var resetToken = Convert.ToBase64String(tokenBytes);

            user.ResetPasswordToken = resetToken;
            user.ResetPasswordTokenExpiry = DateTime.UtcNow.AddHours(1);
            await _db.SaveChangesAsync();

            var encodedToken = Uri.EscapeDataString(resetToken);
            var encodedEmail = Uri.EscapeDataString(dto.Email);
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

            await _emailService.SendEmailAsync(dto.Email, "Reset Your Password - PetOwner", body);
        }

        return Ok(new { message = "If the email exists in our system, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

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

    private string GenerateJwt(User user)
    {
        var jwtKey = _config["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var expireMinutes = _config.GetValue("Jwt:ExpireMinutes", 60);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expireMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
