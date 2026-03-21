import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Post {
  id: string;
  userId: string;
  userName: string;
  content: string;
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string;
  authorRole: string;
  authorIsApprovedProvider: boolean;
}

export interface PostComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface LikeResult {
  liked: boolean;
  likeCount: number;
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly http = inject(HttpClient);

  getFeed(page = 1): Observable<Post[]> {
    return this.http.get<Post[]>(`/api/posts/feed?page=${page}`);
  }

  create(content: string, imageUrl?: string): Observable<Post> {
    return this.http.post<Post>('/api/posts', { content, imageUrl: imageUrl || null });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/posts/${id}`);
  }

  toggleLike(postId: string): Observable<LikeResult> {
    return this.http.post<LikeResult>(`/api/posts/${postId}/like`, {});
  }

  getComments(postId: string): Observable<PostComment[]> {
    return this.http.get<PostComment[]>(`/api/posts/${postId}/comments`);
  }

  addComment(postId: string, content: string): Observable<PostComment> {
    return this.http.post<PostComment>(`/api/posts/${postId}/comments`, { content });
  }

  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`/api/posts/comments/${commentId}`);
  }
}
