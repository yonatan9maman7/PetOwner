using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

public class SupportTicketService : ISupportTicketService
{
    private readonly ApplicationDbContext _db;
    private readonly INotificationService _notifications;

    public SupportTicketService(ApplicationDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<SupportTicketDto> CreateTicketAsync(CreateSupportTicketRequest request, Guid userId)
    {
        if (request.BookingId is Guid bookingId)
        {
            var booking = await _db.ServiceRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(sr => sr.Id == bookingId);

            if (booking is null)
                throw new InvalidOperationException("Booking not found.");

            if (booking.PetOwnerId != userId && booking.ProviderId != userId)
                throw new UnauthorizedAccessException("You do not have access to this booking.");
        }

        var now = DateTime.UtcNow;
        var ticket = new SupportTicket
        {
            BookingId = request.BookingId,
            UserId = userId,
            Category = request.Category,
            Urgency = request.Urgency,
            Status = TicketStatus.Open,
            Description = request.Description.Trim(),
            FinancialDecision = TicketFinancialDecision.None,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.SupportTickets.Add(ticket);
        await _db.SaveChangesAsync();

        if (request.Urgency == TicketUrgency.Critical)
        {
            await _notifications.BroadcastAsync(
                "SupportTicketCritical",
                "Critical Support Ticket",
                $"A critical support ticket was opened (category: {request.Category}).",
                ticket.Id);
        }

        return await LoadTicketDtoAsync(ticket.Id);
    }

    public async Task<List<SupportTicketDto>> GetMyTicketsAsync(Guid userId)
    {
        var tickets = await QueryTickets()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return tickets.Select(MapToDto).ToList();
    }

    public async Task<List<SupportTicketDto>> GetAllTicketsAsync()
    {
        var tickets = await QueryTickets()
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return tickets.Select(MapToDto).ToList();
    }

    public async Task<SupportTicketDto> UpdateTicketAsync(Guid id, UpdateSupportTicketRequest request)
    {
        var ticket = await _db.SupportTickets
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket is null)
            throw new KeyNotFoundException($"Support ticket {id} was not found.");

        if (request.Status is TicketStatus status)
            ticket.Status = status;

        if (request.Urgency is TicketUrgency urgency)
            ticket.Urgency = urgency;

        if (request.FinancialDecision is TicketFinancialDecision financialDecision)
            ticket.FinancialDecision = financialDecision;

        if (request.AssignedTo is not null)
            ticket.AssignedTo = string.IsNullOrWhiteSpace(request.AssignedTo)
                ? null
                : request.AssignedTo.Trim();

        ticket.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return MapToDto(ticket);
    }

    private IQueryable<SupportTicket> QueryTickets() =>
        _db.SupportTickets
            .AsNoTracking()
            .Include(t => t.User);

    private async Task<SupportTicketDto> LoadTicketDtoAsync(Guid ticketId)
    {
        var ticket = await QueryTickets()
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket is null)
            throw new KeyNotFoundException($"Support ticket {ticketId} was not found.");

        return MapToDto(ticket);
    }

    private static SupportTicketDto MapToDto(SupportTicket t) =>
        new(
            t.Id,
            t.BookingId,
            t.UserId,
            t.User!.Name,
            t.User!.Email,
            t.Category,
            t.Urgency,
            t.Status,
            t.Description,
            t.FinancialDecision,
            t.AssignedTo,
            t.CreatedAt,
            t.UpdatedAt);
}
