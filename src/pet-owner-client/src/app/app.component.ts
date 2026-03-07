import { Component, computed, inject, signal, effect, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AuthService } from './services/auth.service';
import { ProviderService } from './services/provider.service';
import { NotificationService, AppNotification } from './services/notification.service';
import { ToastContainerComponent } from './shared/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, DatePipe, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  readonly auth = inject(AuthService);
  private readonly providerService = inject(ProviderService);
  readonly notificationService = inject(NotificationService);

  showNotificationPanel = signal(false);

  private url = toSignal(
    this.router.events.pipe(map(() => this.router.url)),
    { initialValue: this.router.url }
  );

  showNav = computed(() => {
    const u = this.url();
    return !u.startsWith('/login');
  });

  readonly isAdmin = computed(() => this.auth.userRole() === 'Admin');

  private readonly hasProviderProfile = computed(() => {
    const status = this.providerService.providerStatus();
    return status === 'Pending' || status === 'Approved';
  });

  navItems = computed(() => {
    const items: { label: string; route: string; icon: string }[] = [
      { label: 'Map', route: '/', icon: 'map' },
    ];

    if (this.auth.isLoggedIn()) {
      items.push(
        { label: '🐾 My Pets', route: '/my-pets', icon: 'pets' },
        { label: 'Requests', route: '/requests', icon: 'requests' },
        { label: 'Feed', route: '/community', icon: 'feed' },
        { label: 'Chat', route: '/messages', icon: 'chat' },
      );

      if (this.hasProviderProfile()) {
        items.push(
          { label: 'Dashboard', route: '/provider-dashboard', icon: 'dashboard' },
        );
      } else {
        items.push(
          { label: 'Become a Sitter', route: '/become-a-sitter', icon: 'sitter' },
        );
      }
    }

    return items;
  });

  private loggedInEffect = effect(() => {
    if (this.auth.isLoggedIn()) {
      this.notificationService.startConnection();
      this.notificationService.loadUnreadCount();
      this.notificationService.loadNotifications().subscribe({
        next: (list) => this.notificationService.notifications.set(list),
      });
    } else {
      this.notificationService.stopConnection();
    }
  });

  ngOnInit(): void {}

  toggleNotifications(): void {
    this.showNotificationPanel.update(v => !v);
    if (this.showNotificationPanel()) {
      this.notificationService.loadNotifications().subscribe({
        next: (list) => this.notificationService.notifications.set(list),
      });
    }
  }

  markRead(n: AppNotification): void {
    if (!n.isRead) {
      this.notificationService.markAsRead(n.id).subscribe();
    }
    if (n.referenceId) {
      this.router.navigate(['/requests']);
      this.showNotificationPanel.set(false);
    }
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  logout(): void {
    this.notificationService.stopConnection();
    this.auth.logout();
  }
}
