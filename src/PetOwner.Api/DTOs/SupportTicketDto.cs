using System.ComponentModel.DataAnnotations;
using PetOwner.Data.Models;

namespace PetOwner.Api.DTOs;

public record CreateSupportTicketRequest(
    [Required] TicketCategory Category,
    [Required, MinLength(10), MaxLength(2000)] string Description,
    Guid? BookingId = null,
    TicketUrgency Urgency = TicketUrgency.Medium
);

public record UpdateSupportTicketRequest(
    TicketStatus? Status = null,
    TicketUrgency? Urgency = null,
    TicketFinancialDecision? FinancialDecision = null,
    [MaxLength(256)] string? AssignedTo = null
);

public record SupportTicketDto(
    Guid Id,
    Guid? BookingId,
    Guid UserId,
    string UserName,
    string UserEmail,
    TicketCategory Category,
    TicketUrgency Urgency,
    TicketStatus Status,
    string Description,
    TicketFinancialDecision FinancialDecision,
    string? AssignedTo,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
