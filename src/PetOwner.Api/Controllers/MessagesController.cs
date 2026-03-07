using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/messages")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public MessagesController(ApplicationDbContext db) => _db = db;

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        var userId = GetUserId();

        var conversations = await _db.Conversations
            .AsNoTracking()
            .Where(c => c.User1Id == userId || c.User2Id == userId)
            .OrderByDescending(c => c.LastMessageAt)
            .Select(c => new
            {
                c.Id,
                OtherUserId = c.User1Id == userId ? c.User2Id : c.User1Id,
                OtherUserName = c.User1Id == userId ? c.User2.Name : c.User1.Name,
                LastMessage = c.Messages.OrderByDescending(m => m.CreatedAt).Select(m => m.Content).FirstOrDefault(),
                UnreadCount = c.Messages.Count(m => m.SenderId != userId && !m.IsRead),
                c.LastMessageAt,
            })
            .ToListAsync();

        return Ok(conversations.Select(c => new ConversationDto(
            c.Id, c.OtherUserId, c.OtherUserName,
            c.LastMessage, c.UnreadCount, c.LastMessageAt)));
    }

    [HttpGet("{conversationId:guid}")]
    public async Task<IActionResult> GetMessages(Guid conversationId, [FromQuery] int page = 1)
    {
        var userId = GetUserId();

        var convo = await _db.Conversations.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == conversationId && (c.User1Id == userId || c.User2Id == userId));

        if (convo is null) return NotFound(new { message = "Conversation not found." });

        var messages = await _db.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * 50)
            .Take(50)
            .Select(m => new MessageDto(m.Id, m.SenderId, m.Sender.Name, m.Content, m.IsRead, m.CreatedAt))
            .ToListAsync();

        // Mark unread messages as read
        var unread = await _db.Messages
            .Where(m => m.ConversationId == conversationId && m.SenderId != userId && !m.IsRead)
            .ToListAsync();

        foreach (var m in unread) m.IsRead = true;
        if (unread.Count > 0) await _db.SaveChangesAsync();

        messages.Reverse();
        return Ok(messages);
    }

    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] SendMessageDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Message content is required." });

        if (dto.RecipientId == userId)
            return BadRequest(new { message = "Cannot send a message to yourself." });

        var recipientExists = await _db.Users.AnyAsync(u => u.Id == dto.RecipientId);
        if (!recipientExists) return NotFound(new { message = "Recipient not found." });

        var id1 = userId < dto.RecipientId ? userId : dto.RecipientId;
        var id2 = userId < dto.RecipientId ? dto.RecipientId : userId;

        var convo = await _db.Conversations
            .FirstOrDefaultAsync(c => c.User1Id == id1 && c.User2Id == id2);

        if (convo is null)
        {
            convo = new Conversation { User1Id = id1, User2Id = id2 };
            _db.Conversations.Add(convo);
            await _db.SaveChangesAsync();
        }

        var message = new Message
        {
            ConversationId = convo.Id,
            SenderId = userId,
            Content = dto.Content.Trim(),
        };

        _db.Messages.Add(message);
        convo.LastMessageAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var senderName = await _db.Users.Where(u => u.Id == userId).Select(u => u.Name).FirstAsync();

        return Ok(new
        {
            conversationId = convo.Id,
            message = new MessageDto(message.Id, message.SenderId, senderName, message.Content, false, message.CreatedAt),
        });
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetUserId();
        var count = await _db.Messages
            .CountAsync(m => m.SenderId != userId && !m.IsRead &&
                (m.Conversation.User1Id == userId || m.Conversation.User2Id == userId));

        return Ok(new { unreadCount = count });
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
