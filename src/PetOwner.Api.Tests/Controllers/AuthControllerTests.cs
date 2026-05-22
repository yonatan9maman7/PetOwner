using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using PetOwner.Api.Controllers;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Api.Tests.Infrastructure;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Controllers;

public class AuthControllerTests
{
    private const string JwtKey = "PetOwnerTestJwtKeyMustBeAtLeast32CharsLong!";
    private const string TestPassword = "Password123!";

    [Fact]
    public async Task Register_WhenValid_ReturnsTokenAndCreatesUser()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var sut = CreateSut(db);

        // Act
        var result = await sut.Register(new RegisterDto(
            "newuser@test.example",
            "0501234567",
            TestPassword,
            "New User"));

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
        Assert.True(await db.Users.AnyAsync(u => u.Email == "newuser@test.example"));
    }

    [Fact]
    public async Task Register_WhenEmailExists_ReturnsConflict()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = "exists@test.example",
            Phone = "0501111111",
            Name = "Existing",
            Role = "Owner",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword),
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db);

        // Act
        var result = await sut.Register(new RegisterDto(
            "exists@test.example",
            "0502222222",
            TestPassword,
            "Another"));

        // Assert
        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public async Task Login_WhenValidCredentials_ReturnsToken()
    {
        // Arrange
        const string email = "login@test.example";
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Phone = "0503333333",
            Name = "Login User",
            Role = "Owner",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword),
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db);

        // Act
        var result = await sut.Login(new LoginDto(email, TestPassword));

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Login_WhenInvalidPassword_ReturnsUnauthorized()
    {
        // Arrange
        const string email = "login2@test.example";
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Phone = "0504444444",
            Name = "Login User",
            Role = "Owner",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword),
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db);

        // Act
        var result = await sut.Login(new LoginDto(email, "WrongPassword!"));

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_WhenAccountSuspended_ReturnsUnauthorized()
    {
        // Arrange
        const string email = "suspended@test.example";
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Phone = "0505555555",
            Name = "Suspended",
            Role = "Owner",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword),
            CreatedAt = DateTime.UtcNow,
            IsActive = false,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db);

        // Act
        var result = await sut.Login(new LoginDto(email, TestPassword));

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task SocialLogin_WhenGoogleTokenValid_CreatesUserAndReturnsToken()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var google = Substitute.For<IGoogleIdTokenValidator>();
        google.ValidateAsync("valid-token").Returns(new GoogleTokenClaims("google-sub-1", "social@test.example", "Social User"));
        var sut = CreateSut(db, google: google);

        // Act
        var result = await sut.SocialLogin(new SocialLoginDto("Google", "valid-token", null, null, null));

        // Assert
        Assert.IsType<OkObjectResult>(result);
        Assert.True(await db.Users.AnyAsync(u => u.GoogleId == "google-sub-1"));
    }

    [Fact]
    public async Task SocialLogin_WhenTokenInvalid_ReturnsUnauthorized()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var google = Substitute.For<IGoogleIdTokenValidator>();
        google.ValidateAsync(Arg.Any<string>()).Returns((GoogleTokenClaims?)null);
        var sut = CreateSut(db, google: google);

        // Act
        var result = await sut.SocialLogin(new SocialLoginDto("Google", "bad-token", null, null, null));

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task SocialLogin_WhenUnsupportedProvider_ReturnsBadRequest()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var sut = CreateSut(db);

        // Act
        var result = await sut.SocialLogin(new SocialLoginDto("Facebook", "token", null, null, null));

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ForgotPassword_WhenUserNotFound_ReturnsNotFound()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        var sut = CreateSut(db);

        // Act
        var result = await sut.ForgotPassword(new ForgotPasswordDto("missing@test.example"));

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task ResetPassword_WhenTokenValid_UpdatesPassword()
    {
        // Arrange
        const string email = "reset@test.example";
        const string token = "reset-token-abc";
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Phone = "0506666666",
            Name = "Reset User",
            Role = "Owner",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword),
            ResetPasswordToken = token,
            ResetPasswordTokenExpiry = DateTime.UtcNow.AddHours(1),
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db);
        const string newPassword = "NewPassword456!";

        // Act
        var result = await sut.ResetPassword(new ResetPasswordDto(email, token, newPassword));

        // Assert
        Assert.IsType<OkObjectResult>(result);
        var user = await db.Users.FirstAsync(u => u.Email == email);
        Assert.True(BCrypt.Net.BCrypt.Verify(newPassword, user.PasswordHash));
        Assert.Null(user.ResetPasswordToken);
    }

    [Fact]
    public async Task GetMe_WhenAuthenticated_ReturnsUserProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = userId,
            Email = "me@test.example",
            Phone = "0507777777",
            Name = "Me",
            Role = "Owner",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db);
        sut.ControllerContext = ControllerContextForUser(userId);

        // Act
        var result = await sut.GetMe();

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var profile = Assert.IsType<UserProfileDto>(ok.Value);
        Assert.Equal("Me", profile.Name);
        Assert.Equal("me@test.example", profile.Email);
    }

    private static AuthController CreateSut(
        PetOwner.Data.ApplicationDbContext db,
        IGoogleIdTokenValidator? google = null,
        IAppleIdTokenValidator? apple = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = JwtKey,
                ["Jwt:Issuer"] = "petowner-test",
                ["Jwt:Audience"] = "petowner-mobile",
                ["FrontendBaseUrl"] = "http://localhost:4200",
            })
            .Build();

        return new AuthController(
            db,
            config,
            Substitute.For<IEmailService>(),
            new TokenService(config),
            google ?? Substitute.For<IGoogleIdTokenValidator>(),
            apple ?? Substitute.For<IAppleIdTokenValidator>(),
            NullLogger<AuthController>.Instance);
    }

    private static ControllerContext ControllerContextForUser(Guid userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        var identity = new ClaimsIdentity(claims, authenticationType: "Test");
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) },
        };
    }
}
