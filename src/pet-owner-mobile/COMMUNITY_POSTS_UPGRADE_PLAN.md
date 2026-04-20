# Community Posts Upgrade — Image Uploads + Threaded Comments

> Status: Plan only. No `.ts/.tsx/.cs` files will be edited until this document is approved.

This plan upgrades the existing global Community feed in [`CommunityScreen.tsx`](src/pet-owner-mobile/src/screens/community/CommunityScreen.tsx) along two axes:

1. **Part A — Image attachments on posts.** End-to-end image picker → upload → render with full-screen lightbox.
2. **Part B — Facebook-grade threaded comments.** Bottom-sheet UX, single-level reply threading, comment likes, edit/delete own comments, `@`-mention parsing, optimistic updates, and push notifications.

The two parts are independent and can ship separately, but they share the bottom-sheet rewrite of `PostCard` so it is cheaper to ship them in one PR.

---

## 0. Goals & Decisions Snapshot

- **Reuse existing infra wherever possible.** The blob storage upload pipeline is already production-grade — see [`FilesController.UploadImage`](src/PetOwner.Api/Controllers/FilesController.cs) returning `{ Url, ThumbnailUrl, SizeBytes }` and [`filesApi.uploadImage`](src/pet-owner-mobile/src/api/client.ts) that wraps it with FormData. We do **not** add a new endpoint for post images.
- **Single image per post in v1.** No carousels, no video. Carousels are tagged as a deliberate v2 follow-up at the bottom of this document.
- **Threaded comments are exactly one level deep.** Top-level comment + replies. No reply-to-reply. This matches Instagram and ~95% of Facebook usage and avoids unbounded indentation on small phones.
- **Backwards-compatible API for posts.** No change to `POST /api/posts` shape — `ImageUrl` already lives on `CreatePostDto`. Comment endpoints are extended additively (new optional fields + new sibling endpoints), so the in-flight mobile build keeps working during rollout.
- **i18n parity.** Every new copy string lands in both `he-IL` and `en-US` halves of [`i18n/index.ts`](src/pet-owner-mobile/src/i18n/index.ts). RTL is non-negotiable: avatars and bubbles must mirror.
- **No schema breakage for existing comments.** New columns on `PostComments` are nullable / default-zero so existing rows keep working without backfill.

---

# Part A — Image Uploads on Posts

## A.1 — Backend status: nothing to change

The data model already supports images:

```7:8:src/PetOwner.Data/Models/Post.cs
public string Content { get; set; } = null!;
public string? ImageUrl { get; set; }
```

The DTO already accepts the URL on create:

```3:9:src/PetOwner.Api/DTOs/PostDto.cs
public record CreatePostDto(
    string Content,
    string? ImageUrl,
    double? Latitude = null,
    double? Longitude = null,
    string? City = null
);
```

And the create endpoint already persists it:

```71:79:src/PetOwner.Api/Controllers/PostsController.cs
var post = new Post
{
    UserId = userId,
    Content = dto.Content.Trim(),
    ImageUrl = dto.ImageUrl?.Trim(),
    Latitude = dto.Latitude,
    Longitude = dto.Longitude,
    City = dto.City?.Trim(),
};
```

So Part A is **mobile-only work**.

## A.2 — Mobile: composer with image picker

All edits are inside [`CommunityScreen.tsx`](src/pet-owner-mobile/src/screens/community/CommunityScreen.tsx). The composer block lives at lines `502-560` today.

### New local state

```ts
const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
const [uploadingImage, setUploadingImage] = useState(false);
```

### New helpers (top of `CommunityScreen.tsx`)

```ts
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import { filesApi } from "../../api/client";

const MAX_IMAGE_MB = 10; // matches BlobStorageSettings.MaxFileSizeMb

async function pickFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  return r.canceled ? null : r.assets[0].uri;
}

async function pickFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const r = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  return r.canceled ? null : r.assets[0].uri;
}
```

### Composer UI changes

Inside the `composerOpen ? (...)` branch, immediately under the `TextInput`, add:

- A horizontal row of two icon buttons: `camera-outline` and `image-outline`. Both call the helpers above and `setPickedImageUri(uri)`.
- If `pickedImageUri` is non-null, render a `100% × 180px` thumbnail with a small absolute-positioned circular `close` button in the top corner that clears the URI.

Visual spec:

