import type { CommentDto } from "../../types/api";

/** Insert a new comment into the tree. Top-level comments are appended to the root array;
 *  replies are appended to the matching parent's `replies` list. */
export function insertCommentTree(
  tree: CommentDto[],
  comment: CommentDto,
): CommentDto[] {
  if (!comment.parentCommentId) {
    return [...tree, comment];
  }
  return tree.map((c) => {
    if (c.id === comment.parentCommentId) {
      return { ...c, replies: [...c.replies, comment] };
    }
    return c;
  });
}

/** Replace a temporary (optimistic) comment with the real one returned by the server. */
export function replaceTempCommentInTree(
  tree: CommentDto[],
  tempId: string,
  real: CommentDto,
): CommentDto[] {
  return tree.map((c) => {
    if (c.id === tempId) return real;
    if (c.replies.length > 0) {
      const newReplies = c.replies.map((r) => (r.id === tempId ? real : r));
      if (newReplies !== c.replies) return { ...c, replies: newReplies };
    }
    return c;
  });
}

/** Remove a comment (and its replies) from the tree by id. */
export function removeCommentFromTree(
  tree: CommentDto[],
  id: string,
): CommentDto[] {
  return tree
    .filter((c) => c.id !== id)
    .map((c) => ({
      ...c,
      replies: c.replies.filter((r) => r.id !== id),
    }));
}

/** Optimistically flip `likedByMe` and adjust `likeCount` by ±1. */
export function toggleLikeInTree(
  tree: CommentDto[],
  commentId: string,
): CommentDto[] {
  return tree.map((c) => {
    if (c.id === commentId) {
      return {
        ...c,
        likedByMe: !c.likedByMe,
        likeCount: c.likedByMe ? Math.max(0, c.likeCount - 1) : c.likeCount + 1,
      };
    }
    if (c.replies.length > 0) {
      const newReplies = c.replies.map((r) => {
        if (r.id === commentId) {
          return {
            ...r,
            likedByMe: !r.likedByMe,
            likeCount: r.likedByMe ? Math.max(0, r.likeCount - 1) : r.likeCount + 1,
          };
        }
        return r;
      });
      return { ...c, replies: newReplies };
    }
    return c;
  });
}

/** Reconcile the server's authoritative like state after API response. */
export function setLikeStateInTree(
  tree: CommentDto[],
  commentId: string,
  liked: boolean,
  likeCount: number,
): CommentDto[] {
  return tree.map((c) => {
    if (c.id === commentId) return { ...c, likedByMe: liked, likeCount };
    if (c.replies.length > 0) {
      const newReplies = c.replies.map((r) =>
        r.id === commentId ? { ...r, likedByMe: liked, likeCount } : r,
      );
      return { ...c, replies: newReplies };
    }
    return c;
  });
}

/** Patch edited comment content + editedAt in the tree. */
export function editCommentInTree(
  tree: CommentDto[],
  commentId: string,
  content: string,
  editedAt: string,
): CommentDto[] {
  return tree.map((c) => {
    if (c.id === commentId) return { ...c, content, editedAt };
    if (c.replies.length > 0) {
      const newReplies = c.replies.map((r) =>
        r.id === commentId ? { ...r, content, editedAt } : r,
      );
      return { ...c, replies: newReplies };
    }
    return c;
  });
}

/** Count how many comments a deletion removes (1 + replies count). */
export function countSubtree(tree: CommentDto[], id: string): number {
  for (const c of tree) {
    if (c.id === id) return 1 + c.replies.length;
    for (const r of c.replies) {
      if (r.id === id) return 1;
    }
  }
  return 1;
}

/** Highlight @mention tokens in a content string, returning segments. */
export function parseMentions(
  text: string,
): Array<{ type: "text" | "mention"; value: string }> {
  const parts = text.split(/(@[\p{L}\p{N}_]+)/gu);
  return parts.map((p) => ({
    type: p.startsWith("@") ? "mention" : "text",
    value: p,
  }));
}
