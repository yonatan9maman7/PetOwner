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
            // IsNeutered: placeholder until DB column exists (see future migration).
            .Select(p => new PetDto(p.Id, p.Name, p.Species, p.Breed, p.Age, p.Weight, p.Allergies, p.MedicalConditions, p.Notes, false))
            .ToListAsync();

        return Ok(pets);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePet([FromBody] CreatePetDto request)
    {
        var userId = GetUserId();
        // request.IsNeutered is part of the API contract; map to Pet when the column exists.

        var pet = new Pet
        {
            UserId = userId,
            Name = request.Name,
            Species = request.Species,
            Breed = request.Breed,
            Age = request.Age,
            Weight = request.Weight,
            Allergies = request.Allergies,
            MedicalConditions = request.MedicalConditions,
            Notes = request.Notes,
        };

        _db.Pets.Add(pet);
        await _db.SaveChangesAsync();

        var dto = new PetDto(pet.Id, pet.Name, pet.Species, pet.Breed, pet.Age, pet.Weight, pet.Allergies, pet.MedicalConditions, pet.Notes, false);
        return CreatedAtAction(nameof(GetMyPets), dto);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdatePet(Guid id, [FromBody] UpdatePetDto request)
    {
        var userId = GetUserId();

        var pet = await _db.Pets
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (pet is null)
            return NotFound(new { message = "Pet not found." });

        // request.IsNeutered: apply to pet when the column exists.
        pet.Name = request.Name;
        pet.Species = request.Species;
        pet.Breed = request.Breed;
        pet.Age = request.Age;
        pet.Weight = request.Weight;
        pet.Allergies = request.Allergies;
        pet.MedicalConditions = request.MedicalConditions;
        pet.Notes = request.Notes;

        await _db.SaveChangesAsync();

        var dto = new PetDto(pet.Id, pet.Name, pet.Species, pet.Breed, pet.Age, pet.Weight, pet.Allergies, pet.MedicalConditions, pet.Notes, false);
        return Ok(dto);
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
