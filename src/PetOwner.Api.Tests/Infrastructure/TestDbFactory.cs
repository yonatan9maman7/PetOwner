using Microsoft.EntityFrameworkCore;
using PetOwner.Data;

namespace PetOwner.Api.Tests.Infrastructure;

public static class TestDbFactory
{
    public static ApplicationDbContext Create() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
}
