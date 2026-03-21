import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ProviderService, ProviderDashboardStats } from '../../services/provider.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, TranslatePipe],
  template: `
    <div class="min-h-screen bg-gray-50 pb-24" dir="auto">
      <!-- Header -->
      <div class="bg-gradient-to-br from-violet-600 to-indigo-700 text-white px-5 pt-10 pb-14">
        <h1 class="text-2xl font-bold text-start">{{ 'DASHBOARD.PROVIDER_TITLE' | translate }}</h1>
        <p class="text-violet-200 text-sm mt-1 text-start">{{ 'DASHBOARD.PROVIDER_SUBTITLE' | translate }}</p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-16">
          <div class="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (stats()) {
        <div class="px-5 -mt-8 max-w-lg mx-auto space-y-4">
          <!-- Availability Toggle -->
          <div class="bg-white rounded-2xl shadow-md p-5 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <span class="relative flex h-3 w-3 shrink-0">
                @if (isAvailable()) {
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                } @else {
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-gray-300"></span>
                }
              </span>
              <div class="min-w-0 text-start">
                <p class="text-sm font-semibold text-gray-900">
                  {{ 'DASHBOARD.STATUS_LABEL' | translate }}:
                  <span [class]="isAvailable() ? 'text-emerald-600' : 'text-gray-400'">
                    {{ isAvailable() ? ('DASHBOARD.ONLINE' | translate) : ('DASHBOARD.OFFLINE' | translate) }}
                  </span>
                </p>
                <p class="text-xs text-gray-400 mt-0.5">{{ 'DASHBOARD.AVAILABILITY_HINT' | translate }}</p>
              </div>
            </div>
            <button
              (click)="toggleAvailability()"
              [disabled]="togglingAvailability()"
              [class]="'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 ' + (isAvailable() ? 'bg-emerald-500' : 'bg-gray-200')"
              role="switch"
              [attr.aria-checked]="isAvailable()">
              <span
                [class]="'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ' + (isAvailable() ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0 rtl:translate-x-0')">
              </span>
            </button>
          </div>

          <!-- Stat Cards Grid -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-white rounded-2xl shadow-md p-4 text-start">
              <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">{{ 'DASHBOARD.STAT_TOTAL_BOOKINGS' | translate }}</p>
              <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats()!.totalBookings }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ 'DASHBOARD.STAT_COMPLETION' | translate: { rate: stats()!.completionRate } }}</p>
            </div>
            <div class="bg-white rounded-2xl shadow-md p-4 text-start">
              <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">{{ 'DASHBOARD.STAT_TOTAL_EARNINGS' | translate }}</p>
              <p class="text-3xl font-bold text-emerald-600 mt-1">₪{{ stats()!.totalEarnings }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ 'DASHBOARD.STAT_MONTH_EARNINGS' | translate: { amount: stats()!.monthlyEarnings } }}</p>
            </div>
            <div class="bg-white rounded-2xl shadow-md p-4 text-start">
              <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">{{ 'DASHBOARD.STAT_RATING' | translate }}</p>
              <div class="flex items-baseline gap-1 mt-1">
                <p class="text-3xl font-bold text-amber-500">{{ stats()!.averageRating || '—' }}</p>
                <span class="text-amber-400">&#9733;</span>
              </div>
              <p class="text-xs text-gray-400 mt-1">{{ 'DASHBOARD.STAT_REVIEWS' | translate: { count: stats()!.reviewCount } }}</p>
            </div>
            <div class="bg-white rounded-2xl shadow-md p-4 text-start">
              <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">{{ 'DASHBOARD.STAT_PENDING' | translate }}</p>
              <p class="text-3xl font-bold text-orange-500 mt-1">{{ stats()!.pendingBookings }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ 'DASHBOARD.STAT_CANCELLED' | translate: { count: stats()!.cancelledBookings } }}</p>
            </div>
          </div>

          <!-- Today's Schedule -->
          <div class="bg-white rounded-2xl shadow-md p-5">
            <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-start">{{ 'DASHBOARD.TODAY_SCHEDULE' | translate }}</h2>
            @if (stats()!.todaySchedule.length === 0) {
              <p class="text-sm text-gray-400 text-center py-4">{{ 'DASHBOARD.NO_APPOINTMENTS_TODAY' | translate }}</p>
            } @else {
              <div class="space-y-2.5">
                @for (item of stats()!.todaySchedule; track item.id) {
                  <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div class="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm shrink-0">
                      {{ item.petOwnerName.charAt(0) }}
                    </div>
                    <div class="min-w-0 flex-1 text-start">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ item.petOwnerName }}</p>
                      @if (item.petName) {
                        <p class="text-xs text-gray-500">{{ item.petName }}</p>
                      }
                    </div>
                    <div class="text-end shrink-0">
                      <p class="text-xs font-medium text-gray-700">{{ item.timeSlot }}</p>
                      <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        [class]="item.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'">
                        {{ bookingStatusKey(item.status) | translate }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Upcoming Bookings -->
          <div class="bg-white rounded-2xl shadow-md p-5">
            <div class="flex items-center justify-between gap-2 mb-3">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider text-start">{{ 'DASHBOARD.UPCOMING_BOOKINGS' | translate }}</h2>
              <a routerLink="/requests" class="text-xs text-violet-600 font-medium hover:underline shrink-0">{{ 'DASHBOARD.VIEW_ALL' | translate }}</a>
            </div>
            @if (stats()!.upcomingBookings.length === 0) {
              <p class="text-sm text-gray-400 text-center py-4">{{ 'DASHBOARD.NO_UPCOMING_BOOKINGS' | translate }}</p>
            } @else {
              <div class="space-y-2.5">
                @for (booking of stats()!.upcomingBookings; track booking.id) {
                  <div class="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      [class]="booking.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'">
                      {{ booking.petOwnerName.charAt(0) }}
                    </div>
                    <div class="min-w-0 flex-1 text-start">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ booking.petOwnerName }}</p>
                      <p class="text-xs text-gray-500">
                        @if (booking.serviceName) { {{ booking.serviceName }} · }
                        @if (booking.scheduledStart) { {{ booking.scheduledStart | date:'MMM d, HH:mm' }} }
                      </p>
                    </div>
                    <div class="text-end shrink-0">
                      @if (booking.totalPrice) {
                        <p class="text-sm font-bold text-gray-900">₪{{ booking.totalPrice }}</p>
                      }
                      <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        [class]="booking.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'">
                        {{ bookingStatusKey(booking.status) | translate }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Quick Links -->
          <div class="grid grid-cols-2 gap-3">
            <a routerLink="/edit-profile"
               class="bg-white rounded-2xl shadow-md p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
              <div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span class="text-sm font-medium text-gray-700 text-start">{{ 'DASHBOARD.LINK_EDIT_PROFILE' | translate }}</span>
            </a>
            <a routerLink="/earnings"
               class="bg-white rounded-2xl shadow-md p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
              <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span class="text-sm font-medium text-gray-700 text-start">{{ 'DASHBOARD.LINK_EARNINGS' | translate }}</span>
            </a>
          </div>
        </div>
      } @else {
        <div class="flex flex-col items-center justify-center py-16 gap-4 px-4">
          <p class="text-gray-500 text-center text-start max-w-sm">{{ 'DASHBOARD.ERROR_LOAD' | translate }}</p>
          <button type="button" (click)="loadStats()" class="text-violet-600 font-medium hover:underline">{{ 'DASHBOARD.RETRY' | translate }}</button>
        </div>
      }
    </div>
  `,
})
export class ProviderDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly providerService = inject(ProviderService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  stats = signal<ProviderDashboardStats | null>(null);
  loading = signal(true);
  isAvailable = signal(false);
  togglingAvailability = signal(false);

  bookingStatusKey(status: string): string {
    switch (status) {
      case 'Pending':
        return 'DASHBOARD.STATUS_PENDING';
      case 'Completed':
        return 'DASHBOARD.STATUS_COMPLETED';
      case 'Cancelled':
        return 'DASHBOARD.STATUS_CANCELLED';
      case 'Confirmed':
        return 'DASHBOARD.STATUS_CONFIRMED';
      default:
        return 'DASHBOARD.STATUS_PENDING';
    }
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadAvailability();
  }

  toggleAvailability(): void {
    const newValue = !this.isAvailable();
    this.togglingAvailability.set(true);

    this.providerService.updateAvailability(newValue).subscribe({
      next: (res) => {
        this.isAvailable.set(res.isAvailableNow);
        this.togglingAvailability.set(false);
        this.toast.success(
          res.isAvailableNow
            ? this.translate.instant('DASHBOARD.TOAST_NOW_VISIBLE')
            : this.translate.instant('DASHBOARD.TOAST_NOW_OFFLINE')
        );
      },
      error: () => {
        this.togglingAvailability.set(false);
        this.toast.error(this.translate.instant('DASHBOARD.TOAST_AVAILABILITY_FAILED'));
      },
    });
  }

  loadStats(): void {
    this.loading.set(true);
    this.providerService.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private loadAvailability(): void {
    this.providerService.getMe().subscribe({
      next: (profile) => {
        if (profile) {
          this.isAvailable.set(profile.isAvailableNow);
        }
      },
    });
  }
}
