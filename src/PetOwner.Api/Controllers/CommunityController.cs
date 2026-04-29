using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetOwner.Api.DTOs;
using PetOwner.Data;
using PetOwner.Data.Models;

namespace PetOwner.Api.Controllers;

[ApiController]
[Route("api/community")]
[Authorize]
public class CommunityController : ControllerBase
{
    private const double EarthRadiusKm = 6371.0;
    private readonly ApplicationDbContext _db;

    public CommunityController(ApplicationDbContext db)
    {
        _db = db;
    }

    // ── Public: Groups ──────────────────────────────────────

    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups(
        [FromQuery] string? country = null,
        [FromQuery] string? city = null)
    {
        var query = _db.CommunityGroups
            .Where(g => g.IsActive);

        if (!string.IsNullOrWhiteSpace(country))
        {
            var normalizedCountry = country.Trim();
            var normalizedCity = city?.Trim();

            query = query.Where(g =>
                (g.TargetCountry == null && g.TargetCity == null) ||
                (g.TargetCountry == normalizedCountry &&
                    (g.TargetCity == null || g.TargetCity == normalizedCity)));
        }

        var userId = GetUserId();

        var groups = await query
            .OrderBy(g => g.Name)
            .Select(g => new CommunityGroupDto(
                g.Id,
                g.Name,
                g.Description,
                g.Icon,
                g.IsActive,
                g.CreatedAt,
                g.TargetCountry,
                g.TargetCity,
                g.Posts.Count,
                g.Members.Count,
                g.Members.Any(m => m.UserId == userId)
            ))
            .ToListAsync();

        return Ok(groups);
    }

    [HttpPost("groups/{id:guid}/join")]
    public async Task<IActionResult> JoinGroup(Guid id)
    {
        var userId = GetUserId();

        var groupExists = await _db.CommunityGroups
            .AnyAsync(g => g.Id == id && g.IsActive);
        if (!groupExists)
            return NotFound(new { message = "Group not found." });

        var existing = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId);

        if (existing is null)
        {
            _db.GroupMembers.Add(new GroupMember
            {
                Id = Guid.NewGuid(),
                GroupId = id,
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }

        var memberCount = await _db.GroupMembers.CountAsync(m => m.GroupId == id);
        return Ok(new GroupJoinResponse(true, memberCount));
    }

    [HttpDelete("groups/{id:guid}/join")]
    public async Task<IActionResult> LeaveGroup(Guid id)
    {
        var userId = GetUserId();

        var groupExists = await _db.CommunityGroups.AnyAsync(g => g.Id == id);
        if (!groupExists)
            return NotFound(new { message = "Group not found." });

        var existing = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId);

        if (existing is not null)
        {
            _db.GroupMembers.Remove(existing);
            await _db.SaveChangesAsync();
        }

        var memberCount = await _db.GroupMembers.CountAsync(m => m.GroupId == id);
        return Ok(new GroupJoinResponse(false, memberCount));
    }

    // ── Public: Posts ────────────────────────────────────────