```
┌──────────────────────────────────────┐
│  [textarea — multiline placeholder]  │
├──────────────────────────────────────┤
│  📷  🖼   ─────────  [Cancel] [Post] │
├──────────────────────────────────────┤
│  ┌─ 4:3 thumbnail ─┐                 │
│  │                 │  [×]            │
│  └─────────────────┘                 │
└──────────────────────────────────────┘
```

### Updated `handlePublish`

```ts
const handlePublish = async () => {
  const content = newPostContent.trim();
  if ((!content && !pickedImageUri) || posting) return;
  setPosting(true);
  try {
    let imageUrl: string | undefined;
    if (pickedImageUri) {
      setUploadingImage(true);
      const up = await filesApi.uploadImage(pickedImageUri, "posts");
      imageUrl = up.url;
      setUploadingImage(false);
    }
    const post = await postsApi.create({
      content,
      imageUrl,
      category: channel === "lost_and_found" ? "lost_and_found" : undefined,
    } as any);
    setPosts((prev) => [post, ...prev]);
    setNewPostContent("");
    setPickedImageUri(null);
    setComposerOpen(false);
  } catch {
    Alert.alert(t("errorTitle"), t("postError"));
  } finally {
    setUploadingImage(false);
    setPosting(false);
  }
};
```

Notes:

- Allow empty text if there's an image (Instagram-style). Keep the existing "must have content" rule otherwise.
- The publish button text becomes `t("uploadingImage")` while `uploadingImage` is true.
- The "fab cancel" button additionally clears `pickedImageUri`.

### Update `CreatePostDto` TypeScript type

In [`src/pet-owner-mobile/src/types/api.ts`](src/pet-owner-mobile/src/types/api.ts), make sure `CreatePostDto` includes `imageUrl?: string`. (If already present, no-op.)

## A.3 — Mobile: render the actual image

Today `PostCard` ignores `post.imageUrl` and shows a placeholder:

```152:156:src/pet-owner-mobile/src/screens/community/CommunityScreen.tsx
{post.imageUrl && (
  <View style={styles.imagePlaceholder}>
    <Ionicons name="image-outline" size={32} color={colors.textMuted} />
  </View>
)}
```

Replace with a real `<Image>` wrapped in a `Pressable` that opens a lightbox modal:

```tsx
const [lightboxOpen, setLightboxOpen] = useState(false);

{post.imageUrl && (
  <Pressable onPress={() => setLightboxOpen(true)}>
    <Image
      source={{ uri: post.imageUrl }}
      style={styles.postImage}
      resizeMode="cover"
    />
  </Pressable>
)}
```

Where `styles.postImage` = `{ width: "100%", aspectRatio: 4 / 3, borderRadius: 12, marginTop: 12, backgroundColor: colors.surfaceSecondary }`.

### Lightbox component

A new tiny component `src/pet-owner-mobile/src/components/ImageLightbox.tsx`:

- `Modal` with `transparent + animationType="fade"`, full-screen black backdrop.
- `Pressable` backdrop closes the modal.
- Centered `<Image>` at `{ width: "100%", height: "100%", resizeMode: "contain" }`.
- Top-right close button (`Ionicons name="close-circle"`) for accessibility.
- Pinch-zoom is **out of scope for v1**; we ship "tap to enlarge, tap to dismiss" only. Pinch can be added later via `react-native-gesture-handler` (already in deps).

## A.4 — i18n keys (Part A)

Add to both halves of [`src/pet-owner-mobile/src/i18n/index.ts`](src/pet-owner-mobile/src/i18n/index.ts):

| key | he-IL | en-US |
|-----|-------|-------|
| `addPhoto` | "הוסף תמונה" | "Add photo" |
| `takePhoto` | "צלם תמונה" | "Take photo" |
| `chooseFromLibrary` | "בחר מהגלריה" | "Choose from library" |
| `removePhoto` | "הסר תמונה" | "Remove photo" |
| `uploadingImage` | "מעלה תמונה..." | "Uploading..." |
| `imageTooLarge` | "התמונה גדולה מדי (מקס׳ 10MB)" | "Image too large (max 10MB)" |
| `tapToView` | "הקש להגדלה" | "Tap to view" |

## A.5 — Edge cases & failure modes (Part A)

