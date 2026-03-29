using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly ApplicationDbContext _db;

    public ChatHub(ApplicationDbContext db) => _db = db;

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is not null)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"chat_{userId}");

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is not null)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"chat_{userId}");

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Saves a message to the database and pushes it to the recipient in real time.
    /// The sender receives a "MessageSent" callback; the recipient receives "ReceiveMessage".
    /// </summary>
    public async Task SendMessage(Guid recipientId, string content)
    {
        var senderIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (senderIdStr is null)
            throw new HubException("Authentication required.");

        var senderId = Guid.Parse(senderIdStr);

        if (recipientId == senderId)
            throw new HubException("Cannot send a message to yourself.");

        if (string.IsNullOrWhiteSpace(content))
            throw new HubException("Message content is required.");

        var recipientExists = await _db.Users.AnyAsync(u => u.Id == recipientId);
        if (!recipientExists)
            throw new HubException("Recipient not found.");

        var id1 = senderId < recipientId ? senderId : recipientId;
        var id2 = senderId < recipientId ? recipientId : senderId;

        var convo = await _db.Conversations
            .FirstOrDefaultAsync(c => c.User1Id == id1 && c.User2Id == id2);

        if (convo is null)
        {
            convo = new Conversation
            {
                User1Id = id1,
                User2Id = id2,
                CreatedAt = DateTime.UtcNow,
                LastMessageAt = DateTime.UtcNow,
            };
            _db.Conversations.Add(convo);
            await _db.SaveChangesAsync();
        }

        var message = new Message
        {
            ConversationId = convo.Id,
            SenderId = senderId,
            Content = content.Trim(),
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Messages.Add(message);
        convo.LastMessageAt = message.CreatedAt;
        await _db.SaveChangesAsync();

        var senderName = await _db.Users
            .Where(u => u.Id == senderId)
            .Select(u => u.Name)
            .FirstOrDefaultAsync() ?? "Unknown";

        var payload = new ChatMessageDto(
            message.Id,
            message.SenderId,
            senderName,
            message.Content,
            message.IsRead,
            message.CreatedAt
        );

        var response = new ChatNewMessageResponse(convo.Id, payload);

        await Clients.Group($"chat_{recipientId}").SendAsync("ReceiveMessage", response);
        await Clients.Caller.SendAsync("MessageSent", response);
    }
}
