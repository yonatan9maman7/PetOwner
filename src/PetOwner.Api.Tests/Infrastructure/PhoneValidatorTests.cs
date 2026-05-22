using PetOwner.Api.Infrastructure;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Infrastructure;

public class PhoneValidatorTests
{
    [Theory]
    [InlineData("0501234567", true)]
    [InlineData("0529876543", true)]
    [InlineData("0401234567", false)]
    [InlineData("050123456", false)]
    [InlineData("05012345678", false)]
    [InlineData("", false)]
    public void IsValidFormat_WhenVariousInputs_ReturnsExpected(string phone, bool expected)
    {
        // Act
        var result = PhoneValidator.IsValidFormat(phone);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task IsTakenAsync_WhenNoUserHasPhone_ReturnsFalse()
    {
        // Arrange
        await using var db = TestDbFactory.Create();

        // Act
        var result = await PhoneValidator.IsTakenAsync(db, "0501112233");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsTakenAsync_WhenPhoneExists_ReturnsTrue()
    {
        // Arrange
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Phone = "0501112233",
            Email = "taken@example.com",
            Name = "Taken",
            Role = "Owner",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        // Act
        var result = await PhoneValidator.IsTakenAsync(db, "0501112233");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsTakenAsync_WhenExcludeUserIdMatchesOwner_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await using var db = TestDbFactory.Create();
        db.Users.Add(new User
        {
            Id = userId,
            Phone = "0502223344",
            Email = "self@example.com",
            Name = "Self",
            Role = "Owner",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        // Act
        var result = await PhoneValidator.IsTakenAsync(db, "0502223344", excludeUserId: userId);

        // Assert
        Assert.False(result);
    }
}