| Case | Handling |
|------|----------|
| Permission denied (library or camera) | Show `Alert` with link to settings; do not silently fail |
| User picks a file > 10MB | Catch the 400 from `/files/upload/image`, show `t("imageTooLarge")`, keep composer open with the thumbnail still attached |
| Upload succeeds but `posts.create` fails | Best-effort `filesApi.delete(blobName)` from the returned URL; otherwise the orphan blob is harmless and gets cleaned by retention policy |
| Slow network | Disable both icon buttons + Publish + Cancel while `uploadingImage`; show inline `ActivityIndicator` next to icons |
| User taps Publish with empty text and no image | Button stays disabled (current behaviour preserved) |

---

# Part B — Threaded Comments (Facebook-grade)

## B.1 — Data model migration

### Schema changes

In [`src/PetOwner.Data/Models/Post.cs`](src/PetOwner.Data/Models/Post.cs) extend `PostComment`:

```csharp
public class PostComment
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public Guid? ParentCommentId { get; set; }   // NEW — null = top-level
    public string Content { get; set; } = null!;
    public int LikeCount { get; set; }            // NEW — denormalised
    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }       // NEW — null = never edited

    public Post Post { get; set; } = null!;
    public User User { get; set; } = null!;
    public PostComment? ParentComment { get; set; }   // NEW
    public ICollection<PostComment> Replies { get; set; } = new List<PostComment>(); // NEW
    public ICollection<PostCommentLike> Likes { get; set; } = new List<PostCommentLike>(); // NEW
}
```

And a new join entity in the same file (mirrors the existing `PostLike`):

```csharp
public class PostCommentLike
{
    public Guid CommentId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; }

    public PostComment Comment { get; set; } = null!;
    public User User { get; set; } = null!;
}
```

### `ApplicationDbContext`

In [`src/PetOwner.Data/ApplicationDbContext.cs`](src/PetOwner.Data/ApplicationDbContext.cs):

- Add `public DbSet<PostCommentLike> PostCommentLikes => Set<PostCommentLike>();`
- Extend the existing `modelBuilder.Entity<PostComment>` block (line ~732) to configure the self-referential `ParentComment` / `Replies` with `OnDelete(DeleteBehavior.Cascade)` so deleting a parent cascades to its replies.
- Add a new `modelBuilder.Entity<PostCommentLike>` block with composite key `{ CommentId, UserId }`, default `CreatedAt = SYSUTCDATETIME()`, indexed on `CommentId`.

### Migration

`dotnet ef migrations add AddCommentRepliesAndLikes -p src/PetOwner.Data -s src/PetOwner.Api`

The migration should:

1. Add three columns to `PostComments`: `ParentCommentId UNIQUEIDENTIFIER NULL`, `LikeCount INT NOT NULL DEFAULT 0`, `EditedAt DATETIME2 NULL`.
2. Add FK `PostComments.ParentCommentId → PostComments.Id` with `ON DELETE CASCADE`.
3. Create table `PostCommentLikes (CommentId, UserId, CreatedAt)` with composite PK + FKs.
4. No backfill needed — existing rows are valid as `ParentCommentId = NULL, LikeCount = 0`.

## B.2 — DTO changes

In [`src/PetOwner.Api/DTOs/PostDto.cs`](src/PetOwner.Api/DTOs/PostDto.cs):

```csharp
public record CommentDto(
    Guid Id,
    Guid? ParentCommentId,
    Guid UserId,
    string UserName,
    string Content,
    DateTime CreatedAt,
    DateTime? EditedAt,
    int LikeCount,
    bool LikedByMe,
    IReadOnlyList<CommentDto> Replies
);

public record CreateCommentDto(string Content, Guid? ParentCommentId = null);

public record EditCommentDto(string Content);
```

`CreateCommentDto` adds an optional `ParentCommentId`. Existing mobile clients that omit it remain compatible.

## B.3 — Endpoint changes

All inside [`src/PetOwner.Api/Controllers/PostsController.cs`](src/PetOwner.Api/Controllers/PostsController.cs).

### `GET /api/posts/{postId:guid}/comments` — return tree

Replace the current flat select (lines `137-144`) with:

