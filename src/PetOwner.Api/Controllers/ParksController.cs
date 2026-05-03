using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/parks")]
public class ParksController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ParksController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>Active dog parks for Explore map (no Google Places calls from clients).</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<DogParkDto>>> GetActiveParks(CancellationToken cancellationToken)
    {
        var list = await _db.DogParks
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Name)
            .Select(p => new DogParkDto(p.Id, p.Name, p.Address, p.Latitude, p.Longitude, p.IsActive))
            .ToListAsync(cancellationToken);

        return Ok(list);
    }
}
