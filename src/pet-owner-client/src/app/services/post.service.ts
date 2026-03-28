import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  communityGroupId: string | null;
  category: string | null;
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

export interface GeoFilter {
  lat: number;
  lng: number;
  radiusKm: number;
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly http = inject(HttpClient);

  getFeed(page = 1, groupId?: string | null, geo?: GeoFilter, category?: string | null): Observable<Post[]> {
    let params = new HttpParams().set('page', page);
    if (groupId) params = params.set('groupId', groupId);
    if (category) params = params.set('category', category);
    if (geo) {
      params = params
        .set('lat', geo.lat)
        .set('lng', geo.lng)
        .set('radiusKm', geo.radiusKm);
    }
    return this.http.get<Post[]>('/api/posts/feed', { params });
  }

  create(
    content: string,
    imageUrl?: string,
    groupId?: string | null,
    location?: { lat: number; lng: number; city?: string },
  ): Observable<Post> {
    return this.http.post<Post>('/api/posts', {
      content,
      imageUrl: imageUrl || null,
      communityGroupId: groupId || null,
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
      city: location?.city ?? null,
    });
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