```csharp
var userId = GetUserId();

var raw = await _db.PostComments
    .AsNoTracking()
    .Where(c => c.PostId == postId)
    .OrderBy(c => c.CreatedAt)
    .Select(c => new {
        c.Id, c.ParentCommentId, c.UserId, UserName = c.User.Name,
        c.Content, c.CreatedAt, c.EditedAt, c.LikeCount,
        LikedByMe = c.Likes.Any(l => l.UserId == userId)
    })
    .ToListAsync();

var byParent = raw
    .Where(c => c.ParentCommentId != null)
    .GroupBy(c => c.ParentCommentId!.Value)
    .ToDictionary(g => g.Key, g => g.ToList());

CommentDto Build(dynamic c) => new(
    c.Id, c.ParentCommentId, c.UserId, c.UserName, c.Content,
    c.CreatedAt, c.EditedAt, c.LikeCount, c.LikedByMe,
    (byParent.TryGetValue(c.Id, out var kids) ? kids.Select(Build).ToList() : new List<CommentDto>()));

var tree = raw.Where(c => c.ParentCommentId == null).Select(Build).ToList();
return Ok(tree);
```

(Real implementation will use a strongly-typed projection record — pseudo-`dynamic` only for illustration.)

### `POST /api/posts/{postId:guid}/comments` — accept `parentCommentId`

```csharp
public async Task<IActionResult> AddComment(Guid postId, [FromBody] CreateCommentDto dto)
{
    var userId = GetUserId();
    if (string.IsNullOrWhiteSpace(dto.Content))
        return BadRequest(new { message = "Comment content is required." });

    var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == postId);
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
    post.CommentCount++;                         // top-level + replies both bump the post counter
    await _db.SaveChangesAsync();

    var userName = await _db.Users.Where(u => u.Id == userId).Select(u => u.Name).FirstAsync();

    // Notifications: post author (always) + parent comment author (if reply, deduped) + @-mentions
    await NotifyCommentAsync(post, comment, userName);

    return Ok(new CommentDto(
        comment.Id, comment.ParentCommentId, comment.UserId, userName,
        comment.Content, comment.CreatedAt, comment.EditedAt,
        0, false, Array.Empty<CommentDto>()));
}
```

### `PATCH /api/posts/comments/{commentId:guid}` — edit own

```csharp
[HttpPatch("comments/{commentId:guid}")]
public async Task<IActionResult> EditComment(Guid commentId, [FromBody] EditCommentDto dto)
{
    var userId = GetUserId();
    if (string.IsNullOrWhiteSpace(dto.Content))
        return BadRequest(new { message = "Comment content is required." });

    var comment = await _db.PostComments.FirstOrDefaultAsync(c => c.Id == commentId && c.UserId == userId);
    if (comment is null) return NotFound();

    comment.Content = dto.Content.Trim();
    comment.EditedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();

    return Ok(new { comment.Id, comment.Content, comment.EditedAt });
}
```

### `POST /api/posts/comments/{commentId:guid}/like` — toggle like

```csharp
[HttpPost("comments/{commentId:guid}/like")]
public async Task<IActionResult> ToggleCommentLike(Guid commentId)
{
    var userId = GetUserId();
    var comment = await _db.PostComments.FirstOrDefaultAsync(c => c.Id == commentId);
    if (comment is null) return NotFound();

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
```

### `DELETE /api/posts/comments/{commentId:guid}` — already exists

Keep current behaviour, but: if a top-level comment is deleted and has replies, decrement `post.CommentCount` by `1 + replies.Count` (or count children before cascade). Add a unit test.

### `NotifyCommentAsync` helper

Lives in `PostsController` (or migrate to a `PostNotificationService` if it grows). Logic:

1. Always notify the **post author** (skip if commenter is post author).
2. If reply, additionally notify the **parent comment author** (skip if same as post author or commenter).
3. Parse `@name` tokens from `comment.Content` against post participants (post author + previous commenters); push one notification per matched user, deduped against #1 and #2.

Each notification routes through the existing [`NotificationService.CreateAsync`](src/PetOwner.Api/Services/NotificationService.cs) so push + SignalR + DB row all happen atomically. Use `Type = "community"` so it gates on the user's `community` push preference (per [`PUSH_NOTIFICATIONS_PLAN.md`](src/pet-owner-mobile/PUSH_NOTIFICATIONS_PLAN.md)).

Notification copy keys (added to i18n):

- `notifPostCommented` — "{name} commented on your post"
- `notifCommentReplied` — "{name} replied to your comment"
- `notifMentioned` — "{name} mentioned you in a comment"

## B.4 — `postsApi` extensions

In [`src/pet-owner-mobile/src/api/client.ts`](src/pet-owner-mobile/src/api/client.ts), extend the `postsApi` block:

