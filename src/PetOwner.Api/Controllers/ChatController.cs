using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ChatController(ApplicationDbContext db) => _db = db;

    /// <summary>
    /// Returns all active conversations for the current user, ordered by most recent message.
    /// Each entry includes the other user's name/avatar, last message snippet, and unread count.
    /// </summary>
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
                OtherUserAvatar = c.User1Id == userId
                    ? c.User2.ProviderProfile != null ? c.User2.ProviderProfile.ProfileImageUrl : null
                    : c.User1.ProviderProfile != null ? c.User1.ProviderProfile.ProfileImageUrl : null,
                LastMessageSnippet = c.Messages
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => m.Content)
                    .FirstOrDefault(),
                UnreadCount = c.Messages.Count(m => m.SenderId != userId && !m.IsRead),
                c.LastMessageAt,
            })
            .ToListAsync();

        var result = conversations.Select(c => new ChatConversationDto(
            c.Id,
            c.OtherUserId,
            c.OtherUserName,
            c.OtherUserAvatar,
            c.LastMessageSnippet != null && c.LastMessageSnippet.Length > 80
                ? c.LastMessageSnippet[..80] + "…"
                : c.LastMessageSnippet,
            c.UnreadCount,
            c.LastMessageAt
        ));

        return Ok(result);
    }

    /// <summary>
    /// Returns the message history between the current user and <paramref name="otherUserId"/>.
    /// Returns the most recent 50 messages per page, in chronological order.
    /// </summary>
    [HttpGet("{otherUserId:guid}")]
    public async Task<IActionResult> GetMessages(Guid otherUserId, [FromQuery] int page = 1)
    {
        var userId = GetUserId();

        if (otherUserId == userId)
            return BadRequest(new { message = "Cannot open a chat with yourself." });

        var id1 = userId < otherUserId ? userId : otherUserId;
        var id2 = userId < otherUserId ? otherUserId : userId;

        var convo = await _db.Conversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.User1Id == id1 && c.User2Id == id2);

        if (convo is null)
            return Ok(Array.Empty<ChatMessageDto>());

        const int pageSize = 50;

        var messages = await _db.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == convo.Id)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new ChatMessageDto(
                m.Id,
                m.SenderId,
                m.Sender.Name,
                m.Content,
                m.IsRead,
                m.CreatedAt
            ))
            .ToListAsync();

        messages.Reverse();
        return Ok(messages);
    }

    /// <summary>
    /// Marks all messages sent by <paramref name="otherUserId"/> to the current user as read.
    /// </summary>
    [HttpPost("{otherUserId:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid otherUserId)
    {
        var userId = GetUserId();

        var id1 = userId < otherUserId ? userId : otherUserId;
        var id2 = userId < otherUserId ? otherUserId : userId;

        var convo = await _db.Conversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.User1Id == id1 && c.User2Id == id2);

        if (convo is null)
            return Ok(new { markedRead = 0 });

        var unread = await _db.Messages
            .Where(m => m.ConversationId == convo.Id && m.SenderId == otherUserId && !m.IsRead)
            .ToListAsync();

        if (unread.Count == 0)
            return Ok(new { markedRead = 0 });

        foreach (var m in unread)
            m.IsRead = true;

        await _db.SaveChangesAsync();

        return Ok(new { markedRead = unread.Count });
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
