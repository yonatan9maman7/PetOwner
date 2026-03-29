import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../api-base.token';
import { AuthService } from './auth.service';

export interface ChatConversation {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessageSnippet: string | null;
  unreadCount: number;
  lastMessageAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  sentAt: string;
}

export interface ChatNewMessageResponse {
  conversationId: string;
  message: ChatMessage;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private connection: signalR.HubConnection | null = null;

  readonly conversations = signal<ChatConversation[]>([]);
  readonly activeMessages = signal<ChatMessage[]>([]);
  readonly totalUnread = signal(0);
  readonly incomingMessage = signal<ChatNewMessageResponse | null>(null);

  readonly activeOtherUserId = signal<string | null>(null);

  private chatHubUrl(): string {
    const base = this.apiBaseUrl.trim().replace(/\/$/, '');
    return base ? `${base}/hubs/chat` : '/hubs/chat';
  }

  // ─── SignalR ───

  startConnection(): void {
    const token = this.auth.token();
    if (!token || this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.chatHubUrl(), { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    this.connection.on('ReceiveMessage', (response: ChatNewMessageResponse) => {
      this.handleIncoming(response);
    });

    this.connection.on('MessageSent', (response: ChatNewMessageResponse) => {
      this.handleSent(response);
    });

    this.connection.start().catch(() => {});
  }

  stopConnection(): void {
    this.connection?.stop();
    this.connection = null;
  }

  sendMessage(recipientId: string, content: string): void {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: ChatMessage = {
      id: tempId,
      senderId: this.auth.userId() ?? '',
      senderName: '',
      content: content.trim(),
      isRead: false,
      sentAt: new Date().toISOString(),
    };
    this.activeMessages.update(msgs => [...msgs, optimistic]);

    this.connection.invoke('SendMessage', recipientId, content).catch(() => {
      this.activeMessages.update(msgs => msgs.filter(m => m.id !== tempId));
    });
  }

  // ─── REST ───

  loadConversations(): Observable<ChatConversation[]> {
    return this.http.get<ChatConversation[]>('/api/chat/conversations').pipe(
      tap(convos => {
        this.conversations.set(convos);
        this.totalUnread.set(convos.reduce((sum, c) => sum + c.unreadCount, 0));
      }),
    );
  }

  loadMessages(otherUserId: string, page = 1): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`/api/chat/${otherUserId}?page=${page}`).pipe(
      tap(msgs => {
        if (page === 1) {
          this.activeMessages.set(msgs);
        } else {
          this.activeMessages.update(prev => [...msgs, ...prev]);
        }
      }),
    );
  }

  markAsRead(otherUserId: string): Observable<{ markedRead: number }> {
    return this.http.post<{ markedRead: number }>(`/api/chat/${otherUserId}/read`, {}).pipe(
      tap(res => {
        if (res.markedRead > 0) {
          this.conversations.update(list =>
            list.map(c => c.otherUserId === otherUserId ? { ...c, unreadCount: 0 } : c)
          );
          this.recalcUnread();
        }
      }),
    );
  }

  // ─── Internal handlers ───

  private handleIncoming(response: ChatNewMessageResponse): void {
    this.incomingMessage.set(response);

    if (this.activeOtherUserId() === response.message.senderId) {
      this.activeMessages.update(msgs => [...msgs, response.message]);
      this.markAsRead(response.message.senderId).subscribe();
    } else {
      this.conversations.update(list => {
        const idx = list.findIndex(c => c.conversationId === response.conversationId);
        if (idx >= 0) {
          const updated = { ...list[idx], lastMessageSnippet: response.message.content, lastMessageAt: response.message.sentAt, unreadCount: list[idx].unreadCount + 1 };
          return [updated, ...list.filter((_, i) => i !== idx)];
        }
        return [{
          conversationId: response.conversationId,
          otherUserId: response.message.senderId,
          otherUserName: response.message.senderName,
          otherUserAvatar: null,
          lastMessageSnippet: response.message.content,
          unreadCount: 1,
          lastMessageAt: response.message.sentAt,
        }, ...list];
      });
      this.recalcUnread();
    }
  }

  private handleSent(response: ChatNewMessageResponse): void {
    const myId = this.auth.userId();
    if (response.message.senderId === myId && this.activeOtherUserId()) {
      this.activeMessages.update(msgs => {
        if (msgs.some(m => m.id === response.message.id)) return msgs;
        const tempIdx = msgs.findIndex(
          m => m.id.startsWith('temp-') && m.content === response.message.content
        );
        if (tempIdx >= 0) {
          const updated = [...msgs];
          updated[tempIdx] = response.message;
          return updated;
        }
        return [...msgs, response.message];
      });
    }

    this.conversations.update(list => {
      const idx = list.findIndex(c => c.conversationId === response.conversationId);
      if (idx >= 0) {
        const updated = { ...list[idx], lastMessageSnippet: response.message.content, lastMessageAt: response.message.sentAt };
        return [updated, ...list.filter((_, i) => i !== idx)];
      }
      return list;
    });
  }

  private recalcUnread(): void {
    this.totalUnread.set(this.conversations().reduce((sum, c) => sum + c.unreadCount, 0));
  }
}
