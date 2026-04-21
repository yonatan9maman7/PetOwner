using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using PetOwner.Api.Controllers;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Controllers;

public class TeletriageControllerTests
{
    [Fact]
    public async Task Assess_WhenSymptomsMissing_ReturnsBadRequest_DoesNotCallAi()
    {
        await using var db = CreateInMemoryDb();
        var ai = new Mock<IGeminiAiService>(MockBehavior.Strict);
        var sut = new TeletriageController(db, ai.Object);
        sut.ControllerContext = ControllerContextForUser(Guid.NewGuid());

        var result = await sut.Assess(new TeletriageRequestDto(Guid.NewGuid(), "   "));

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(bad.Value);
        ai.Verify(
            a => a.AssessTeletriageAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>()),
            Times.Never);
    }

    [Fact]
    public async Task Assess_WhenPetOwned_PersistsSessionAndReturnsOk()
    {
        var userId = Guid.NewGuid();
        var petId = Guid.NewGuid();

        await using var db = CreateInMemoryDb();
        db.Users.Add(new User
        {
            Id = userId,
            Phone = "+15550000001",
            Email = "owner1@example.com",
            Name = "Owner",
            Role = "Owner",
            CreatedAt = DateTime.UtcNow
        });
        db.Pets.Add(new Pet
        {
            Id = petId,
            UserId = userId,
            Name = "Rex",
            Species = PetSpecies.Dog,
            Age = 4,
            TagsCsv = ""
        });
        await db.SaveChangesAsync();

        var expected = new TeletriageResult(
            Severity: "Low",
            Assessment: "Looks manageable.",
            Recommendations: "- Rest\n- Water",
            IsEmergency: false);

        var ai = new Mock<IGeminiAiService>();
        ai.Setup(a => a.AssessTeletriageAsync(
                It.IsAny<string>(),
                It.Is<string>(s => s == "coughing"),
                It.IsAny<string?>()))
            .ReturnsAsync(expected);

        var sut = new TeletriageController(db, ai.Object);
        sut.ControllerContext = ControllerContextForUser(userId);

        var actionResult = await sut.Assess(new TeletriageRequestDto(petId, "coughing", null));

        var ok = Assert.IsType<OkObjectResult>(actionResult);
        var dto = Assert.IsType<TeletriageResponseDto>(ok.Value);
        Assert.Equal(petId, dto.PetId);
        Assert.Equal("Rex", dto.PetName);
        Assert.Equal("Low", dto.Severity);

        var saved = await db.TeletriageSessions.AsNoTracking().SingleAsync();
        Assert.Equal(petId, saved.PetId);
        Assert.Equal(userId, saved.UserId);
        Assert.Equal(expected.Assessment, saved.Assessment);
    }

    private static ApplicationDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private static ControllerContext ControllerContextForUser(Guid userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        var identity = new ClaimsIdentity(claims, authenticationType: "Test");
        var principal = new ClaimsPrincipal(identity);
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }
}
