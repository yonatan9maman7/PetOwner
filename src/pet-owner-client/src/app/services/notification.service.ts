import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { TranslateService } from '@ngx-translate/core';
import { API_BASE_URL } from '../api-base.token';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private connection: signalR.HubConnection | null = null;

  private notificationsHubUrl(): string {
    const base = this.apiBaseUrl.trim().replace(/\/$/, '');
    return base ? `${base}/hubs/notifications` : '/hubs/notifications';
  }

  readonly unreadCount = signal(0);
  readonly notifications = signal<AppNotification[]>([]);
  readonly newNotification = signal<AppNotification | null>(null);

  startConnection(): void {
    const token = this.auth.token();
    if (!token || this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.notificationsHubUrl(), { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    this.connection.on('ReceiveNotification', (notification: AppNotification) => {
      this.notifications.update(list => [notification, ...list]);
      this.unreadCount.update(c => c + 1);
      this.newNotification.set(notification);
      this.toast.show(notification.title || this.translate.instant('NOTIFICATIONS.NEW'), 'info');
    });

    this.connection.start().catch(() => {});
  }

  stopConnection(): void {
    this.connection?.stop();
    this.connection = null;
  }

  loadNotifications(page = 1): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`/api/notifications?page=${page}`);
  }

  loadUnreadCount(): void {
    this.http.get<{ count: number }>('/api/notifications/unread-count').subscribe({
      next: (res) => this.unreadCount.set(res.count),
    });
  }

  markAsRead(id: string): Observable<void> {
    return new Observable(sub => {
      this.http.put<void>(`/api/notifications/${id}/read`, {}).subscribe({
        next: () => {
          this.notifications.update(list =>
            list.map(n => n.id === id ? { ...n, isRead: true } : n)
          );
          this.unreadCount.update(c => Math.max(0, c - 1));
          sub.next();
          sub.complete();
        },
        error: (err) => sub.error(err),
      });
    });
  }

  markAllAsRead(): Observable<void> {
    return new Observable(sub => {
      this.http.post<void>('/api/notifications/read-all', {}).subscribe({
        next: () => {
          this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
          this.unreadCount.set(0);
          sub.next();
          sub.complete();
        },
        error: (err) => sub.error(err),
      });
    });
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`/api/notifications/${id}`);
  }
}
