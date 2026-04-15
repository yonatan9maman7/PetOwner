using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/support")]
public class SupportController : ControllerBase
{
    private static readonly HashSet<string> AllowedTopics = ["general", "account", "bug", "billing"];
    private readonly ApplicationDbContext _db;

    public SupportController(ApplicationDbContext db) => _db = db;

    [Authorize]
    [HttpPost("inquiries")]
    public async Task<IActionResult> Create([FromBody] CreateContactInquiryRequest request)
    {
        var topic = request.Topic?.Trim().ToLowerInvariant() ?? "";
        if (!AllowedTopics.Contains(topic))
            return BadRequest(new { message = "Invalid topic. Allowed: general, account, bug, billing." });

        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var inquiry = new ContactInquiry
        {
            UserId = userId,
            Topic = topic,
            Subject = request.Subject?.Trim(),
            Message = request.Message.Trim(),
            AppVersion = request.AppVersion?.Trim(),
            Platform = request.Platform?.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.ContactInquiries.Add(inquiry);
        await _db.SaveChangesAsync();

        return Created($"/api/support/inquiries/{inquiry.Id}", new { id = inquiry.Id });
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
