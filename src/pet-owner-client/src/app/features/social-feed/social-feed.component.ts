import { Component, inject, OnInit, signal, computed, HostListener, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Post, PostComment, PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { FileUploadService } from '../../services/file-upload.service';
import { ToastService } from '../../services/toast.service';
import { MapService, UserMiniProfile } from '../../services/map.service';
import { CommunityService, CommunityGroup } from '../../services/community.service';

@Component({
  selector: 'app-social-feed',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, NgClass, TranslatePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-sky-50 to-white">

      <!-- Sticky Top Bar: Group Pills -->
      <div class="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div class="max-w-xl mx-auto px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide shrink-0" dir="auto">
              {{ 'COMMUNITY.CHANNELS' | translate }}
            </span>

            <div class="flex-1 overflow-x-auto scrollbar-hide">
              <div class="flex gap-2">
                <!-- "All" pill -->
                <button
                  (click)="selectGroup(null)"
                  class="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap"
                  [class]="selectedGroupId() === null && !categoryFilter()
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                >
                  {{ 'COMMUNITY.GLOBAL' | translate }}
                </button>

                <!-- Lost & Found pill -->
                <button
                  (click)="toggleLostAndFound()"
                  class="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap"
                  [class]="categoryFilter() === 'lost_and_found'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'"
                >
                  <span class="me-1">🆘</span>
                  {{ 'COMMUNITY.LOST_AND_FOUND' | translate }}
                </button>

                @for (group of groups(); track group.id) {
                  <button
                    (click)="selectGroup(group.id)"
                    class="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap"
                    [class]="selectedGroupId() === group.id
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                  >
                    @if (group.icon) { <span class="me-1">{{ group.icon }}</span> }
                    {{ group.name }}
                  </button>
                }
              </div>
            </div>

            @if (isAdmin()) {
              <button
                (click)="showCreateGroupModal.set(true)"
                class="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors"
                [attr.title]="'COMMUNITY.MANAGE_GROUPS' | translate"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            }
          </div>
        </div>
      </div>

      <div class="max-w-xl mx-auto px-4 py-6">

        <!-- Header -->
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold text-slate-900" dir="auto">{{ 'COMMUNITY.FEED_TITLE' | translate }}</h1>
          <p class="mt-1 text-sm text-slate-500" dir="auto">{{ 'COMMUNITY.SUBTITLE' | translate }}</p>
        </div>

        <!-- Location Toggle -->
        <div class="flex rounded-xl bg-slate-100 p-1 mb-5">
          <button
            (click)="setLocationMode('global')"
            class="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all"
            [class]="locationMode() === 'global'
              ? 'bg-white shadow text-slate-800'
              : 'text-slate-500 hover:text-slate-700'"
          >
            <span>&#x1F30D;</span>
            {{ 'COMMUNITY.GLOBAL' | translate }}
          </button>
          <button
            (click)="setLocationMode('nearme')"
            class="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all"
            [class]="locationMode() === 'nearme'
              ? 'bg-white shadow text-slate-800'
              : 'text-slate-500 hover:text-slate-700'"
          >
            <span>&#x1F4CD;</span>
            {{ 'COMMUNITY.NEAR_ME' | translate }}
            @if (geoLoading()) {
              <svg class="w-4 h-4 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            }
          </button>
        </div>

        <!-- Create Post -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <form (ngSubmit)="createPost()">
            <textarea
              [(ngModel)]="newPostContent"
              name="content"
              rows="3"
              dir="auto"
              [attr.placeholder]="selectedGroupId()
                ? ('COMMUNITY.POST_PLACEHOLDER' | translate: { groupName: selectedGroupName() })
                : ('COMMUNITY.WRITE_POST' | translate)"
              class="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-start placeholder:text-start text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            ></textarea>

            @if (uploadedImageUrl()) {
              <div class="relative mt-3 inline-block">
                <img [src]="uploadedImageUrl()" class="h-24 rounded-lg object-cover" [attr.alt]="'COMMUNITY.POST_IMAGE_ALT' | translate" />
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
                {{ uploading() ? ('COMMUNITY.UPLOADING' | translate) : ('COMMUNITY.PHOTO' | translate) }}
                <input type="file" accept="image/*" class="hidden" (change)="onImageSelected($event)" [disabled]="uploading()" />
              </label>
              <button
                type="submit"
                [disabled]="posting() || !newPostContent().trim()"
                class="px-5 py-2 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {{ posting() ? ('COMMUNITY.POSTING' | translate) : ('COMMUNITY.POST' | translate) }}
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
            <p class="font-medium" dir="auto">{{ 'COMMUNITY.NO_POSTS' | translate }}</p>
            <p class="text-sm mt-1" dir="auto">{{ 'COMMUNITY.NO_POSTS_HINT' | translate }}</p>
          </div>
        } @else {
          <div class="space-y-4">
            @for (post of posts(); track post.id) {
              <div class="bg-white rounded-2xl shadow-sm overflow-hidden"
                   [ngClass]="post.category === 'lost_and_found'
                     ? 'border-2 border-red-300 ring-1 ring-red-100'
                     : 'border border-gray-100'"
                   [id]="'post-' + post.id"
                   [style.background-color]="highlightPostId() === post.id ? 'rgb(254 242 242 / 0.3)' : ''">
                @if (post.category === 'lost_and_found') {
                  <div class="bg-red-500 text-white px-4 py-1.5 flex items-center gap-2">
                    <span class="text-sm leading-none">🆘</span>
                    <span class="text-xs font-bold uppercase tracking-wide">{{ 'COMMUNITY.SOS_BADGE' | translate }}</span>
                  </div>
                }
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
                  <p class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed" dir="auto">{{ post.content }}</p>
                </div>

                @if (post.imageUrl) {
                  <img [src]="post.imageUrl" class="w-full max-h-80 object-cover" [attr.alt]="'COMMUNITY.POST_BY' | translate: { name: post.userName }" />
                }

                <!-- Engagement Action Bar -->
                <div class="flex items-center gap-1 px-5 py-3 border-t border-gray-50">
                  <button
                    type="button"
                    (click)="toggleLike(post)"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    [class]="post.likedByMe ? 'text-sky-600 bg-sky-50' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'"
                    [attr.aria-label]="'COMMUNITY.LIKE' | translate"
                  >
                    <svg class="w-4.5 h-4.5" [attr.fill]="post.likedByMe ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                    </svg>
                    {{ 'COMMUNITY.LIKE' | translate }}
                    @if (post.likeCount) { <span>({{ post.likeCount }})</span> }
                  </button>
                  <button
                    type="button"
                    (click)="toggleComments(post)"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    [class]="expandedPostId() === post.id ? 'text-sky-600 bg-sky-50' : 'text-slate-400 hover:text-sky-500 hover:bg-sky-50'"
                    [attr.aria-label]="'COMMUNITY.COMMENTS' | translate"
                  >
                    <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {{ 'COMMUNITY.COMMENTS' | translate }}
                    @if (post.commentCount) { <span>({{ post.commentCount }})</span> }
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
                              <p class="text-sm text-slate-600" dir="auto">{{ c.content }}</p>
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
                        dir="auto"
                        [attr.placeholder]="'COMMUNITY.WRITE_COMMENT' | translate"
                        class="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-start placeholder:text-start text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                      />
                      <button type="submit" [disabled]="!commentInput().trim()"
                              class="px-3 py-2 bg-sky-600 text-white text-sm rounded-xl hover:bg-sky-500 disabled:opacity-40 transition">
                        {{ 'COMMUNITY.SEND' | translate }}
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
                {{ loadingMore() ? ('COMMUNITY.LOADING' | translate) : ('COMMUNITY.LOAD_MORE' | translate) }}
              </button>
            }
          </div>
        }
      </div>
    </div>

    <!-- Mini Profile Popup -->
    @if (miniProfile()) {
      <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4" (click)="closeMiniProfile()">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div
          class="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden animate-scaleIn"
          (click)="$event.stopPropagation()"
        >
          <div class="h-20 bg-gradient-to-br from-sky-400 to-indigo-500"></div>
          <div class="flex justify-center -mt-10">
            <div class="w-20 h-20 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-md flex items-center justify-center">
              @if (miniProfile()!.profileImageUrl) {
                <img [src]="miniProfile()!.profileImageUrl" [alt]="miniProfile()!.name" class="w-full h-full object-cover" />
              } @else {
                <span class="text-2xl font-bold text-gray-400">{{ miniProfile()!.name.charAt(0).toUpperCase() }}</span>
              }
            </div>
          </div>
          <div class="px-6 pt-3 pb-5 text-center">
            <h3 class="text-lg font-bold text-slate-900">{{ miniProfile()!.name }}</h3>
            <div class="flex items-center justify-center gap-2 mt-1">
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [class]="miniProfile()!.isProvider ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'">
                {{ miniProfile()!.isProvider ? ('COMMUNITY.PET_CARE_PROVIDER' | translate) : ('COMMUNITY.PET_OWNER' | translate) }}
              </span>
              <span class="text-xs text-slate-400" dir="auto">
                {{ 'COMMUNITY.MEMBER_SINCE_PREFIX' | translate }} {{ miniProfile()!.memberSince | date:'MMM yyyy' }}
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
                {{ 'COMMUNITY.MY_PROFILE' | translate }}
              </button>
            } @else if (miniProfile()!.isProvider) {
              <button
                (click)="viewApprovedProviderProfile(miniProfile()!.id)"
                class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition-colors"
              >
                {{ 'COMMUNITY.VIEW_PROVIDER' | translate }}
              </button>
            } @else {
              <p class="mt-4 text-xs text-slate-400" dir="auto">{{ 'COMMUNITY.NO_PUBLIC_PROVIDER' | translate }}</p>
            }
          </div>
        </div>
      </div>
    }

    <!-- Create Group Modal (Admin) -->
    @if (showCreateGroupModal()) {
      <div class="fixed inset-0 z-[3000] flex items-center justify-center p-4" (click)="showCreateGroupModal.set(false)">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div
          class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scaleIn"
          (click)="$event.stopPropagation()"
        >
          <h2 class="text-xl font-bold text-slate-900 mb-4" dir="auto">{{ 'COMMUNITY.CREATE_GROUP' | translate }}</h2>
          <form (ngSubmit)="createGroup()">
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1" dir="auto">{{ 'COMMUNITY.GROUP_NAME' | translate }}</label>
                <input
                  [(ngModel)]="newGroupName"
                  name="name"
                  required
                  dir="auto"
                  class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-start text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1" dir="auto">{{ 'COMMUNITY.GROUP_DESCRIPTION' | translate }}</label>
                <textarea
                  [(ngModel)]="newGroupDescription"
                  name="description"
                  dir="auto"
                  rows="2"
                  class="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-start text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                ></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1" dir="auto">{{ 'COMMUNITY.GROUP_ICON' | translate }}</label>
                <input
                  [(ngModel)]="newGroupIcon"
                  name="icon"
                  dir="auto"
                  placeholder="&#x1F43E;"
                  class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1" dir="auto">{{ 'COMMUNITY.TARGET_COUNTRY' | translate }}</label>
                  <input
                    [(ngModel)]="newGroupCountry"
                    name="country"
                    dir="auto"
                    class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1" dir="auto">{{ 'COMMUNITY.TARGET_CITY' | translate }}</label>
                  <input
                    [(ngModel)]="newGroupCity"
                    name="city"
                    dir="auto"
                    class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-5">
              <button
                type="button"
                (click)="showCreateGroupModal.set(false)"
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {{ 'COMMUNITY.CANCEL' | translate }}
              </button>
              <button
                type="submit"
                [disabled]="!newGroupName().trim() || creatingGroup()"
                class="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {{ creatingGroup() ? ('COMMUNITY.CREATING' | translate) : ('COMMUNITY.CREATE_GROUP' | translate) }}
              </button>
            </div>
          </form>
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
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `,
})
export class SocialFeedComponent implements OnInit, AfterViewInit {
  private readonly postService = inject(PostService);
  private readonly communityService = inject(CommunityService);
  private readonly auth = inject(AuthService);
  private readonly fileUpload = inject(FileUploadService);
  private readonly toast = inject(ToastService);
  private readonly mapService = inject(MapService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  // Groups
  groups = signal<CommunityGroup[]>([]);
  selectedGroupId = signal<string | null>(null);
  categoryFilter = signal<string | null>(null);
  highlightPostId = signal<string | null>(null);

  selectedGroupName = computed(() => {
    const id = this.selectedGroupId();
    if (!id) return '';
    return this.groups().find((g) => g.id === id)?.name ?? '';
  });

  // Location
  locationMode = signal<'global' | 'nearme'>('global');
  userCoords = signal<{ lat: number; lng: number } | null>(null);
  geoLoading = signal(false);

  // Admin
  isAdmin = computed(() => this.auth.hasRole('Admin'));
  showCreateGroupModal = signal(false);
  newGroupName = signal('');
  newGroupDescription = signal('');
  newGroupIcon = signal('');
  newGroupCountry = signal('');
  newGroupCity = signal('');
  creatingGroup = signal(false);

  // Feed
  posts = signal<Post[]>([]);
  feedLoading = signal(true);
  posting = signal(false);
  newPostContent = signal('');
  uploadedImageUrl = signal<string | null>(null);
  uploading = signal(false);

  // Comments
  expandedPostId = signal<string | null>(null);
  comments = signal<PostComment[]>([]);
  commentsLoading = signal(false);
  commentInput = signal('');

  // Pagination
  page = 1;
  hasMore = signal(true);
  loadingMore = signal(false);

  // User
  currentUserId = signal<string | null>(null);

  // Mini profile
  miniProfile = signal<UserMiniProfile | null>(null);
  miniProfileLoading = signal(false);

  ngOnInit(): void {
    this.currentUserId.set(this.auth.userId());
    this.loadGroups();

    const hp = this.route.snapshot.queryParamMap.get('highlightPost');
    if (hp) {
      this.highlightPostId.set(hp);
    }

    this.loadFeed();
  }

  ngAfterViewInit(): void {
    const hp = this.highlightPostId();
    if (hp) {
      setTimeout(() => this.scrollToPost(hp), 600);
    }
  }

  private scrollToPost(postId: string): void {
    const el = document.getElementById('post-' + postId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // --- Groups ---

  loadGroups(): void {
    this.communityService.getGroups().subscribe({
      next: (groups) => this.groups.set(groups),
      error: () => {},
    });
  }

  selectGroup(groupId: string | null): void {
    this.selectedGroupId.set(groupId);
    this.categoryFilter.set(null);
    this.page = 1;
    this.loadFeed();
  }

  toggleLostAndFound(): void {
    if (this.categoryFilter() === 'lost_and_found') {
      this.categoryFilter.set(null);
    } else {
      this.categoryFilter.set('lost_and_found');
      this.selectedGroupId.set(null);
    }
    this.page = 1;
    this.loadFeed();
  }

  createGroup(): void {
    const name = this.newGroupName().trim();
    if (!name || this.creatingGroup()) return;

    this.creatingGroup.set(true);
    this.communityService
      .createGroup({
        name,
        description: this.newGroupDescription().trim() || undefined,
        icon: this.newGroupIcon().trim() || undefined,
        targetCountry: this.newGroupCountry().trim() || undefined,
        targetCity: this.newGroupCity().trim() || undefined,
      })
      .subscribe({
        next: (group) => {
          this.groups.update((prev) => [...prev, group]);
          this.resetGroupForm();
          this.showCreateGroupModal.set(false);
          this.creatingGroup.set(false);
        },
        error: () => {
          this.toast.error(this.translate.instant('COMMUNITY.ERROR_CREATE_GROUP'));
          this.creatingGroup.set(false);
        },
      });
  }

  private resetGroupForm(): void {
    this.newGroupName.set('');
    this.newGroupDescription.set('');
    this.newGroupIcon.set('');
    this.newGroupCountry.set('');
    this.newGroupCity.set('');
  }

  // --- Location ---

  setLocationMode(mode: 'global' | 'nearme'): void {
    if (this.locationMode() === mode) return;
    this.locationMode.set(mode);

    if (mode === 'nearme' && !this.userCoords()) {
      this.requestGeolocation();
      return;
    }

    this.page = 1;
    this.loadFeed();
  }

  private requestGeolocation(): void {
    if (!navigator.geolocation) {
      this.toast.error(this.translate.instant('WIZARD.GEO_NOT_SUPPORTED'));
      this.locationMode.set('global');
      return;
    }

    this.geoLoading.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userCoords.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        this.geoLoading.set(false);
        this.page = 1;
        this.loadFeed();
      },
      () => {
        this.toast.error(this.translate.instant('WIZARD.GEO_DENIED'));
        this.locationMode.set('global');
        this.geoLoading.set(false);
      },
    );
  }

  // --- Feed ---

  private buildGeoFilter() {
    if (this.locationMode() === 'nearme' && this.userCoords()) {
      return { lat: this.userCoords()!.lat, lng: this.userCoords()!.lng, radiusKm: 10 };
    }
    return undefined;
  }

  private loadFeed(): void {
    this.feedLoading.set(true);
    this.expandedPostId.set(null);
    this.comments.set([]);
    const groupId = this.selectedGroupId();
    const geo = this.buildGeoFilter();
    const category = this.categoryFilter();

    if (groupId) {
      this.communityService.getGroupPosts(groupId, geo).subscribe({
        next: (posts) => {
          this.posts.set(posts);
          this.hasMore.set(false);
          this.feedLoading.set(false);
          this.page = 1;
        },
        error: () => {
          this.toast.error('Failed to load feed.');
          this.feedLoading.set(false);
        },
      });
    } else {
      this.postService.getFeed(1, null, geo, category).subscribe({
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
  }

  loadMore(): void {
    this.loadingMore.set(true);
    const groupId = this.selectedGroupId();
    const geo = this.buildGeoFilter();
    const category = this.categoryFilter();

    this.postService.getFeed(this.page + 1, groupId, geo, category).subscribe({
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
    const groupId = this.selectedGroupId();
    const coords = this.userCoords();
    const location = coords ? { lat: coords.lat, lng: coords.lng } : undefined;

    const post$ = groupId
      ? this.communityService.createGroupPost(groupId, content, location)
      : this.postService.create(content, this.uploadedImageUrl() ?? undefined, null, location);

    post$.subscribe({
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
    if (!confirm(this.translate.instant('COMMUNITY.DELETE_POST_CONFIRM'))) return;
    this.postService.delete(post.id).subscribe({
      next: () => this.posts.update((prev) => prev.filter((p) => p.id !== post.id)),
      error: () => this.toast.error('Failed to delete post.'),
    });
  }

  // --- Image Upload ---

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

  // --- Likes & Comments ---

  toggleLike(post: Post): void {
    const wasLiked = post.likedByMe;
    const optimisticCount = wasLiked ? Math.max(0, post.likeCount - 1) : post.likeCount + 1;

    this.posts.update((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, likedByMe: !wasLiked, likeCount: optimisticCount } : p,
      ),
    );

    const like$ = this.selectedGroupId()
      ? this.communityService.toggleGroupPostLike(post.id)
      : this.postService.toggleLike(post.id);

    like$.subscribe({
      next: (result) => {
        this.posts.update((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, likedByMe: result.liked, likeCount: result.likeCount } : p,
          ),
        );
      },
      error: () => {
        this.posts.update((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, likedByMe: wasLiked, likeCount: post.likeCount } : p,
          ),
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

    const comments$ = this.selectedGroupId()
      ? this.communityService.getGroupPostComments(postId)
      : this.postService.getComments(postId);

    comments$.subscribe({
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

    const comment$ = this.selectedGroupId()
      ? this.communityService.addGroupPostComment(post.id, content)
      : this.postService.addComment(post.id, content);

    comment$.subscribe({
      next: (c) => {
        this.comments.update((prev) => [...prev, c]);
        this.commentInput.set('');
        this.posts.update((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, commentCount: p.commentCount + 1 } : p)),
        );
      },
      error: () => this.toast.error('Failed to add comment.'),
    });
  }

  // --- Mini Profile ---

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
    if (this.showCreateGroupModal()) {
      this.showCreateGroupModal.set(false);
    } else {
      this.closeMiniProfile();
    }
  }
}