```ts
export const postsApi = {
  // ...existing...
  addComment: (postId: string, data: CreateCommentDto) =>
    apiClient.post<CommentDto>(`/posts/${postId}/comments`, data).then((r) => r.data),
  editComment: (commentId: string, content: string) =>
    apiClient.patch<{ id: string; content: string; editedAt: string }>(
      `/posts/comments/${commentId}`,
      { content },
    ).then((r) => r.data),
  deleteComment: (commentId: string) =>
    apiClient.delete(`/posts/comments/${commentId}`),
  toggleCommentLike: (commentId: string) =>
    apiClient
      .post<{ liked: boolean; likeCount: number }>(`/posts/comments/${commentId}/like`)
      .then((r) => r.data),
};
```

`CreateCommentDto` in [`src/pet-owner-mobile/src/types/api.ts`](src/pet-owner-mobile/src/types/api.ts) becomes:

```ts
export interface CreateCommentDto {
  content: string;
  parentCommentId?: string;
}

export interface CommentDto {
  id: string;
  parentCommentId: string | null;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  likeCount: number;
  likedByMe: boolean;
  replies: CommentDto[];
}
```

## B.5 — New mobile component: `CommentsBottomSheet.tsx`

File: `src/pet-owner-mobile/src/screens/community/CommentsBottomSheet.tsx`

### Props

```ts
type Props = {
  postId: string;
  postAuthorId: string;
  postAuthorName: string;
  visible: boolean;
  onClose: () => void;
  onCommentCountChange: (delta: number) => void; // bubble up to PostCard so the post counter stays correct
};
```

### Layout

Modal with `transparent + animationType="slide"` from the bottom. The sheet itself is `height: 90%` of the screen, rounded top corners, with this internal structure:

```
┌─ drag handle ──────────────────────┐
│  Comments (24)                  ✕  │
├────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ FlashList of top-level      │   │
│  │ comments. Each renders as a │   │
│  │ <CommentRow/> with optional │   │
│  │ <CommentRow/> children      │   │
│  │ indented 36px on the start  │   │
│  │ side.                       │   │
│  └─────────────────────────────┘   │
├────────────────────────────────────┤
│  [💬 Replying to @Dana   ✕]       │  ← only when replying
│  [avatar] [textarea          ][↗]  │  ← composer pinned to bottom
└────────────────────────────────────┘
```

Wrap the sheet in `KeyboardAvoidingView` (`behavior="padding"` on iOS, `"height"` on Android) so the composer never gets covered.

### `CommentRow` sub-component

Each row shows:

- 28px circular avatar with initials (existing pattern from `PostCard`).
- A bubble container with rounded background `colors.surfaceTertiary`:
  - First line: bold `userName` + provider badge if applicable + `· edited` if `editedAt != null`.
  - Body: `content` with `@name` tokens highlighted via a regex split + colored span.
- Action row underneath the bubble (small, muted): `relativeTime · Like (N) · Reply` and `· Edit · Delete` for the comment owner.
- Long-press on own comment opens a native `ActionSheet` ("Edit", "Delete", "Cancel"). Web fallback = inline buttons.

Visual difference for replies: row is rendered with `marginStart: 36` and a smaller `26px` avatar. No third-level indent — replies-of-replies are blocked at the API.

### State machine

```ts
const [comments, setComments] = useState<CommentDto[]>([]);
const [loading, setLoading] = useState(true);
const [replyingTo, setReplyingTo] = useState<{
  commentId: string;
  userName: string;
} | null>(null);
const [draft, setDraft] = useState("");
const [submitting, setSubmitting] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
```

### Submit logic (optimistic)

```ts
const submit = async () => {
  const content = draft.trim();
  if (!content || submitting) return;
  const tempId = `temp-${Date.now()}`;
  const optimistic: CommentDto = {
    id: tempId, parentCommentId: replyingTo?.commentId ?? null,
    userId: me.id, userName: me.name, content,
    createdAt: new Date().toISOString(), editedAt: null,
    likeCount: 0, likedByMe: false, replies: [],
  };
  setComments((prev) => insertCommentTree(prev, optimistic));
  setDraft("");
  const wasReplying = !!replyingTo;
  setReplyingTo(null);
  onCommentCountChange(1);

  setSubmitting(true);
  try {
    const real = await postsApi.addComment(postId, {
      content,
      parentCommentId: optimistic.parentCommentId ?? undefined,
    });
    setComments((prev) => replaceTempCommentInTree(prev, tempId, real));
  } catch {
    setComments((prev) => removeCommentFromTree(prev, tempId));
    onCommentCountChange(-1);
    if (wasReplying) setReplyingTo(replyingTo);
    setDraft(content);
    Alert.alert(t("errorTitle"), t("commentError"));
  }
  setSubmitting(false);
};
```

