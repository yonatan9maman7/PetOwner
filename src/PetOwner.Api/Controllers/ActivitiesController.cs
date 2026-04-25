using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/pets/{petId:guid}/activities")]
[Authorize]
public class ActivitiesController : ControllerBase
{
    private static readonly HashSet<string> ValidTypes = new(StringComparer.OrdinalIgnoreCase)
        { "Walk", "Meal", "Exercise", "Weight", "Grooming" };

    private readonly ApplicationDbContext _db;

    public ActivitiesController(ApplicationDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid petId, [FromQuery] string? type, [FromQuery] int days = 30)
    {
        var userId = GetUserId();
        if (!await OwnsOrNot(petId, userId)) return NotFound(new { message = "Pet not found." });

        var since = DateTime.UtcNow.AddDays(-days).Date;

        var query = _db.Activities.AsNoTracking()
            .Where(a => a.PetId == petId && a.Date >= since);

        if (!string.IsNullOrWhiteSpace(type))
            query = query.Where(a => a.Type == type);

        var items = await query
            .OrderByDescending(a => a.Date)
            .ThenByDescending(a => a.CreatedAt)
            .Select(a => new ActivityDto(a.Id, a.PetId, a.Type, a.Value, a.DurationMinutes, a.Notes, a.Date, a.CreatedAt))
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid petId, [FromBody] CreateActivityDto dto)
    {
        var userId = GetUserId();
        if (!await OwnsOrNot(petId, userId)) return NotFound(new { message = "Pet not found." });

        if (!ValidTypes.Contains(dto.Type))
            return BadRequest(new { message = "Type must be Walk, Meal, Exercise, Weight, or Grooming." });

        var activity = new Activity
        {
            PetId = petId,
            UserId = userId,
            Type = dto.Type,
            Value = dto.Value,
            DurationMinutes = dto.DurationMinutes,
            Notes = dto.Notes?.Trim(),
            Date = NormalizeActivityDate(dto.Type, dto.Date),
        };

        _db.Activities.Add(activity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { petId },
            new ActivityDto(activity.Id, activity.PetId, activity.Type, activity.Value,
                activity.DurationMinutes, activity.Notes, activity.Date, activity.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid petId, Guid id, [FromBody] UpdateActivityDto dto)
    {
        var userId = GetUserId();

        var activity = await _db.Activities
            .FirstOrDefaultAsync(a => a.Id == id && a.PetId == petId && a.UserId == userId);

        if (activity is null)
            return NotFound(new { message = "Activity not found." });

        if (!ValidTypes.Contains(dto.Type))
            return BadRequest(new { message = "Type must be Walk, Meal, Exercise, Weight, or Grooming." });

        activity.Type = dto.Type;
        activity.Value = dto.Value;
        activity.DurationMinutes = dto.DurationMinutes;
        activity.Notes = dto.Notes?.Trim();
        activity.Date = NormalizeActivityDate(dto.Type, dto.Date);

        await _db.SaveChangesAsync();

        return Ok(new ActivityDto(activity.Id, activity.PetId, activity.Type, activity.Value,
            activity.DurationMinutes, activity.Notes, activity.Date, activity.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid petId, Guid id)
    {
        var userId = GetUserId();

        var activity = await _db.Activities
            .FirstOrDefaultAsync(a => a.Id == id && a.PetId == petId && a.UserId == userId);

        if (activity is null)
            return NotFound(new { message = "Activity not found." });

        _db.Activities.Remove(activity);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(Guid petId, [FromQuery] int days = 30)
    {
        var userId = GetUserId();
        if (!await OwnsOrNot(petId, userId)) return NotFound(new { message = "Pet not found." });

        var since = DateTime.UtcNow.AddDays(-days).Date;

        var activities = await _db.Activities.AsNoTracking()
            .Where(a => a.PetId == petId && a.Date >= since)
            .ToListAsync();

        var walks = activities.Where(a => a.Type == "Walk").ToList();
        var meals = activities.Where(a => a.Type == "Meal").ToList();
        var exercises = activities.Where(a => a.Type == "Exercise").ToList();
        var weights = activities.Where(a => a.Type == "Weight" && a.Value.HasValue)
            .OrderBy(a => a.Date)
            .Select(a => new WeightEntryDto(a.Date, a.Value!.Value))
            .ToList();

        var weeklyBreakdown = new Dictionary<string, int>();
        foreach (var a in activities)
        {
            var weekStart = a.Date.AddDays(-(int)a.Date.DayOfWeek).ToString("yyyy-MM-dd");
            weeklyBreakdown.TryGetValue(weekStart, out var count);
            weeklyBreakdown[weekStart] = count + 1;
        }

        var streak = CalculateStreak(activities);

        return Ok(new ActivitySummaryDto(
            TotalWalks: walks.Count,
            TotalWalkMinutes: walks.Sum(w => w.DurationMinutes ?? 0),
            TotalWalkDistance: walks.Sum(w => w.Value ?? 0),
            TotalMeals: meals.Count,
            TotalExercises: exercises.Count,
            TotalExerciseMinutes: exercises.Sum(e => e.DurationMinutes ?? 0),
            WeightHistory: weights,
            CurrentStreak: streak,
            WeeklyBreakdown: weeklyBreakdown
        ));
    }

    private static int CalculateStreak(List<Activity> activities)
    {
        var activeDates = activities
            .Select(a => a.Date.Date)
            .Distinct()
            .OrderByDescending(d => d)
            .ToList();

        if (activeDates.Count == 0) return 0;

        var today = DateTime.UtcNow.Date;
        if (activeDates[0] != today && activeDates[0] != today.AddDays(-1))
            return 0;

        var streak = 1;
        for (var i = 1; i < activeDates.Count; i++)
        {
            if ((activeDates[i - 1] - activeDates[i]).Days == 1)
                streak++;
            else
                break;
        }

        return streak;
    }

    private async Task<bool> OwnsOrNot(Guid petId, Guid userId) =>
        await _db.Pets.AnyAsync(p => p.Id == petId && p.UserId == userId);

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    /// <summary>Meals keep clock time for feeding logs; other types stay calendar-day only.</summary>
    private static DateTime NormalizeActivityDate(string type, DateTime date) =>
        string.Equals(type, "Meal", StringComparison.OrdinalIgnoreCase) ? date : date.Date;
}
