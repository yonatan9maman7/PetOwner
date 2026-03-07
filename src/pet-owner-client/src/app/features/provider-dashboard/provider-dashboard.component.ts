import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProviderService, ProviderDashboardStats } from '../../services/provider.service';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 pb-24">
      <!-- Header -->
      <div class="bg-gradient-to-br from-violet-600 to-indigo-700 text-white px-5 pt-10 pb-14">
        <h1 class="text-2xl font-bold">Provider Dashboard</h1>
        <p class="text-violet-200 text-sm mt-1">Your business at a glance</p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-16">
          <div class="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (stats()) {
        <div class="px-5 -mt-8 max-w-lg mx-auto space-y-4">
          <!-- Stat Cards Grid -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-white rounded-2xl shadow-md p-4">
              <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Bookings</p>
              <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats()!.totalBookings }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ stats()!.completionRate }}% completion</p>
            </div>
            <div class="bg-white rounded-2xl shadow-md p-4">
              <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Earnings</p>
              <p class="text-3xl font-bold text-emerald-600 mt-1">₪{{ stats()!.totalEarnings }}</p>
              <p class="text-xs text-gray-400 mt-1">₪{{ stats()!.monthlyEarnings }} this month</p>
            </div>
            <div class="bg-white rounded-2xl shadow-md p-4">
              <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Rating</p>
              <div class="flex items-baseline gap-1 mt-1">
                <p class="text-3xl font-bold text-amber-500">{{ stats()!.averageRating || '—' }}</p>
                <span class="text-amber-400">&#9733;</span>
              </div>
              <p class="text-xs text-gray-400 mt-1">{{ stats()!.reviewCount }} reviews</p>
            </div>
            <div class="bg-white rounded-2xl shadow-md p-4">
              <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Pending</p>
              <p class="text-3xl font-bold text-orange-500 mt-1">{{ stats()!.pendingBookings }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ stats()!.cancelledBookings }} cancelled</p>
            </div>
          </div>

          <!-- Today's Schedule -->
          <div class="bg-white rounded-2xl shadow-md p-5">
            <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today's Schedule</h2>
            @if (stats()!.todaySchedule.length === 0) {
              <p class="text-sm text-gray-400 text-center py-4">No appointments today</p>
            } @else {
              <div class="space-y-2.5">
                @for (item of stats()!.todaySchedule; track item.id) {
                  <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div class="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm shrink-0">
                      {{ item.petOwnerName.charAt(0) }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ item.petOwnerName }}</p>
                      @if (item.petName) {
                        <p class="text-xs text-gray-500">{{ item.petName }}</p>
                      }
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-xs font-medium text-gray-700">{{ item.timeSlot }}</p>
                      <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        [class]="item.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'">
                        {{ item.status }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Upcoming Bookings -->
          <div class="bg-white rounded-2xl shadow-md p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming Bookings</h2>
              <a routerLink="/requests" class="text-xs text-violet-600 font-medium hover:underline">View all</a>
            </div>
            @if (stats()!.upcomingBookings.length === 0) {
              <p class="text-sm text-gray-400 text-center py-4">No upcoming bookings</p>
            } @else {
              <div class="space-y-2.5">
                @for (booking of stats()!.upcomingBookings; track booking.id) {
                  <div class="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      [class]="booking.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'">
                      {{ booking.petOwnerName.charAt(0) }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ booking.petOwnerName }}</p>
                      <p class="text-xs text-gray-500">
                        @if (booking.serviceName) { {{ booking.serviceName }} · }
                        @if (booking.scheduledStart) { {{ booking.scheduledStart | date:'MMM d, HH:mm' }} }
                      </p>
                    </div>
                    <div class="text-right shrink-0">
                      @if (booking.totalPrice) {
                        <p class="text-sm font-bold text-gray-900">₪{{ booking.totalPrice }}</p>
                      }
                      <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        [class]="booking.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'">
                        {{ booking.status }}
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
              <div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span class="text-sm font-medium text-gray-700">Edit Profile</span>
            </a>
            <a routerLink="/earnings"
               class="bg-white rounded-2xl shadow-md p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
              <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span class="text-sm font-medium text-gray-700">Earnings</span>
            </a>
          </div>
        </div>
      } @else {
        <div class="flex flex-col items-center justify-center py-16 gap-4">
          <p class="text-gray-500">Could not load dashboard data.</p>
          <button (click)="loadStats()" class="text-violet-600 font-medium hover:underline">Retry</button>
        </div>
      }
    </div>
  `,
})
export class ProviderDashboardComponent implements OnInit {
  private readonly providerService = inject(ProviderService);

  stats = signal<ProviderDashboardStats | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.providerService.getStats().subscribe({
      next: (s) => { this.stats.set(s); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }
}
