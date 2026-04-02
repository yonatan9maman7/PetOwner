using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/posts")]
[Authorize]
public class PostsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public PostsController(ApplicationDbContext db) => _db = db;

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
                p.Category,
                p.UpdatedAt))
            .ToListAsync();

        return Ok(posts);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePostDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Post content is required." });

        var post = new Post
        {
            UserId = userId,
            Content = dto.Content.Trim(),
            ImageUrl = dto.ImageUrl?.Trim(),
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            City = dto.City?.Trim(),
            CreatedAt = DateTime.UtcNow,
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
                p.Category,
                p.UpdatedAt))
            .FirstAsync();

        return CreatedAtAction(nameof(GetFeed), null, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePostDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Post content is required." });

        var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == id);
        if (post is null) return NotFound(new { message = "Post not found." });

        var userId = GetUserId();
        if (post.UserId != userId)
            return Forbid();

        post.Content = dto.Content.Trim();
        post.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var updated = await _db.Posts
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new PostDto(
                p.Id, p.UserId, p.User.Name, p.Content, p.ImageUrl,
                p.LikeCount, p.CommentCount,
                p.Likes.Any(l => l.UserId == userId),
                p.CreatedAt,
                p.User.Role,
                p.User.ProviderProfile != null && p.User.ProviderProfile.Status == ProviderStatus.Approved,
                p.Category,
                p.UpdatedAt))
            .FirstAsync();

        return Ok(updated);
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

    [HttpGet("{postId:guid}/comments")]
    public async Task<IActionResult> GetComments(Guid postId)
    {
        var comments = await _db.PostComments
            .AsNoTracking()
            .Where(c => c.PostId == postId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto(c.Id, c.UserId, c.User.Name, c.Content, c.CreatedAt))
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost("{postId:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid postId, [FromBody] CreateCommentDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Comment content is required." });

        var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post is null) return NotFound(new { message = "Post not found." });

        var comment = new PostComment
        {
            PostId = postId,
            UserId = userId,
            Content = dto.Content.Trim(),
        };

        _db.PostComments.Add(comment);
        post.CommentCount++;
        await _db.SaveChangesAsync();

        var userName = await _db.Users.Where(u => u.Id == userId).Select(u => u.Name).FirstAsync();

        return Ok(new CommentDto(comment.Id, comment.UserId, userName, comment.Content, comment.CreatedAt));
    }

    [HttpDelete("comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteComment(Guid commentId)
    {
        var userId = GetUserId();
        var comment = await _db.PostComments
            .Include(c => c.Post)
            .FirstOrDefaultAsync(c => c.Id == commentId && c.UserId == userId);

        if (comment is null) return NotFound(new { message = "Comment not found." });

        comment.Post.CommentCount = Math.Max(0, comment.Post.CommentCount - 1);
        _db.PostComments.Remove(comment);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
