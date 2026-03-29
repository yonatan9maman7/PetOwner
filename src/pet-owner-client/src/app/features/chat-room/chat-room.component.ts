import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, DatePipe],
  template: `
    <!-- fixed fullscreen overlay — breaks out of <main> scroll context entirely -->
    <div class="fixed inset-0 z-[100] flex flex-col bg-gray-100">

      <!-- ─── Top bar ─── -->
      <div class="shrink-0 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
        <button type="button" (click)="goBack()"
                class="p-1.5 -ms-1.5 hover:bg-gray-100 rounded-full transition-colors">
          <svg class="w-5 h-5 text-gray-600 rtl:rotate-180" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center"
             [class]="otherAvatar() ? '' : 'bg-gradient-to-br from-violet-400 to-indigo-500 text-white font-bold'">
          @if (otherAvatar()) {
            <img [src]="otherAvatar()" [alt]="otherName()" class="w-full h-full object-cover" />
          } @else {
            {{ otherName().charAt(0).toUpperCase() }}
          }
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate" dir="auto">{{ otherName() }}</p>
        </div>
      </div>

      <!-- ─── Messages area (flex-1 + min-h-0 = scrollable within remaining space) ─── -->
      <div #scrollContainer
           class="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-1.5"
           style="background: linear-gradient(135deg, #f3f0ff 0%, #eef2ff 50%, #f0fdf4 100%);">

        @if (loading()) {
          <div class="flex items-center justify-center h-full">
            <div class="w-7 h-7 border-[3px] border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else {
          @if (messages().length === 0) {
            <div class="flex flex-col items-center justify-center h-full text-center px-6">
              <div class="w-14 h-14 bg-white/80 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <svg class="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round"
                        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
                </svg>
              </div>
              <p class="text-sm text-gray-500">{{ 'CHAT.START_CONVERSATION' | translate }}</p>
            </div>
          } @else {
            @for (msg of messages(); track msg.id; let i = $index) {
              <!-- Date separator -->
              @if (i === 0 || !sameDay(messages()[i - 1].sentAt, msg.sentAt)) {
                <div class="flex items-center justify-center my-3">
                  <span class="bg-white/80 text-gray-500 text-[10px] font-medium px-3 py-1
                               rounded-full shadow-sm backdrop-blur-sm">
                    {{ msg.sentAt | date:'mediumDate' }}
                  </span>
                </div>
              }

              <!-- Bubble row — ms-auto / me-auto are RTL-aware (logical) -->
              <div class="flex" style="animation: bubbleIn 0.2s ease-out">
                <div class="max-w-[80%] px-3.5 py-2 shadow-sm"
                     [class]="isMine(msg)
                       ? 'ms-auto bg-violet-600 text-white rounded-2xl ltr:rounded-br-md rtl:rounded-bl-md'
                       : 'me-auto bg-gray-200 text-gray-900 rounded-2xl ltr:rounded-bl-md rtl:rounded-br-md'">

                  <p class="text-sm leading-relaxed whitespace-pre-wrap break-words" dir="auto">{{ msg.content }}</p>

                  <div class="flex items-center gap-1 mt-0.5"
                       [class]="isMine(msg) ? 'justify-end' : 'justify-start'">
                    <span class="text-[10px]"
                          [class]="isMine(msg) ? 'text-white/60' : 'text-gray-500'">
                      {{ msg.sentAt | date:'shortTime' }}
                    </span>
                    @if (isMine(msg)) {
                      <svg class="w-3.5 h-3.5"
                           [class]="msg.isRead ? 'text-sky-300' : 'text-white/50'"
                           fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    }
                  </div>
                </div>
              </div>
            }
          }
        }
      </div>

      <!-- ─── Input area (always pinned at bottom) ─── -->
      <div class="shrink-0 bg-white border-t border-gray-200 px-3 py-2.5 safe-area-bottom">
        <div class="flex items-end gap-2 max-w-lg mx-auto">
          <div class="flex-1">
            <textarea
              #msgInput
              [(ngModel)]="newMessage"
              (keydown.enter)="onEnterKey($event)"
              [placeholder]="'CHAT.INPUT_PLACEHOLDER' | translate"
              rows="1"
              class="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5
                     text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                     focus:ring-violet-500/40 focus:border-violet-400 transition-shadow
                     max-h-28 overflow-y-auto leading-snug"
              dir="auto"
              (input)="autoResize($event)">
            </textarea>
          </div>
          <button
            type="button"
            (click)="send()"
            [disabled]="!newMessage.trim()"
            class="p-2.5 rounded-full bg-violet-600 text-white shadow-md
                   hover:bg-violet-700 active:bg-violet-800 transition-all duration-150
                   disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed
                   shrink-0 flex items-center justify-center">
            <svg class="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes bubbleIn {
      from { opacity: 0; transform: translateY(8px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .safe-area-bottom { padding-bottom: max(0.625rem, env(safe-area-inset-bottom)); }
  `],
})
export class ChatRoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly chatService = inject(ChatService);
  private readonly auth = inject(AuthService);

  readonly messages = this.chatService.activeMessages;
  readonly loading = signal(true);
  readonly myId = this.auth.userId;

  otherUserId = '';
  otherName = signal('');
  otherAvatar = signal<string | null>(null);
  newMessage = '';

  private shouldScroll = true;
  private prevMessageCount = 0;

  isMine(msg: ChatMessage): boolean {
    return !!this.myId() && msg.senderId === this.myId();
  }

  ngOnInit(): void {
    this.otherUserId = this.route.snapshot.paramMap.get('otherUserId') || '';
    const myId = this.auth.userId();
    if (
      !this.otherUserId ||
      (!!myId && this.otherUserId.toLowerCase() === myId.toLowerCase())
    ) {
      void this.router.navigate(['/chat']);
      return;
    }

    const nav = this.router.getCurrentNavigation()?.extras?.state
      ?? history.state;
    if (nav?.['name']) this.otherName.set(nav['name']);
    if (nav?.['avatar']) this.otherAvatar.set(nav['avatar']);

    this.chatService.activeOtherUserId.set(this.otherUserId);
    this.chatService.activeMessages.set([]);

    this.chatService.loadMessages(this.otherUserId).subscribe({
      next: (msgs) => {
        this.loading.set(false);
        if (!this.otherName() && msgs.length > 0) {
          const other = msgs.find(m => m.senderId !== this.auth.userId());
          if (other) this.otherName.set(other.senderName);
        }
        this.shouldScroll = true;
      },
      error: () => this.loading.set(false),
    });

    this.chatService.markAsRead(this.otherUserId).subscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll || this.messages().length !== this.prevMessageCount) {
      this.scrollToBottom();
      this.prevMessageCount = this.messages().length;
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.chatService.activeOtherUserId.set(null);
  }

  send(): void {
    const content = this.newMessage.trim();
    if (!content) return;
    this.chatService.sendMessage(this.otherUserId, content);
    this.newMessage = '';
    this.shouldScroll = true;
  }

  onEnterKey(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.shiftKey) return;
    e.preventDefault();
    this.send();
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 112) + 'px';
  }

  goBack(): void {
    this.router.navigate(['/chat']);
  }

  sameDay(a: string, b: string): boolean {
    return new Date(a).toDateString() === new Date(b).toDateString();
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
