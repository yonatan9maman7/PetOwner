using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/pets")]
[Authorize]
public class PetsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public PetsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyPets()
    {
        var userId = GetUserId();

        var pets = await _db.Pets
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => new PetDto(p.Id, p.Name, p.Species, p.Age, p.Notes))
            .ToListAsync();

        return Ok(pets);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePet([FromBody] CreatePetDto request)
    {
        var userId = GetUserId();

        var pet = new Pet
        {
            UserId = userId,
            Name = request.Name,
            Species = request.Species,
            Age = request.Age,
            Notes = request.Notes,
        };

        _db.Pets.Add(pet);
        await _db.SaveChangesAsync();

        var dto = new PetDto(pet.Id, pet.Name, pet.Species, pet.Age, pet.Notes);
        return CreatedAtAction(nameof(GetMyPets), dto);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePet(Guid id)
    {
        var userId = GetUserId();

        var pet = await _db.Pets
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        _db.Pets.Remove(pet);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
