import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Post, PostComment, LikeResult } from './post.service';

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
  targetCountry: string | null;
  targetCity: string | null;
  postCount: number;
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  icon?: string;
  targetCountry?: string;
  targetCity?: string;
}

export interface UpdateGroupPayload extends CreateGroupPayload {
  isActive?: boolean;
}

interface GroupPostDto {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  likesCount: number;
  commentsCount: number;
  isLikedByCurrentUser: boolean;
}

interface GroupPostCommentDto {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private readonly http = inject(HttpClient);

  getGroups(country?: string, city?: string): Observable<CommunityGroup[]> {
    const params: Record<string, string> = {};
    if (country) params['country'] = country;
    if (city) params['city'] = city;
    return this.http.get<CommunityGroup[]>('/api/community/groups', { params });
  }

  // ── Group Posts ──

  getGroupPosts(groupId: string, geo?: { lat: number; lng: number; radiusKm: number }): Observable<Post[]> {
    let params = new HttpParams();
    if (geo) {
      params = params.set('lat', geo.lat).set('lng', geo.lng).set('radiusKm', geo.radiusKm);
    }
    return this.http
      .get<GroupPostDto[]>(`/api/community/groups/${groupId}/posts`, { params })
      .pipe(map((posts) => posts.map(this.mapGroupPost)));
  }

  createGroupPost(
    groupId: string,
    content: string,
    location?: { lat: number; lng: number },
  ): Observable<Post> {
    return this.http
      .post<GroupPostDto>(`/api/community/groups/${groupId}/posts`, {
        content,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
      })
      .pipe(map(this.mapGroupPost));
  }

  toggleGroupPostLike(postId: string): Observable<LikeResult> {
    return this.http
      .post<{ likesCount: number; isLikedByCurrentUser: boolean }>(
        `/api/community/posts/${postId}/like`,
        {},
      )
      .pipe(map((r) => ({ liked: r.isLikedByCurrentUser, likeCount: r.likesCount })));
  }

  getGroupPostComments(postId: string): Observable<PostComment[]> {
    return this.http
      .get<GroupPostCommentDto[]>(`/api/community/posts/${postId}/comments`)
      .pipe(map((comments) => comments.map(this.mapGroupComment)));
  }

  addGroupPostComment(postId: string, content: string): Observable<PostComment> {
    return this.http
      .post<GroupPostCommentDto>(`/api/community/posts/${postId}/comments`, { content })
      .pipe(map(this.mapGroupComment));
  }

  // ── Admin endpoints ──

  adminGetGroups(): Observable<CommunityGroup[]> {
    return this.http.get<CommunityGroup[]>('/api/community/admin/groups');
  }

  adminGetGroup(id: string): Observable<CommunityGroup> {
    return this.http.get<CommunityGroup>(`/api/community/admin/groups/${id}`);
  }

  createGroup(payload: CreateGroupPayload): Observable<CommunityGroup> {
    return this.http.post<CommunityGroup>('/api/community/admin/groups', payload);
  }

  updateGroup(id: string, payload: UpdateGroupPayload): Observable<CommunityGroup> {
    return this.http.put<CommunityGroup>(`/api/community/admin/groups/${id}`, payload);
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`/api/community/admin/groups/${id}`);
  }

  // ── Mappers ──

  private mapGroupPost(p: GroupPostDto): Post {
    return {
      id: p.id,
      userId: p.authorId,
      userName: p.authorName,
      content: p.content,
      imageUrl: null,
      likeCount: p.likesCount,
      commentCount: p.commentsCount,
      likedByMe: p.isLikedByCurrentUser,
      createdAt: p.createdAt,
      authorRole: '',
      authorIsApprovedProvider: false,
      communityGroupId: p.groupId,
      category: null,
    };
  }

  private mapGroupComment(c: GroupPostCommentDto): PostComment {
    return {
      id: c.id,
      userId: c.authorId,
      userName: c.authorName,
      content: c.content,
      createdAt: c.createdAt,
    };
  }
}
