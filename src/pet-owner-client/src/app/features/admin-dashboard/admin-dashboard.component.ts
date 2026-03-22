import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe, CurrencyPipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  AdminService,
  AdminStats,
  AdminUser,
  AdminBooking,
} from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';
import { PendingProvider } from '../../models/pending-provider.model';

type Tab = 'overview' | 'users' | 'bookings' | 'providers';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, CurrencyPipe, TranslatePipe],
  template: `
    <div class="min-h-screen bg-gray-50 p-4 md:p-10" dir="auto">
      <div class="max-w-6xl mx-auto">

        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div class="text-start">
            <h1 class="text-3xl font-bold text-gray-800 mb-1">{{ 'ADMIN.PANEL_TITLE' | translate }}</h1>
            <p class="text-gray-500">{{ 'ADMIN.PANEL_SUBTITLE' | translate }}</p>
          </div>
          <button
            type="button"
            (click)="generateDemoEcosystem()"
            [disabled]="seeding()"
            class="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0">
            @if (seeding()) {
              <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0"></div>
              {{ 'ADMIN.SEEDING' | translate }}
            } @else {
              {{ 'ADMIN.GENERATE_DEMO' | translate }}
            }
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
          @for (t of tabs; track t.key) {
            <button
              type="button"
              (click)="activeTab.set(t.key)"
              class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
              [class]="activeTab() === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'">
              {{ t.label | translate }}
            </button>
          }
        </div>

        <!-- ===== Overview Tab ===== -->
        @if (activeTab() === 'overview') {
          @if (loadingStats()) {
            <div class="flex items-center justify-center py-20">
              <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shrink-0"></div>
              <span class="ms-3 text-gray-500">{{ 'ADMIN.LOADING' | translate }}</span>
            </div>
          } @else if (stats()) {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Users Card -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-start">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <span class="text-sm font-medium text-gray-500">{{ 'ADMIN.STAT_USERS' | translate }}</span>
                </div>
                <p class="text-3xl font-bold text-gray-900">{{ stats()!.totalUsers | number }}</p>
              </div>

              <!-- Providers Card -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-start">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <span class="text-sm font-medium text-gray-500">{{ 'ADMIN.STAT_PROVIDERS' | translate }}</span>
                </div>
                <p class="text-3xl font-bold text-gray-900">{{ stats()!.totalProviders | number }}</p>
              </div>

              <!-- Bookings Card -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-start">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <svg class="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <span class="text-sm font-medium text-gray-500">{{ 'ADMIN.STAT_BOOKINGS' | translate }}</span>
                </div>
                <p class="text-3xl font-bold text-gray-900">{{ stats()!.totalBookings | number }}</p>
              </div>

              <!-- Revenue Card -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-start">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span class="text-sm font-medium text-gray-500">{{ 'ADMIN.STAT_REVENUE' | translate }}</span>
                </div>
                <p class="text-3xl font-bold text-gray-900" dir="ltr">{{ stats()!.totalPlatformRevenue | currency:'ILS':'symbol-narrow':'1.0-0' }}</p>
              </div>
            </div>
          }
        }

        <!-- ===== Users Tab ===== -->
        @if (activeTab() === 'users') {
          @if (loadingUsers()) {
            <div class="flex items-center justify-center py-20">
              <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shrink-0"></div>
              <span class="ms-3 text-gray-500">{{ 'ADMIN.LOADING' | translate }}</span>
            </div>
          } @else {
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_NAME' | translate }}</th>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_EMAIL' | translate }}</th>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_ROLE' | translate }}</th>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_PROVIDER' | translate }}</th>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_REGISTERED' | translate }}</th>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_STATUS' | translate }}</th>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_ACTIONS' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    @for (user of users(); track user.id) {
                      <tr class="hover:bg-gray-50/50 transition-colors">
                        <td class="px-4 py-3 font-medium text-gray-900" dir="auto">{{ user.name }}</td>
                        <td class="px-4 py-3 text-gray-600" dir="ltr">{{ user.email }}</td>
                        <td class="px-4 py-3">
                          <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                                [class]="user.role === 'Admin' ? 'bg-red-100 text-red-700' :
                                         user.role === 'Provider' ? 'bg-emerald-100 text-emerald-700' :
                                         'bg-blue-100 text-blue-700'">
                            {{ user.role }}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-gray-500">{{ user.providerStatus ?? '—' }}</td>
                        <td class="px-4 py-3 text-gray-500">{{ user.createdAt | date:'mediumDate' }}</td>
                        <td class="px-4 py-3">
                          <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                                [class]="user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                            {{ (user.isActive ? 'ADMIN.ACTIVE' : 'ADMIN.BLOCKED') | translate }}
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          @if (user.role !== 'Admin') {
                            <button
                              type="button"
                              (click)="toggleUserStatus(user)"
                              [disabled]="togglingId() === user.id"
                              class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
                              [class]="user.isActive
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-green-500 hover:bg-green-600'">
                              @if (togglingId() === user.id) {
                                <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0"></div>
                              }
                              {{ (user.isActive ? 'ADMIN.BLOCK' : 'ADMIN.UNBLOCK') | translate }}
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (users().length === 0) {
                <div class="py-12 text-center text-gray-400">{{ 'ADMIN.NO_USERS' | translate }}</div>
              }
            </div>
          }
        }

        <!-- ===== Bookings Tab ===== -->
        @if (activeTab() === 'bookings') {
          @if (loadingBookings()) {
            <div class="flex items-center justify-center py-20">
              <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shrink-0"></div>
              <span class="ms-3 text-gray-500">{{ 'ADMIN.LOADING' | translate }}</span>
            </div>
          } @else {
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_OWNER' | translate }}</th>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_PROVIDER_NAME' | translate }}</th>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_SERVICE' | translate }}</th>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_STATUS' | translate }}</th>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_PRICE' | translate }}</th>
                      <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_DATE' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    @for (b of bookings(); track b.id) {
                      <tr class="hover:bg-gray-50/50 transition-colors">
                        <td class="px-4 py-3 font-medium text-gray-900" dir="auto">{{ b.ownerName }}</td>
                        <td class="px-4 py-3 text-gray-700" dir="auto">{{ b.providerName }}</td>
                        <td class="px-4 py-3">
                          <span class="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                            {{ b.service }}
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                                [class]="b.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                         b.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                         b.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                                         'bg-amber-100 text-amber-700'">
                            {{ b.status }}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-gray-700 tabular-nums" dir="ltr">{{ b.totalPrice | currency:'ILS':'symbol-narrow':'1.0-0' }}</td>
                        <td class="px-4 py-3 text-gray-500">{{ b.startDate | date:'mediumDate' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (bookings().length === 0) {
                <div class="py-12 text-center text-gray-400">{{ 'ADMIN.NO_BOOKINGS' | translate }}</div>
              }
            </div>
          }
        }

        <!-- ===== Providers (Pending) Tab ===== -->
        @if (activeTab() === 'providers') {
          @if (loadingProviders()) {
            <div class="flex items-center justify-center py-20">
              <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shrink-0"></div>
              <span class="ms-3 text-gray-500">{{ 'ADMIN.LOADING' | translate }}</span>
            </div>
          }

          @if (!loadingProviders() && providers().length === 0) {
            <div class="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100">
              <svg class="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 class="mt-4 text-lg font-semibold text-gray-700">{{ 'ADMIN.ALL_CAUGHT_UP' | translate }}</h3>
              <p class="mt-1 text-gray-400">{{ 'ADMIN.NO_PENDING' | translate }}</p>
            </div>
          }

          @if (!loadingProviders() && providers().length > 0) {
            @if (providers().length === 1) {
              <p class="text-sm text-gray-400 mb-4 text-start">{{ 'ADMIN.PENDING_ONE' | translate }}</p>
            } @else {
              <p class="text-sm text-gray-400 mb-4 text-start">
                {{ 'ADMIN.PENDING_MANY' | translate: { count: providers().length } }}
              </p>
            }

            <div class="grid gap-4">
              @for (provider of providers(); track provider.userId) {
                <div class="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md">
                  <button
                    type="button"
                    (click)="toggleExpand(provider.userId)"
                    class="w-full text-start px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                    <div class="shrink-0 w-14 h-14 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden flex items-center justify-center">
                      @if (provider.profileImageUrl) {
                        <img [src]="provider.profileImageUrl" [alt]="provider.name" class="w-full h-full object-cover" />
                      } @else {
                        <svg class="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                      }
                    </div>
                    <div class="flex-1 min-w-0 text-start">
                      <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="font-semibold text-gray-800">{{ provider.name }}</h3>
                        <span class="text-xs text-gray-400">{{ provider.phone }}</span>
                      </div>
                      <div class="flex flex-wrap gap-1.5 mt-1.5">
                        @for (svc of provider.services; track svc) {
                          <span class="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{{ svc }}</span>
                        }
                      </div>
                    </div>
                    <svg class="w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200"
                         [class.rotate-180]="expandedId() === provider.userId"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  @if (expandedId() === provider.userId) {
                    <div class="border-t border-gray-100 px-5 py-5 bg-gray-50/30">
                      <div class="grid gap-4 sm:grid-cols-2">
                        <div class="sm:col-span-2 text-start">
                          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ 'ADMIN.LABEL_BIO' | translate }}</span>
                          <p class="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{{ provider.bio ?? ('ADMIN.NO_BIO' | translate) }}</p>
                        </div>
                        <div class="text-start">
                          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ 'ADMIN.APPLIED' | translate }}</span>
                          <p class="mt-1 text-sm text-gray-800">{{ provider.createdAt | date:'mediumDate' }}</p>
                        </div>
                        <div class="text-start">
                          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ 'ADMIN.PHONE' | translate }}</span>
                          <p class="mt-1 text-sm text-gray-800">{{ provider.phone }}</p>
                        </div>
                        <div class="sm:col-span-2 text-start">
                          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ 'ADMIN.LOCATION' | translate }}</span>
                          <p class="mt-1 text-sm text-gray-800">{{ provider.address ?? ('ADMIN.NO_ADDRESS' | translate) }}</p>
                        </div>
                        <div class="text-start">
                          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ 'ADMIN.REF_NAME' | translate }}</span>
                          <p class="mt-1 text-sm text-gray-800">{{ provider.referenceName ?? ('ADMIN.N_A' | translate) }}</p>
                        </div>
                        <div class="text-start">
                          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ 'ADMIN.REF_CONTACT' | translate }}</span>
                          <p class="mt-1 text-sm text-gray-800">{{ provider.referenceContact ?? ('ADMIN.N_A' | translate) }}</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-3 mt-5 pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          (click)="approve(provider.userId)"
                          [disabled]="approvingId() === provider.userId"
                          class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                          @if (approvingId() === provider.userId) {
                            <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0"></div>
                            {{ 'ADMIN.APPROVING' | translate }}
                          } @else {
                            {{ 'ADMIN.APPROVE' | translate }}
                          }
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

      </div>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly tabs = [
    { key: 'overview' as Tab, label: 'ADMIN.TAB_OVERVIEW' },
    { key: 'users' as Tab, label: 'ADMIN.TAB_USERS' },
    { key: 'bookings' as Tab, label: 'ADMIN.TAB_BOOKINGS' },
    { key: 'providers' as Tab, label: 'ADMIN.TAB_PROVIDERS' },
  ];

  activeTab = signal<Tab>('overview');

  stats = signal<AdminStats | null>(null);
  loadingStats = signal(true);

  users = signal<AdminUser[]>([]);
  loadingUsers = signal(true);
  togglingId = signal<string | null>(null);

  bookings = signal<AdminBooking[]>([]);
  loadingBookings = signal(true);

  providers = signal<PendingProvider[]>([]);
  loadingProviders = signal(true);
  approvingId = signal<string | null>(null);
  expandedId = signal<string | null>(null);
  seeding = signal(false);

  ngOnInit(): void {
    this.loadStats();
    this.loadUsers();
    this.loadBookings();
    this.loadPending();
  }

  toggleExpand(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  generateDemoEcosystem(): void {
    this.seeding.set(true);
    this.adminService.seedDummyData().subscribe({
      next: () => {
        this.toast.success(this.translate.instant('ADMIN.TOAST_SEED_OK'));
        this.seeding.set(false);
        this.loadStats();
        this.loadUsers();
        this.loadBookings();
        this.loadPending();
      },
      error: () => this.seeding.set(false),
    });
  }

  approve(providerId: string): void {
    this.approvingId.set(providerId);
    this.adminService.approveProvider(providerId).subscribe({
      next: () => {
        this.providers.update((list) => list.filter((p) => p.userId !== providerId));
        this.approvingId.set(null);
        if (this.expandedId() === providerId) this.expandedId.set(null);
      },
      error: () => this.approvingId.set(null),
    });
  }

  toggleUserStatus(user: AdminUser): void {
    this.togglingId.set(user.id);
    this.adminService.toggleUserStatus(user.id).subscribe({
      next: (res) => {
        this.users.update((list) =>
          list.map((u) => (u.id === user.id ? { ...u, isActive: res.isActive } : u))
        );
        this.togglingId.set(null);
      },
      error: () => this.togglingId.set(null),
    });
  }

  private loadStats(): void {
    this.adminService.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loadingStats.set(false);
      },
      error: () => this.loadingStats.set(false),
    });
  }

  private loadUsers(): void {
    this.adminService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false),
    });
  }

  private loadBookings(): void {
    this.adminService.getBookings().subscribe({
      next: (data) => {
        this.bookings.set(data);
        this.loadingBookings.set(false);
      },
      error: () => this.loadingBookings.set(false),
    });
  }

  private loadPending(): void {
    this.adminService.getPendingProviders().subscribe({
      next: (data) => {
        this.providers.set(data);
        this.loadingProviders.set(false);
      },
      error: () => this.loadingProviders.set(false),
    });
  }
}