    [HttpGet("groups/{groupId:guid}/posts")]
    public async Task<IActionResult> GetPosts(
        Guid groupId,
        [FromQuery] double? lat = null,
        [FromQuery] double? lng = null,
        [FromQuery] double? radiusKm = null)
    {
        var groupExists = await _db.CommunityGroups.AnyAsync(g => g.Id == groupId);
        if (!groupExists)
            return NotFound(new { message = "Group not found." });

        var userId = GetUserId();

        var inMemory = IsInMemoryDatabase(_db);
        var needsGeo = lat.HasValue && lng.HasValue && radiusKm is > 0;

        IQueryable<GroupPost> query = _db.GroupPosts
            .AsNoTracking()
            .Where(p => p.GroupId == groupId);

        if (needsGeo && !inMemory)
        {
            var lat1 = lat!.Value;
            var lng1 = lng!.Value;
            var rKm = radiusKm!.Value;

            // Haversine distance (km) translated to SQL Server — same formula as HaversineKm below.
            query = query.Where(p =>
                p.Latitude != null &&
                p.Longitude != null &&
                EarthRadiusKm * 2.0 * Math.Atan2(
                    Math.Sqrt(
                        Math.Pow(Math.Sin(((p.Latitude!.Value - lat1) * Math.PI / 180.0) / 2.0), 2) +
                        Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(p.Latitude!.Value * Math.PI / 180.0) *
                        Math.Pow(Math.Sin(((p.Longitude!.Value - lng1) * Math.PI / 180.0) / 2.0), 2)),
                    Math.Sqrt(1.0 - (
                        Math.Pow(Math.Sin(((p.Latitude!.Value - lat1) * Math.PI / 180.0) / 2.0), 2) +
                        Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(p.Latitude!.Value * Math.PI / 180.0) *
                        Math.Pow(Math.Sin(((p.Longitude!.Value - lng1) * Math.PI / 180.0) / 2.0), 2)))
                ) <= rKm);
        }

        query = query
            .Include(p => p.Author)
                .ThenInclude(u => u.ProviderProfile)
            .Include(p => p.Likes)
            .Include(p => p.Comments);

        if (!inMemory)
            query = query.AsSplitQuery();

        var posts = await query
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        if (needsGeo && inMemory)
        {
            var lat1 = lat!.Value;
            var lng1 = lng!.Value;
            var rKm = radiusKm!.Value;
            posts = posts
                .Where(p =>
                    p.Latitude.HasValue &&
                    p.Longitude.HasValue &&
                    HaversineKm(lat1, lng1, p.Latitude!.Value, p.Longitude!.Value) <= rKm)
                .OrderByDescending(p => p.CreatedAt)
                .ToList();
        }

        var dtos = posts.Select(p => ToPostDto(p, userId)).ToList();
        return Ok(dtos);
    }

    [HttpPost("groups/{groupId:guid}/posts")]
    public async Task<IActionResult> CreatePost(Guid groupId, [FromBody] CreateGroupPostRequest request)
    {
        var group = await _db.CommunityGroups.FindAsync(groupId);
        if (group is null || !group.IsActive)
            return NotFound(new { message = "Group not found." });

        var userId = GetUserId();

        var post = new GroupPost
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            AuthorId = userId,
            Content = request.Content.Trim(),
            CreatedAt = DateTime.UtcNow,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            City = request.City?.Trim(),
            Country = request.Country?.Trim()
        };

        _db.GroupPosts.Add(post);
        await _db.SaveChangesAsync();

        var author = await _db.Users
            .Include(u => u.ProviderProfile)
            .FirstAsync(u => u.Id == userId);

        post.Author = author;