`insertCommentTree`, `replaceTempCommentInTree`, `removeCommentFromTree`, and `toggleLikeInTree` are pure helpers exported from a sibling `commentTree.ts`. Keeping them pure makes them trivially unit-testable.

### Toggle like (optimistic)

```ts
const toggleLike = async (commentId: string) => {
  setComments((prev) => toggleLikeInTree(prev, commentId)); // flips likedByMe + adjusts likeCount by ±1
  try {
    const r = await postsApi.toggleCommentLike(commentId);
    setComments((prev) => setLikeStateInTree(prev, commentId, r.liked, r.likeCount));
  } catch {
    setComments((prev) => toggleLikeInTree(prev, commentId)); // rollback
  }
};
```

### Edit flow

Tap "Edit" on own comment → that row becomes a small inline editor (`TextInput` + Save/Cancel). On save: call `postsApi.editComment`, then patch the tree with `editedAt`. Optimistic update is fine; on error, restore prior content.

### Delete flow

Tap "Delete" → `Alert.alert` confirm with `t("confirmDeleteComment")` → on confirm, optimistically remove from tree (if top-level with replies, remove subtree and bubble `onCommentCountChange(-(1 + replies.length))`), then call `postsApi.deleteComment`. On 404, show the comment was already gone (silent). On other error, re-insert and toast.

### `@-mention` highlighting

Pure render helper:

```ts
function renderContent(text: string, accent: string, bodyColor: string) {
  const parts = text.split(/(@[\p{L}\p{N}_]+)/gu);
  return parts.map((p, i) =>
    p.startsWith("@")
      ? <Text key={i} style={{ color: accent, fontWeight: "600" }}>{p}</Text>
      : <Text key={i} style={{ color: bodyColor }}>{p}</Text>
  );
}
```

No autocomplete in v1 — the user just types `@Name` and the parser highlights it. Backend mention notifications match `@token` against the post-participant set.

### Live updates via SignalR

Existing [`signalr.ts`](src/pet-owner-mobile/src/services/signalr.ts) already wires a single connection. Add two new events emitted from the backend hub:

