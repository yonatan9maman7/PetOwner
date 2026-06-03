using PetOwner.Api.DTOs;

namespace PetOwner.Api.Services;

public interface ISupportTicketService
{
    Task<SupportTicketDto> CreateTicketAsync(CreateSupportTicketRequest request, Guid userId);
    Task<List<SupportTicketDto>> GetMyTicketsAsync(Guid userId);
    Task<List<SupportTicketDto>> GetAllTicketsAsync();
    Task<SupportTicketDto> UpdateTicketAsync(Guid id, UpdateSupportTicketRequest request);
}