        return CreatedAtAction(nameof(GetPosts), new { groupId }, ToPostDto(post, userId));
    }

    // ── Engagement: Likes & Comments ────────────────────────

    [HttpPost("posts/{postId:guid}/like")]
    public async Task<IActionResult> ToggleLike(Guid postId)
    {
        var userId = GetUserId();
        var post = await _db.GroupPosts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post is null)
            return NotFound(new { message = "Post not found." });

        var existing = await _db.GroupPostLikes
            .FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == userId);

        if (existing is not null)
        {
            _db.GroupPostLikes.Remove(existing);
        }
        else
        {
            _db.GroupPostLikes.Add(new GroupPostLike
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        var likesCount = await _db.GroupPostLikes.CountAsync(l => l.PostId == postId);
        return Ok(new { likesCount, isLikedByCurrentUser = existing is null });
    }

    [HttpGet("posts/{postId:guid}/comments")]
    public async Task<IActionResult> GetComments(Guid postId)
    {
        var comments = await _db.GroupPostComments
            .AsNoTracking()
            .Where(c => c.PostId == postId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new GroupPostCommentDto(
                c.Id,
                c.AuthorId,
                c.Author.Name,
                c.Author.ProviderProfile != null ? c.Author.ProviderProfile.ProfileImageUrl : null,
                c.Content,
                c.CreatedAt
            ))
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost("posts/{postId:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid postId, [FromBody] CreateGroupPostCommentRequest request)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { message = "Comment content is required." });

        var post = await _db.GroupPosts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post is null)
            return NotFound(new { message = "Post not found." });

        var comment = new GroupPostComment
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            AuthorId = userId,
            Content = request.Content.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.GroupPostComments.Add(comment);
        await _db.SaveChangesAsync();

        var author = await _db.Users
            .Include(u => u.ProviderProfile)
            .FirstAsync(u => u.Id == userId);

        return Ok(new GroupPostCommentDto(
            comment.Id,
            comment.AuthorId,
            author.Name,
            author.ProviderProfile?.ProfileImageUrl,
            comment.Content,
            comment.CreatedAt
        ));
    }

    // ── Admin: Group CRUD ───────────────────────────────────

    [HttpGet("admin/groups")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminGetGroups()
    {
        var userId = GetUserId();

        var groups = await _db.CommunityGroups
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => new CommunityGroupDto(
                g.Id, g.Name, g.Description, g.Icon, g.IsActive,
                g.CreatedAt, g.TargetCountry, g.TargetCity, g.Posts.Count,
                g.Members.Count,
                g.Members.Any(m => m.UserId == userId)
            ))
            .ToListAsync();

        return Ok(groups);
    }

    [HttpGet("admin/groups/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminGetGroup(Guid id)
    {
        var userId = GetUserId();

        var group = await _db.CommunityGroups
            .Where(g => g.Id == id)
            .Select(g => new CommunityGroupDto(
                g.Id, g.Name, g.Description, g.Icon, g.IsActive,
                g.CreatedAt, g.TargetCountry, g.TargetCity, g.Posts.Count,
                g.Members.Count,
                g.Members.Any(m => m.UserId == userId)
            ))
            .FirstOrDefaultAsync();

        if (group is null)
            return NotFound(new { message = "Group not found." });

        return Ok(group);
    }

    [HttpPost("admin/groups")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminCreateGroup([FromBody] CreateCommunityGroupRequest request)
    {
        var group = new CommunityGroup
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Icon = request.Icon?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            TargetCountry = request.TargetCountry?.Trim(),
            TargetCity = request.TargetCity?.Trim()
        };

        _db.CommunityGroups.Add(group);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(AdminGetGroup), new { id = group.Id },
            new CommunityGroupDto(
                group.Id, group.Name, group.Description, group.Icon, group.IsActive,
                group.CreatedAt, group.TargetCountry, group.TargetCity, 0, 0, false));
    }

    [HttpPut("admin/groups/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminUpdateGroup(Guid id, [FromBody] UpdateCommunityGroupRequest request)
    {
        var group = await _db.CommunityGroups.FindAsync(id);
        if (group is null)
            return NotFound(new { message = "Group not found." });

        group.Name = request.Name.Trim();
        group.Description = request.Description?.Trim() ?? string.Empty;
        group.Icon = request.Icon?.Trim();
        group.IsActive = request.IsActive;
        group.TargetCountry = request.TargetCountry?.Trim();
        group.TargetCity = request.TargetCity?.Trim();

        await _db.SaveChangesAsync();

        var userId = GetUserId();
        var postCount = await _db.GroupPosts.CountAsync(p => p.GroupId == id);
        var memberCount = await _db.GroupMembers.CountAsync(m => m.GroupId == id);
        var joinedByMe = await _db.GroupMembers.AnyAsync(m => m.GroupId == id && m.UserId == userId);

        return Ok(new CommunityGroupDto(
            group.Id, group.Name, group.Description, group.Icon, group.IsActive,
            group.CreatedAt, group.TargetCountry, group.TargetCity, postCount,
            memberCount, joinedByMe));
    }

    [HttpDelete("admin/groups/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminDeleteGroup(Guid id)
    {
        var group = await _db.CommunityGroups.FindAsync(id);
        if (group is null)
            return NotFound(new { message = "Group not found." });

        _db.CommunityGroups.Remove(group);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ── Helpers ──────────────────────────────────────────────

    private static bool IsInMemoryDatabase(ApplicationDbContext db) =>
        db.Database.ProviderName?.Contains("InMemory", StringComparison.Ordinal) == true;

    private static GroupPostDto ToPostDto(GroupPost p, Guid currentUserId) =>
        new(
            p.Id,
            p.GroupId,
            p.AuthorId,
            p.Author.Name,
            p.Author.ProviderProfile?.ProfileImageUrl,
            p.Content,
            p.CreatedAt,
            p.Latitude,
            p.Longitude,
            p.City,
            p.Country,
            p.Likes.Count,
            p.Comments.Count,
            p.Likes.Any(l => l.UserId == currentUserId)
        );

    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = DegreesToRadians(lat2 - lat1);
        var dLon = DegreesToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegreesToRadians(lat1)) * Math.Cos(DegreesToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        return EarthRadiusKm * 2.0 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private static double DegreesToRadians(double degrees) => degrees * (Math.PI / 180.0);

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
