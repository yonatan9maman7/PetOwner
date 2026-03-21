import { Component, computed, inject, signal, effect } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from './services/auth.service';
import { ProviderService } from './services/provider.service';
import { NotificationService, AppNotification } from './services/notification.service';
import { LanguageService } from './services/language.service';
import { ToastContainerComponent } from './shared/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    DatePipe,
    ToastContainerComponent,
    TranslatePipe,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private router = inject(Router);
  readonly auth = inject(AuthService);
  readonly providerService = inject(ProviderService);
  readonly notificationService = inject(NotificationService);
  readonly language = inject(LanguageService);

  showNotificationPanel = signal(false);
  isProfileMenuOpen = signal(false);

  readonly userInitial = computed(() => {
    const name = this.auth.userName();
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  private url = toSignal(
    this.router.events.pipe(map(() => this.router.url)),
    { initialValue: this.router.url }
  );

  showNav = computed(() => {
    const u = this.url();
    return !u.startsWith('/login');
  });

  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());
  readonly isAdmin = computed(() => this.auth.userRole() === 'Admin');

  readonly providerStatus = computed(() => this.providerService.providerStatus());

  readonly canSwitchToProvider = computed(
    () => this.isLoggedIn() && this.providerStatus() === 'Approved',
  );

  readonly showBecomeASitter = computed(() => {
    const s = this.providerStatus();
    return this.isLoggedIn() && (s === 'None' || s === 'Rejected');
  });

  readonly isProviderPending = computed(
    () => this.isLoggedIn() && this.providerStatus() === 'Pending',
  );

  readonly currentMode = signal<'Owner' | 'Provider'>('Owner');

  private readonly resetModeOnLogout = effect(() => {
    if (!this.isLoggedIn()) {
      this.currentMode.set('Owner');
    }
  });

  private loggedInEffect = effect(() => {
    this.auth.token();
    if (this.auth.isLoggedIn()) {
      this.notificationService.stopConnection();
      this.notificationService.startConnection();
      this.notificationService.loadUnreadCount();
      this.notificationService.loadNotifications().subscribe({
        next: (list) => this.notificationService.notifications.set(list),
      });

      this.providerService.getMe().subscribe();
    } else {
      this.notificationService.stopConnection();
      this.providerService.providerStatus.set(null);
    }
  });

  toggleMode(): void {
    if (!this.canSwitchToProvider()) return;
    const newMode = this.currentMode() === 'Owner' ? 'Provider' : 'Owner';
    this.currentMode.set(newMode);
    this.router.navigate([newMode === 'Provider' ? '/provider-dashboard' : '/']);
  }

  toggleProfileMenu(): void {
    this.showNotificationPanel.set(false);
    this.isProfileMenuOpen.update(v => !v);
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  toggleNotifications(): void {
    this.isProfileMenuOpen.set(false);
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
