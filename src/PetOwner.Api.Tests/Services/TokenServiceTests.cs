using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using PetOwner.Api.Services;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Services;

public class TokenServiceTests
{
    private const string TestJwtKey = "PetOwnerTestJwtKeyMustBeAtLeast32CharsLong!";

    [Fact]
    public void GenerateAccessToken_WhenJwtKeyMissing_ThrowsInvalidOperationException()
    {
        // Arrange
        var config = new ConfigurationBuilder().Build();
        var sut = new TokenService(config);
        var user = CreateUser();

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => sut.GenerateAccessToken(user));
    }

    [Fact]
    public void GenerateAccessToken_WhenConfigured_ReturnsValidJwtWithClaims()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sut = new TokenService(CreateConfig());
        var user = CreateUser(userId, "Test User", "user@test.example", "Owner");

        // Act
        var token = sut.GenerateAccessToken(user);

        // Assert
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);
        Assert.Equal(userId.ToString(), jwt.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Equal("Test User", jwt.Claims.First(c => c.Type == ClaimTypes.Name).Value);
        Assert.Equal("user@test.example", jwt.Claims.First(c => c.Type == ClaimTypes.Email).Value);
        Assert.Equal("Owner", jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value);
        Assert.Equal("petowner-test", jwt.Issuer);
        Assert.Equal("petowner-mobile", jwt.Audiences.First());
    }

    [Fact]
    public void GenerateAccessToken_WhenCustomExpireMinutes_SetsExpiryAccordingly()
    {
        // Arrange
        var sut = new TokenService(CreateConfig(expireMinutes: 120));
        var before = DateTime.UtcNow.AddMinutes(119);

        // Act
        var token = sut.GenerateAccessToken(CreateUser());

        // Assert
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.True(jwt.ValidTo >= before);
        Assert.True(jwt.ValidTo <= DateTime.UtcNow.AddMinutes(121));
    }

    private static IConfiguration CreateConfig(int expireMinutes = 60) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = TestJwtKey,
                ["Jwt:Issuer"] = "petowner-test",
                ["Jwt:Audience"] = "petowner-mobile",
                ["Jwt:ExpireMinutes"] = expireMinutes.ToString(),
            })
            .Build();

    private static User CreateUser(
        Guid? id = null,
        string name = "User",
        string email = "u@test.example",
        string role = "Owner") =>
        new()
        {
            Id = id ?? Guid.NewGuid(),
            Name = name,
            Email = email,
            Role = role,
            CreatedAt = DateTime.UtcNow,
        };
}
