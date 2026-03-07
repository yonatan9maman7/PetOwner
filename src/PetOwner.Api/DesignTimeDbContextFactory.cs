using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using PetOwner.Data;

namespace PetOwner.Api;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(
                "Server=.;Database=PetOwner;Trusted_Connection=true;TrustServerCertificate=true",
                sql => sql.UseNetTopologySuite())
            .Options;

        return new ApplicationDbContext(options);
    }
}
