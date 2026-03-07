import { Component, inject, OnInit, signal, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Conversation, ChatMessage, MessageService } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-messaging',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-violet-50 to-white flex flex-col">

      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div class="max-w-xl mx-auto flex items-center gap-3">
          @if (activeConvo()) {
            <button (click)="backToList()" class="text-slate-500 hover:text-slate-700 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div class="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">
              {{ activeConvo()!.otherUserName.charAt(0).toUpperCase() }}
            </div>
            <h1 class="text-lg font-bold text-slate-900">{{ activeConvo()!.otherUserName }}</h1>
          } @else {
            <div class="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 class="text-lg font-bold text-slate-900">Messages</h1>
          }
        </div>
      </div>

      @if (!activeConvo()) {
        <!-- Conversations List -->
        <div class="flex-1 overflow-y-auto px-4 py-4">
          <div class="max-w-xl mx-auto">
            @if (convosLoading()) {
              <div class="flex justify-center py-12">
                <svg class="w-8 h-8 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              </div>
            } @else if (conversations().length === 0) {
              <div class="text-center py-16 text-slate-400">
                <div class="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3">
                  <svg class="w-8 h-8 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p class="font-medium">No conversations yet</p>
                <p class="text-sm mt-1">Start a conversation with a pet care provider</p>
              </div>
            } @else {
              <div class="space-y-2">
                @for (convo of conversations(); track convo.id) {
                  <button
                    (click)="openConversation(convo)"
                    class="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-violet-300 hover:shadow-sm transition-all text-left"
                  >
                    <div class="w-11 h-11 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm flex-shrink-0">
                      {{ convo.otherUserName.charAt(0).toUpperCase() }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <p class="text-sm font-semibold text-slate-800 truncate">{{ convo.otherUserName }}</p>
                        <span class="text-[10px] text-slate-400 flex-shrink-0">{{ convo.lastMessageAt | date:'shortDate' }}</span>
                      </div>
                      <p class="text-xs text-slate-500 truncate mt-0.5">{{ convo.lastMessage || 'No messages yet' }}</p>
                    </div>
                    @if (convo.unreadCount > 0) {
                      <span class="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {{ convo.unreadCount }}
                      </span>
                    }
                  </button>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        <!-- Chat View -->
        <div class="flex-1 overflow-y-auto px-4 py-4" #chatContainer>
          <div class="max-w-xl mx-auto space-y-3">
            @for (msg of messages(); track msg.id) {
              @if (msg.senderId === currentUserId) {
                <!-- My message -->
                <div class="flex justify-end">
                  <div class="bg-violet-600 text-white rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[80%] shadow-sm">
                    <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
                    <p class="text-[10px] text-violet-200 mt-1 text-right">{{ msg.createdAt | date:'shortTime' }}</p>
                  </div>
                </div>
              } @else {
                <!-- Their message -->
                <div class="flex justify-start">
                  <div class="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[80%] shadow-sm">
                    <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ msg.content }}</p>
                    <p class="text-[10px] text-slate-400 mt-1">{{ msg.createdAt | date:'shortTime' }}</p>
                  </div>
                </div>
              }
            }
          </div>
        </div>

        <!-- Message Input -->
        <div class="border-t border-gray-200 bg-white px-4 py-3">
          <div class="max-w-xl mx-auto">
            <form (ngSubmit)="sendMessage()" class="flex gap-2">
              <input
                [(ngModel)]="messageInput"
                name="message"
                placeholder="Type a message..."
                class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                (keydown.enter)="onEnterKey($event)"
              />
              <button type="submit" [disabled]="!messageInput().trim() || sending()"
                      class="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-40 transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class MessagingComponent implements OnInit {
  private readonly messageService = inject(MessageService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  conversations = signal<Conversation[]>([]);
  convosLoading = signal(true);
  activeConvo = signal<Conversation | null>(null);
  messages = signal<ChatMessage[]>([]);
  messagesLoading = signal(false);
  messageInput = signal('');
  sending = signal(false);
  currentUserId: string | null = null;

  @ViewChild('chatContainer') chatContainer?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.currentUserId = this.auth.userId();
    this.loadConversations();

    const recipientId = this.route.snapshot.queryParams['to'];
    if (recipientId) {
      this.startNewConversation(recipientId);
    }
  }

  private loadConversations(): void {
    this.convosLoading.set(true);
    this.messageService.getConversations().subscribe({
      next: (c) => {
        this.conversations.set(c);
        this.convosLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load conversations.');
        this.convosLoading.set(false);
      },
    });
  }

  openConversation(convo: Conversation): void {
    this.activeConvo.set(convo);
    this.loadMessages(convo.id);
  }

  backToList(): void {
    this.activeConvo.set(null);
    this.messages.set([]);
    this.messageInput.set('');
    this.loadConversations();
  }

  private loadMessages(conversationId: string): void {
    this.messagesLoading.set(true);
    this.messageService.getMessages(conversationId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.messagesLoading.set(false);
        this.scrollToBottom();
      },
      error: () => this.messagesLoading.set(false),
    });
  }

  sendMessage(): void {
    const content = this.messageInput().trim();
    const convo = this.activeConvo();
    if (!content || !convo || this.sending()) return;

    this.sending.set(true);
    this.messageService.send(convo.otherUserId, content).subscribe({
      next: (result) => {
        this.messages.update((prev) => [...prev, result.message]);
        this.messageInput.set('');
        this.sending.set(false);
        this.scrollToBottom();
      },
      error: () => {
        this.toast.error('Failed to send message.');
        this.sending.set(false);
      },
    });
  }

  private startNewConversation(recipientId: string): void {
    const existing = this.conversations().find((c) => c.otherUserId === recipientId);
    if (existing) {
      this.openConversation(existing);
    } else {
      this.activeConvo.set({
        id: '',
        otherUserId: recipientId,
        otherUserName: 'Loading...',
        lastMessage: null,
        unreadCount: 0,
        lastMessageAt: new Date().toISOString(),
      });
    }
  }

  onEnterKey(event: Event): void {
    event.preventDefault();
    this.sendMessage();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.chatContainer?.nativeElement.scrollTo({
        top: this.chatContainer.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  }
}
