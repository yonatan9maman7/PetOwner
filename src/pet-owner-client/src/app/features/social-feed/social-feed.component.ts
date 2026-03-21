import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Post, PostComment, PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { FileUploadService } from '../../services/file-upload.service';
import { ToastService } from '../../services/toast.service';
import { MapService, UserMiniProfile } from '../../services/map.service';

@Component({
  selector: 'app-social-feed',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-sky-50 to-white px-4 py-8">
      <div class="max-w-xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold text-slate-900">Community</h1>
          <p class="mt-1 text-sm text-slate-500">Share moments with fellow pet lovers</p>
        </div>

        <!-- Create Post -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <form (ngSubmit)="createPost()">
            <textarea
              [(ngModel)]="newPostContent"
              name="content"
              rows="3"
              placeholder="What's on your mind? Share a pet story..."
              class="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            ></textarea>

            @if (uploadedImageUrl()) {
              <div class="relative mt-3 inline-block">
                <img [src]="uploadedImageUrl()" class="h-24 rounded-lg object-cover" alt="Upload preview" />
                <button type="button" (click)="removeImage()"
                        class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">
                  &times;
                </button>
              </div>
            }

            <div class="flex items-center justify-between mt-3">
              <label class="flex items-center gap-1.5 text-sm text-slate-400 hover:text-sky-500 cursor-pointer transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ uploading() ? 'Uploading...' : 'Photo' }}
                <input type="file" accept="image/*" class="hidden" (change)="onImageSelected($event)" [disabled]="uploading()" />
              </label>
              <button
                type="submit"
                [disabled]="posting() || !newPostContent().trim()"
                class="px-5 py-2 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {{ posting() ? 'Posting...' : 'Post' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Feed -->
        @if (feedLoading()) {
          <div class="flex justify-center py-12">
            <svg class="w-8 h-8 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        } @else if (posts().length === 0) {
          <div class="text-center py-16 text-slate-400">
            <div class="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3 text-3xl">&#x1F4AC;</div>
            <p class="font-medium">No posts yet</p>
            <p class="text-sm mt-1">Be the first to share something!</p>
          </div>
        } @else {
          <div class="space-y-4">
            @for (post of posts(); track post.id) {
              <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <!-- Post Header -->
                <div class="flex items-center gap-3 px-5 pt-4 pb-2">
                  <button
                    (click)="openMiniProfile(post.userId, $event)"
                    class="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-sm hover:ring-2 hover:ring-sky-300 transition-all cursor-pointer shrink-0"
                  >
                    {{ post.userName.charAt(0).toUpperCase() }}
                  </button>
                  <div class="flex-1 min-w-0">
                    <button
                      (click)="openMiniProfile(post.userId, $event)"
                      class="text-sm font-semibold text-slate-800 hover:text-sky-600 transition-colors cursor-pointer"
                    >
                      {{ post.userName }}
                    </button>
                    <p class="text-[11px] text-slate-400">{{ post.createdAt | date:'medium' }}</p>
                  </div>
                  @if (post.userId === currentUserId()) {
                    <button (click)="deletePost(post)" class="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  }
                </div>

                <!-- Post Content -->
                <div class="px-5 pb-3">
                  <p class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{{ post.content }}</p>
                </div>

                @if (post.imageUrl) {
                  <img [src]="post.imageUrl" class="w-full max-h-80 object-cover" [alt]="'Post by ' + post.userName" />
                }

                <!-- Actions -->
                <div class="flex items-center gap-1 px-5 py-3 border-t border-gray-50">
                  <button
                    (click)="toggleLike(post)"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    [class]="post.likedByMe ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'"
                  >
                    <svg class="w-4.5 h-4.5" [attr.fill]="post.likedByMe ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {{ post.likeCount || '' }}
                  </button>
                  <button
                    (click)="toggleComments(post)"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                  >
                    <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {{ post.commentCount || '' }}
                  </button>
                </div>

                <!-- Comments Section -->
                @if (expandedPostId() === post.id) {
                  <div class="border-t border-gray-100 bg-slate-50 px-5 py-4 space-y-3">
                    @if (commentsLoading()) {
                      <div class="flex justify-center py-2">
                        <svg class="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                      </div>
                    } @else {
                      @for (c of comments(); track c.id) {
                        <div class="flex gap-2.5">
                          <button
                            (click)="openMiniProfile(c.userId, $event)"
                            class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-500 flex-shrink-0 hover:ring-2 hover:ring-sky-300 transition-all cursor-pointer"
                          >
                            {{ c.userName.charAt(0).toUpperCase() }}
                          </button>
                          <div class="flex-1 min-w-0">
                            <div class="bg-white rounded-xl px-3 py-2">
                              <button
                                (click)="openMiniProfile(c.userId, $event)"
                                class="text-xs font-semibold text-slate-700 hover:text-sky-600 transition-colors cursor-pointer"
                              >
                                {{ c.userName }}
                              </button>
                              <p class="text-sm text-slate-600">{{ c.content }}</p>
                            </div>
                            <p class="text-[10px] text-slate-400 mt-0.5 px-1">{{ c.createdAt | date:'short' }}</p>
                          </div>
                        </div>
                      }
                    }

                    <!-- Add Comment -->
                    <form (ngSubmit)="submitComment(post)" class="flex gap-2 pt-1">
                      <input
                        [(ngModel)]="commentInput"
                        name="comment"
                        placeholder="Write a comment..."
                        class="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                      />
                      <button type="submit" [disabled]="!commentInput().trim()"
                              class="px-3 py-2 bg-sky-600 text-white text-sm rounded-xl hover:bg-sky-500 disabled:opacity-40 transition">
                        Send
                      </button>
                    </form>
                  </div>
                }
              </div>
            }

            <!-- Load More -->
            @if (hasMore()) {
              <button
                (click)="loadMore()"
                [disabled]="loadingMore()"
                class="w-full py-3 text-sm font-medium text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
              >
                {{ loadingMore() ? 'Loading...' : 'Load more' }}
              </button>
            }
          </div>
        }
      </div>
    </div>

    <!-- Mini Profile Popup (overlay) -->
    @if (miniProfile()) {
      <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4" (click)="closeMiniProfile()">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div
          class="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden animate-scaleIn"
          (click)="$event.stopPropagation()"
        >
          <!-- Header band -->
          <div class="h-20 bg-gradient-to-br from-sky-400 to-indigo-500"></div>

          <!-- Avatar -->
          <div class="flex justify-center -mt-10">
            <div class="w-20 h-20 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-md flex items-center justify-center">
              @if (miniProfile()!.profileImageUrl) {
                <img [src]="miniProfile()!.profileImageUrl" [alt]="miniProfile()!.name" class="w-full h-full object-cover" />
              } @else {
                <span class="text-2xl font-bold text-gray-400">{{ miniProfile()!.name.charAt(0).toUpperCase() }}</span>
              }
            </div>
          </div>

          <!-- Info -->
          <div class="px-6 pt-3 pb-5 text-center">
            <h3 class="text-lg font-bold text-slate-900">{{ miniProfile()!.name }}</h3>

            <div class="flex items-center justify-center gap-2 mt-1">
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [class]="miniProfile()!.isProvider ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'">
                {{ miniProfile()!.isProvider ? 'Pet Care Provider' : 'Pet Owner' }}
              </span>
              <span class="text-xs text-slate-400">
                Member since {{ miniProfile()!.memberSince | date:'MMM yyyy' }}
              </span>
            </div>

            @if (miniProfile()!.bio) {
              <p class="mt-3 text-sm text-slate-600 leading-relaxed">{{ miniProfile()!.bio }}</p>
            }

            @if (miniProfile()!.isProvider) {
              <div class="mt-4 flex items-center justify-center gap-4 text-sm">
                @if (miniProfile()!.averageRating) {
                  <div class="flex items-center gap-1">
                    <svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span class="font-semibold text-slate-700">{{ miniProfile()!.averageRating | number:'1.1-1' }}</span>
                    <span class="text-slate-400">({{ miniProfile()!.reviewCount }})</span>
                  </div>
                }
              </div>

              @if (miniProfile()!.services?.length) {
                <div class="flex flex-wrap justify-center gap-1.5 mt-3">
                  @for (svc of miniProfile()!.services!; track svc) {
                    <span class="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {{ svc }}
                    </span>
                  }
                </div>
              }
            }

            @if (miniProfile()!.id === currentUserId()) {
              <button
                (click)="goToMyProfile()"
                class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition-colors"
              >
                My profile
              </button>
            } @else if (miniProfile()!.isProvider) {
              <button
                (click)="viewApprovedProviderProfile(miniProfile()!.id)"
                class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition-colors"
              >
                View full provider profile
              </button>
            } @else {
              <p class="mt-4 text-xs text-slate-400">Public provider profile is not available for this member.</p>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-scaleIn {
      animation: scaleIn 0.2s ease-out;
    }
  `,
})
export class SocialFeedComponent implements OnInit {
  private readonly postService = inject(PostService);
  private readonly auth = inject(AuthService);
  private readonly fileUpload = inject(FileUploadService);
  private readonly toast = inject(ToastService);
  private readonly mapService = inject(MapService);
  private readonly router = inject(Router);

  posts = signal<Post[]>([]);
  feedLoading = signal(true);
  posting = signal(false);
  newPostContent = signal('');
  uploadedImageUrl = signal<string | null>(null);
  uploading = signal(false);

  expandedPostId = signal<string | null>(null);
  comments = signal<PostComment[]>([]);
  commentsLoading = signal(false);
  commentInput = signal('');

  page = 1;
  hasMore = signal(true);
  loadingMore = signal(false);

  currentUserId = signal<string | null>(null);

  miniProfile = signal<UserMiniProfile | null>(null);
  miniProfileLoading = signal(false);

  ngOnInit(): void {
    this.currentUserId.set(this.auth.userId());
    this.loadFeed();
  }

  openMiniProfile(userId: string, event: Event): void {
    event.stopPropagation();
    if (this.miniProfileLoading()) return;

    this.miniProfileLoading.set(true);
    this.mapService.getUserMiniProfile(userId).subscribe({
      next: (profile) => {
        this.miniProfile.set(profile);
        this.miniProfileLoading.set(false);
      },
      error: () => {
        this.toast.error('Could not load profile.');
        this.miniProfileLoading.set(false);
      },
    });
  }

  closeMiniProfile(): void {
    this.miniProfile.set(null);
  }

  goToMyProfile(): void {
    this.closeMiniProfile();
    this.router.navigate(['/profile']);
  }

  viewApprovedProviderProfile(userId: string): void {
    this.closeMiniProfile();
    this.router.navigate(['/provider', userId]);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMiniProfile();
  }

  private loadFeed(): void {
    this.feedLoading.set(true);
    this.postService.getFeed(1).subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.hasMore.set(posts.length >= 20);
        this.feedLoading.set(false);
        this.page = 1;
      },
      error: () => {
        this.toast.error('Failed to load feed.');
        this.feedLoading.set(false);
      },
    });
  }

  loadMore(): void {
    this.loadingMore.set(true);
    this.postService.getFeed(this.page + 1).subscribe({
      next: (newPosts) => {
        this.posts.update((prev) => [...prev, ...newPosts]);
        this.hasMore.set(newPosts.length >= 20);
        this.page++;
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  createPost(): void {
    const content = this.newPostContent().trim();
    if (!content || this.posting()) return;

    this.posting.set(true);
    this.postService.create(content, this.uploadedImageUrl() ?? undefined).subscribe({
      next: (post) => {
        this.posts.update((prev) => [post, ...prev]);
        this.newPostContent.set('');
        this.uploadedImageUrl.set(null);
        this.posting.set(false);
      },
      error: () => {
        this.toast.error('Failed to create post.');
        this.posting.set(false);
      },
    });
  }

  deletePost(post: Post): void {
    if (!confirm('Delete this post?')) return;
    this.postService.delete(post.id).subscribe({
      next: () => this.posts.update((prev) => prev.filter((p) => p.id !== post.id)),
      error: () => this.toast.error('Failed to delete post.'),
    });
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.fileUpload.uploadImage(file, 'posts').subscribe({
      next: (result) => {
        this.uploadedImageUrl.set(result.url);
        this.uploading.set(false);
      },
      error: () => {
        this.toast.error('Failed to upload image.');
        this.uploading.set(false);
      },
    });
  }

  removeImage(): void {
    this.uploadedImageUrl.set(null);
  }

  toggleLike(post: Post): void {
    this.postService.toggleLike(post.id).subscribe({
      next: (result) => {
        this.posts.update((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, likedByMe: result.liked, likeCount: result.likeCount } : p
          )
        );
      },
    });
  }

  toggleComments(post: Post): void {
    if (this.expandedPostId() === post.id) {
      this.expandedPostId.set(null);
      this.comments.set([]);
      return;
    }
    this.expandedPostId.set(post.id);
    this.loadComments(post.id);
  }

  private loadComments(postId: string): void {
    this.commentsLoading.set(true);
    this.postService.getComments(postId).subscribe({
      next: (c) => {
        this.comments.set(c);
        this.commentsLoading.set(false);
      },
      error: () => this.commentsLoading.set(false),
    });
  }

  submitComment(post: Post): void {
    const content = this.commentInput().trim();
    if (!content) return;

    this.postService.addComment(post.id, content).subscribe({
      next: (c) => {
        this.comments.update((prev) => [...prev, c]);
        this.commentInput.set('');
        this.posts.update((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, commentCount: p.commentCount + 1 } : p))
        );
      },
      error: () => this.toast.error('Failed to add comment.'),
    });
  }
}
