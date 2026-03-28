import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ChatService, ChatConversation } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { TimeAgoPipe } from '../../shared/time-ago.pipe';

@Component({
  selector: 'app-chat-inbox',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, TimeAgoPipe],
  template: `
    <div class="min-h-screen bg-gray-50" dir="auto">
      <!-- Header -->
      <div class="bg-gradient-to-br from-violet-600 to-indigo-700 text-white px-5 pt-14 pb-6">
        <div class="max-w-lg mx-auto">
          <h1 class="text-2xl font-bold">{{ 'CHAT.INBOX_TITLE' | translate }}</h1>
          <p class="text-sm text-white/70 mt-1">{{ 'CHAT.INBOX_SUBTITLE' | translate }}</p>
        </div>
      </div>

      <div class="max-w-lg mx-auto px-4 -mt-3 pb-24">
        @if (loading) {
          <div class="flex items-center justify-center py-16">
            <div class="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (conversations().length === 0) {
          <div class="bg-white rounded-2xl shadow-md p-8 text-center">
            <div class="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-gray-800 mb-1">{{ 'CHAT.NO_CONVERSATIONS' | translate }}</h3>
            <p class="text-sm text-gray-500">{{ 'CHAT.NO_CONVERSATIONS_HINT' | translate }}</p>
          </div>
        } @else {
          <div class="bg-white rounded-2xl shadow-md overflow-hidden divide-y divide-gray-100">
            @for (convo of conversations(); track convo.conversationId) {
              <button
                type="button"
                (click)="openChat(convo)"
                class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100
                       transition-colors text-start relative">
                <!-- Avatar -->
                <div class="w-12 h-12 rounded-full shrink-0 overflow-hidden flex items-center justify-center"
                     [class]="convo.otherUserAvatar ? '' : 'bg-gradient-to-br from-violet-400 to-indigo-500 text-white text-lg font-bold'">
                  @if (convo.otherUserAvatar) {
                    <img [src]="convo.otherUserAvatar" [alt]="convo.otherUserName" class="w-full h-full object-cover" />
                  } @else {
                    {{ convo.otherUserName.charAt(0).toUpperCase() }}
                  }
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-semibold text-gray-900 truncate"
                          [class.font-bold]="convo.unreadCount > 0">{{ convo.otherUserName }}</span>
                    <span class="text-[10px] text-gray-400 shrink-0 tabular-nums">{{ convo.lastMessageAt | timeAgo }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2 mt-0.5">
                    <p class="text-xs truncate"
                       [class]="convo.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'">
                      {{ convo.lastMessageSnippet || ('CHAT.NO_MESSAGES_YET' | translate) }}
                    </p>
                    @if (convo.unreadCount > 0) {
                      <span class="bg-violet-600 text-white text-[10px] font-bold w-5 h-5 rounded-full
                                   flex items-center justify-center shrink-0 leading-none">
                        {{ convo.unreadCount > 9 ? '9+' : convo.unreadCount }}
                      </span>
                    }
                  </div>
                </div>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ChatInboxComponent implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);

  readonly conversations = this.chatService.conversations;
  loading = true;

  ngOnInit(): void {
    this.chatService.loadConversations().subscribe({
      next: () => this.loading = false,
      error: () => this.loading = false,
    });
  }

  openChat(convo: ChatConversation): void {
    this.router.navigate(['/chat', convo.otherUserId], {
      state: { name: convo.otherUserName, avatar: convo.otherUserAvatar },
    });
  }
}
