import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { TimeAgoPipe } from '../../shared/time-ago.pipe';

@Component({
  selector: 'app-notifications-history',
  standalone: true,
  imports: [TranslatePipe, TimeAgoPipe],
  template: `
    <div class="min-h-screen bg-gray-50 p-4 md:p-10" dir="auto">
      <div class="max-w-2xl mx-auto">

        <div class="flex items-center justify-between mb-6">
          <div class="text-start">
            <h1 class="text-2xl font-bold text-gray-800">{{ 'NOTIFICATIONS.HISTORY_TITLE' | translate }}</h1>
            <p class="text-sm text-gray-500 mt-1">{{ 'NOTIFICATIONS.HISTORY_SUBTITLE' | translate }}</p>
          </div>
          @if (notifications().length > 0 && hasUnread()) {
            <button
              type="button"
              (click)="markAllRead()"
              [disabled]="markingAll()"
              class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors shrink-0">
              @if (markingAll()) {
                <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0"></div>
              }
              {{ 'NOTIFICATIONS.MARK_ALL_READ' | translate }}
            </button>
          }
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-20">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent shrink-0"></div>
            <span class="ms-3 text-gray-500">{{ 'NOTIFICATIONS.LOADING' | translate }}</span>
          </div>
        } @else if (notifications().length === 0) {
          <div class="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100">
            <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 class="mt-4 text-lg font-semibold text-gray-700">{{ 'NOTIFICATIONS.EMPTY' | translate }}</h3>
          </div>
        } @else {
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
            @for (n of notifications(); track n.id) {
              <button
                type="button"
                (click)="markRead(n)"
                class="w-full text-start px-5 py-4 hover:bg-gray-50 transition-colors"
                [class.bg-violet-50]="!n.isRead">
                <div class="flex items-start gap-3">
                  <div class="mt-1 w-2.5 h-2.5 rounded-full shrink-0"
                       [class]="n.isRead ? 'bg-gray-200' : 'bg-violet-500'"></div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="text-sm"
                         [class]="n.isRead ? 'font-normal text-gray-600' : 'font-semibold text-gray-900'">
                        {{ n.title }}
                      </p>
                      @if (!n.isRead) {
                        <span class="inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 uppercase">
                          {{ 'NOTIFICATIONS.UNREAD' | translate }}
                        </span>
                      }
                    </div>
                    <p class="text-sm text-gray-500 mt-0.5">{{ n.body }}</p>
                    <div class="flex items-center gap-3 mt-1.5">
                      <span class="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        {{ n.type }}
                      </span>
                      <span class="text-[11px] text-gray-400">{{ n.createdAt | timeAgo }}</span>
                    </div>
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
export class NotificationsHistoryComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);

  notifications = signal<AppNotification[]>([]);
  loading = signal(true);
  markingAll = signal(false);

  hasUnread(): boolean {
    return this.notifications().some(n => !n.isRead);
  }

  ngOnInit(): void {
    this.loadAll();
  }

  markRead(n: AppNotification): void {
    if (n.isRead) return;
    this.notificationService.markAsRead(n.id).subscribe(() => {
      this.notifications.update(list =>
        list.map(item => item.id === n.id ? { ...item, isRead: true } : item)
      );
    });
  }

  markAllRead(): void {
    this.markingAll.set(true);
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
        this.markingAll.set(false);
      },
      error: () => this.markingAll.set(false),
    });
  }

  private loadAll(): void {
    this.notificationService.loadNotifications().subscribe({
      next: (data) => {
        this.notifications.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
