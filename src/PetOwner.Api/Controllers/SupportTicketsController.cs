using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/support-tickets")]
[Authorize]
public class SupportTicketsController : ControllerBase
{
    private readonly ISupportTicketService _supportTickets;

    public SupportTicketsController(ISupportTicketService supportTickets) =>
        _supportTickets = supportTickets;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSupportTicketRequest request)
    {
        try
        {
            var dto = await _supportTickets.CreateTicketAsync(request, GetUserId());
            return Created($"/api/support-tickets/{dto.Id}", dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyTickets()
    {
        var tickets = await _supportTickets.GetMyTicketsAsync(GetUserId());
        return Ok(tickets);
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllTickets()
    {
        var tickets = await _supportTickets.GetAllTicketsAsync();
        return Ok(tickets);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSupportTicketRequest request)
    {
        try
        {
            var dto = await _supportTickets.UpdateTicketAsync(id, request);
            return Ok(dto);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Support ticket not found." });
        }
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
