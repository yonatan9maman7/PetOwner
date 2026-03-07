import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string | null;
  unreadCount: number;
  lastMessageAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface SendResult {
  conversationId: string;
  message: ChatMessage;
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly http = inject(HttpClient);

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>('/api/messages/conversations');
  }

  getMessages(conversationId: string, page = 1): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`/api/messages/${conversationId}?page=${page}`);
  }

  send(recipientId: string, content: string): Observable<SendResult> {
    return this.http.post<SendResult>('/api/messages/send', { recipientId, content });
  }

  getUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>('/api/messages/unread-count');
  }
}