- `CommentAdded(postId, CommentDto)` — append/insert into tree if `postId` matches the open sheet, dedupe against optimistic temp IDs by `id`.
- `CommentDeleted(postId, commentId)` — remove from tree.
- `CommentLikeChanged(commentId, likeCount)` — patch counts (don't touch `likedByMe`).

If extending the hub is out of scope for this PR, fall back to a 15s polling refresh while the sheet is open. Document this clearly in the implementation comment so it's removed once SignalR support lands.

## B.6 — Wire-up in `PostCard`

Replace the inline `commentsOpen` block (lines `187-244`) with:

```tsx
const [sheetOpen, setSheetOpen] = useState(false);
// ...
<Pressable onPress={() => setSheetOpen(true)} style={[styles.actionBtn, rtlRow]}>
  <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
  <Text style={styles.actionText}>{post.commentCount}</Text>
</Pressable>

<CommentsBottomSheet
  visible={sheetOpen}
  onClose={() => setSheetOpen(false)}
  postId={post.id}
  postAuthorId={post.userId}
  postAuthorName={post.userName}
  onCommentCountChange={(d) => {
    post.commentCount = Math.max(0, post.commentCount + d);
    /* no setState needed: the parent's `posts` array carries the canonical count and gets refreshed
       on next feed pull; we mutate so the on-screen counter stays in sync without a full re-render. */
  }}
/>
```

The chat-bubble icon variant (`chatbubble` filled vs `chatbubble-outline`) is no longer needed because the bottom sheet itself signals "open" state.

Also drop the now-unused styles: `commentSection`, `commentItem`, `commentAvatar*`, `commentHeader`, `commentAuthor`, `commentTime`, `commentContent`, `commentInputRow`, `commentInput`, `commentSendBtn`. They move into the new bottom-sheet component (or get re-derived there).

## B.7 — i18n keys (Part B)

| key | he-IL | en-US |
|-----|-------|-------|
| `commentsCountTitle` | "תגובות ({{count}})" | "Comments ({{count}})" |
| `reply` | "הגב" | "Reply" |
| `replyingTo` | "מגיב ל-@{{name}}" | "Replying to @{{name}}" |
| `like` | "אהבתי" | "Like" |
| `liked` | "אהבתי" | "Liked" |
| `edit` | "ערוך" | "Edit" |
| `edited` | "נערך" | "edited" |
| `commentDeleted` | "התגובה נמחקה" | "Comment deleted" |
| `confirmDeleteComment` | "למחוק את התגובה?" | "Delete this comment?" |
| `commentError` | "לא הצלחנו לפרסם את התגובה" | "We couldn't post your comment" |
| `notifPostCommented` | "{{name}} הגיב לפוסט שלך" | "{{name}} commented on your post" |
| `notifCommentReplied` | "{{name}} הגיב לתגובה שלך" | "{{name}} replied to your comment" |
| `notifMentioned` | "{{name}} הזכיר אותך" | "{{name}} mentioned you" |
| `noCommentsYet` | "אין תגובות עדיין. תהיה הראשון!" | "No comments yet. Be the first!" |

## B.8 — Edge cases & failure modes (Part B)

| Case | Handling |
|------|----------|
| User taps Reply on a reply | Reply mode targets the **top-level parent** of that reply, not the reply itself (UX matches Instagram). UI shows `Replying to @<reply-author-name>` but `parentCommentId` set to the top-level. |
| Rapid double-tap Like | Optimistic toggle is idempotent for the local state, server-side `ToggleCommentLike` is also idempotent per request — the second tap just flips back. |
| Editing to empty content | Treat as cancel (button stays disabled when trimmed empty). |
| Deleting a top-level with N replies | Server cascades, mobile decrements `post.commentCount` by `1 + N`. Tests cover N=0, N=3. |
| Network drops mid-typing | Composer keeps draft text in local state; restored on reopen via the optimistic-fail path. Optionally persist in `AsyncStorage` keyed by `postId` (nice-to-have, not required). |
| Push preference `community = false` | `NotificationService` already gates here per push plan — no extra work. |
| Mention to non-existent name | Highlighted but no notification fired (matcher returns no users). Silent by design. |

## B.9 — Test plan

Backend (xUnit if existing test project; otherwise integration tests via WebApplicationFactory):

- `AddComment_TopLevel_IncrementsPostCount`
- `AddComment_AsReply_StoresParentId`
- `AddComment_RejectsReplyToReply`
- `EditComment_SetsEditedAt`
- `EditComment_OtherUser_Returns404`
- `ToggleCommentLike_ReturnsNewState_AndCount`
- `DeleteComment_TopLevelWithReplies_DecrementsByTotal`
- `GetComments_ReturnsTreeOrderedByCreatedAt`

Mobile (Jest, against the pure helpers in `commentTree.ts`):

- `insertCommentTree` — top-level append
- `insertCommentTree` — appended into `replies` of correct parent
- `replaceTempCommentInTree` — preserves order
- `toggleLikeInTree` — flips `likedByMe` + adjusts count
- `removeCommentFromTree` — top-level removes subtree

---

# Rollout Order

1. **PR #1** — Part A (image upload + lightbox). No backend, no migration. Self-contained, low risk.
2. **PR #2** — Part B backend (model + migration + DTOs + endpoints + notifications). Server alone, mobile keeps using flat `getComments` because the new shape is a strict superset and the mobile parser falls back gracefully (additive fields).
3. **PR #3** — Part B mobile (`CommentsBottomSheet`, `commentTree.ts`, wire-up in `PostCard`, i18n).
4. **PR #4** — SignalR `CommentAdded` / `CommentDeleted` / `CommentLikeChanged` events (or skip if extension is risky and stay on polling).

Each PR is independently revertable.

---

# Out of scope (deliberately deferred)

- Multi-image carousels per post.
- Video posts.
- Reactions beyond a single Like (no Love/Laugh/Care).
- Threaded comments deeper than one reply level.
- Real-time `@`-autocomplete with avatar dropdown.
- Comment translation toggle.
- Admin moderation tools (edit/delete others) — admins can already delete via existing admin endpoints if needed.

# Open questions

1. Should liking a post or comment fire a push notification, or is that too noisy? (Default proposal: comments yes, likes no.)
2. Comment edit history — keep just `EditedAt`, or store an `EditHistory` table for audit? (v1: just `EditedAt`.)
3. Should the bottom sheet stay open across app backgrounding? (v1: closes on background like other modals.)
