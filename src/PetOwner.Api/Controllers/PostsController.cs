using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Api.Services;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/posts")]
[Authorize]
public class PostsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly INotificationService _notifications;

    public PostsController(ApplicationDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    [HttpGet("feed")]
    public async Task<IActionResult> GetFeed(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] double? lat = null,
        [FromQuery] double? lng = null,
        [FromQuery] double? radiusKm = null,
        [FromQuery] string? category = null)
    {
        var userId = GetUserId();
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _db.Posts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        if (lat.HasValue && lng.HasValue && radiusKm.HasValue)
        {
            var latDiff = radiusKm.Value / 111.0;
            var lngDiff = radiusKm.Value / (111.0 * Math.Cos(lat.Value * Math.PI / 180.0));
            query = query.Where(p =>
                p.Latitude != null && p.Longitude != null &&
                p.Latitude >= lat.Value - latDiff && p.Latitude <= lat.Value + latDiff &&
                p.Longitude >= lng.Value - lngDiff && p.Longitude <= lng.Value + lngDiff);
        }

        var posts = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PostDto(
                p.Id, p.UserId, p.User.Name, p.Content, p.ImageUrl,
                p.LikeCount, p.CommentCount,
                p.Likes.Any(l => l.UserId == userId),
                p.CreatedAt,
                p.User.Role,
                p.User.ProviderProfile != null && p.User.ProviderProfile.Status == ProviderStatus.Approved,
                p.Category))
            .ToListAsync();

        return Ok(posts);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePostDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(dto.Content) && string.IsNullOrWhiteSpace(dto.ImageUrl))
            return BadRequest(new { message = "Post must have content or an image." });

        var post = new Post
        {
            UserId = userId,
            Content = dto.Content?.Trim() ?? string.Empty,
            ImageUrl = dto.ImageUrl?.Trim(),
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            City = dto.City?.Trim(),
        };

        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        var created = await _db.Posts
            .AsNoTracking()
            .Where(p => p.Id == post.Id)
            .Select(p => new PostDto(
                p.Id, p.UserId, p.User.Name, p.Content, p.ImageUrl,
                0, 0, false, p.CreatedAt,
                p.User.Role,
                p.User.ProviderProfile != null && p.User.ProviderProfile.Status == ProviderStatus.Approved,
                p.Category))
            .FirstAsync();

        return CreatedAtAction(nameof(GetFeed), null, created);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (post is null) return NotFound(new { message = "Post not found." });

        _db.Posts.Remove(post);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/like")]
    public async Task<IActionResult> ToggleLike(Guid id)
    {
        var userId = GetUserId();
        var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == id);
        if (post is null) return NotFound(new { message = "Post not found." });

        var existing = await _db.PostLikes.FirstOrDefaultAsync(l => l.PostId == id && l.UserId == userId);

        if (existing is not null)
        {
            _db.PostLikes.Remove(existing);
            post.LikeCount = Math.Max(0, post.LikeCount - 1);
        }
        else
        {
            _db.PostLikes.Add(new PostLike { PostId = id, UserId = userId });
            post.LikeCount++;
        }

        await _db.SaveChangesAsync();
        return Ok(new { liked = existing is null, likeCount = post.LikeCount });
    }

    // ── Comments ────────────────────────────────────────────────────────────────

    [HttpGet("{postId:guid}/comments")]
    public async Task<IActionResult> GetComments(Guid postId)
    {
        var userId = GetUserId();

        var raw = await _db.PostComments
            .AsNoTracking()
            .Where(c => c.PostId == postId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.ParentCommentId,
                c.UserId,
                UserName = c.User.Name,
                c.Content,
                c.CreatedAt,
                c.EditedAt,
                c.LikeCount,
                LikedByMe = c.Likes.Any(l => l.UserId == userId),
            })
            .ToListAsync();

        // Build tree in memory
        var byParent = raw
            .Where(c => c.ParentCommentId != null)
            .GroupBy(c => c.ParentCommentId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        CommentDto Build(dynamic c) => new CommentDto(
            c.Id, c.ParentCommentId, c.UserId, c.UserName, c.Content,
            c.CreatedAt, c.EditedAt, c.LikeCount, c.LikedByMe,
            byParent.TryGetValue((Guid)c.Id, out var kids)
                ? kids.Select(k => Build(k)).ToArray()
                : Array.Empty<CommentDto>());

        var tree = raw
            .Where(c => c.ParentCommentId == null)
            .Select(c => Build(c))
            .ToList();

        return Ok(tree);
    }

    [HttpPost("{postId:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid postId, [FromBody] CreateCommentDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Comment content is required." });

        var post = await _db.Posts
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == postId);
        if (post is null) return NotFound(new { message = "Post not found." });

        if (dto.ParentCommentId is Guid parentId)
        {
            var parent = await _db.PostComments
                .Where(c => c.Id == parentId && c.PostId == postId)
                .Select(c => new { c.Id, c.ParentCommentId, c.UserId })
                .FirstOrDefaultAsync();
            if (parent is null) return NotFound(new { message = "Parent comment not found." });
            if (parent.ParentCommentId is not null)
                return BadRequest(new { message = "Replies to replies are not allowed." });
        }

        var comment = new PostComment
        {
            PostId = postId,
            UserId = userId,
            ParentCommentId = dto.ParentCommentId,
            Content = dto.Content.Trim(),
        };

        _db.PostComments.Add(comment);
        post.CommentCount++;
        await _db.SaveChangesAsync();

        var commenterName = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.Name)
            .FirstAsync();

        // Notifications
        await NotifyCommentAsync(post, comment, commenterName, dto.ParentCommentId);

        return Ok(new CommentDto(
            comment.Id, comment.ParentCommentId, comment.UserId, commenterName,
            comment.Content, comment.CreatedAt, comment.EditedAt,
            0, false, Array.Empty<CommentDto>()));
    }

    [HttpPatch("comments/{commentId:guid}")]
    public async Task<IActionResult> EditComment(Guid commentId, [FromBody] EditCommentDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Comment content is required." });

        var comment = await _db.PostComments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.UserId == userId);
        if (comment is null) return NotFound(new { message = "Comment not found." });

        comment.Content = dto.Content.Trim();
        comment.EditedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { comment.Id, comment.Content, comment.EditedAt });
    }

    [HttpDelete("comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteComment(Guid commentId)
    {
        var userId = GetUserId();
        var comment = await _db.PostComments
            .Include(c => c.Post)
            .Include(c => c.Replies)
            .FirstOrDefaultAsync(c => c.Id == commentId && c.UserId == userId);

        if (comment is null) return NotFound(new { message = "Comment not found." });

        var totalDecrement = 1 + comment.Replies.Count;
        comment.Post.CommentCount = Math.Max(0, comment.Post.CommentCount - totalDecrement);
        _db.PostComments.Remove(comment);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("comments/{commentId:guid}/like")]
    public async Task<IActionResult> ToggleCommentLike(Guid commentId)
    {
        var userId = GetUserId();
        var comment = await _db.PostComments.FirstOrDefaultAsync(c => c.Id == commentId);
        if (comment is null) return NotFound(new { message = "Comment not found." });

        var existing = await _db.PostCommentLikes
            .FirstOrDefaultAsync(l => l.CommentId == commentId && l.UserId == userId);

        if (existing is not null)
        {
            _db.PostCommentLikes.Remove(existing);
            comment.LikeCount = Math.Max(0, comment.LikeCount - 1);
        }
        else
        {
            _db.PostCommentLikes.Add(new PostCommentLike { CommentId = commentId, UserId = userId });
            comment.LikeCount++;
        }

        await _db.SaveChangesAsync();
        return Ok(new { liked = existing is null, likeCount = comment.LikeCount });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private async Task NotifyCommentAsync(
        Post post,
        PostComment comment,
        string commenterName,
        Guid? parentCommentId)
    {
        var alreadyNotified = new HashSet<Guid> { comment.UserId };

        // Notify post author (unless they're the commenter)
        if (post.UserId != comment.UserId)
        {
            alreadyNotified.Add(post.UserId);
            await _notifications.CreateAsync(
                post.UserId,
                "POST_COMMENT",
                commenterName,
                $"{commenterName} commented on your post",
                post.Id);
        }

        // If this is a reply, notify the parent comment author
        if (parentCommentId.HasValue)
        {
            var parentAuthorId = await _db.PostComments
                .Where(c => c.Id == parentCommentId.Value)
                .Select(c => c.UserId)
                .FirstOrDefaultAsync();

            if (parentAuthorId != default && !alreadyNotified.Contains(parentAuthorId))
            {
                alreadyNotified.Add(parentAuthorId);
                await _notifications.CreateAsync(
                    parentAuthorId,
                    "POST_COMMENT",
                    commenterName,
                    $"{commenterName} replied to your comment",
                    post.Id);
            }
        }

        // Notify @-mentioned users from post participants
        var mentions = ExtractMentions(comment.Content);
        if (mentions.Count > 0)
        {
            var participantNames = await _db.PostComments
                .AsNoTracking()
                .Where(c => c.PostId == comment.PostId)
                .Select(c => new { c.UserId, c.User.Name })
                .Distinct()
                .ToListAsync();

            // Also include post author
            participantNames.Add(new { UserId = post.UserId, post.User.Name });

            foreach (var participant in participantNames)
            {
                if (alreadyNotified.Contains(participant.UserId)) continue;
                var firstName = participant.Name.Split(' ')[0];
                if (mentions.Any(m => string.Equals(m, firstName, StringComparison.OrdinalIgnoreCase)
                                   || string.Equals(m, participant.Name, StringComparison.OrdinalIgnoreCase)))
                {
                    alreadyNotified.Add(participant.UserId);
                    await _notifications.CreateAsync(
                        participant.UserId,
                        "POST_COMMENT",
                        commenterName,
                        $"{commenterName} mentioned you in a comment",
                        post.Id);
                }
            }
        }
    }

    private static List<string> ExtractMentions(string content)
    {
        var mentions = new List<string>();
        var words = content.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        foreach (var word in words)
        {
            if (word.StartsWith('@') && word.Length > 1)
                mentions.Add(word[1..].TrimEnd(',', '.', '!', '?'));
        }
        return mentions;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
