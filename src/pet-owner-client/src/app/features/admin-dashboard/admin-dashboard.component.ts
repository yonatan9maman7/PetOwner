import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  AdminService,
  AdminStats,
  AdminUser,
  AdminBooking,
  AdminPet,
} from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';
import { PendingProvider } from '../../models/pending-provider.model';

type Tab = 'overview' | 'users' | 'pets' | 'providers';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, CurrencyPipe, TranslatePipe, FormsModule],
  template: `
    <div class="min-h-screen w-full bg-gray-50" dir="auto">
      <div class="flex flex-col md:flex-row min-h-screen">

        <!-- ===== Sidebar ===== -->
        <aside class="w-full md:w-64 bg-white border-b md:border-b-0 md:border-e border-gray-200 shrink-0">
          <div class="p-5 border-b border-gray-100">
            <h1 class="text-lg font-bold text-gray-800 flex items-center gap-2">
              <svg class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              {{ 'ADMIN.PANEL_TITLE' | translate }}
            </h1>
            <p class="text-xs text-gray-400 mt-1">{{ 'ADMIN.PANEL_SUBTITLE' | translate }}</p>
          </div>

          <nav class="flex md:flex-col gap-1 p-2 overflow-x-auto md:overflow-x-visible">
            @for (t of tabs; track t.key) {
              <button
                type="button"
                (click)="switchTab(t.key)"
                class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-start"
                [class]="activeTab() === t.key
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'">
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="t.icon" />
                </svg>
                {{ t.label | translate }}
                @if (t.key === 'providers' && stats()?.pendingProviders) {
                  <span class="ms-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {{ stats()!.pendingProviders }}
                  </span>
                }
              </button>
            }
          </nav>

          <!-- Developer Zone -->
          <div class="border-t border-gray-100 p-4 mt-2">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{{ 'ADMIN.DEV_ZONE' | translate }}</p>
            <div class="flex flex-col gap-2">
              <button
                type="button"
                (click)="generateDemoEcosystem()"
                [disabled]="seeding()"
                class="flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                @if (seeding()) {
                  <div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0"></div>
                } @else {
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                }
                {{ 'ADMIN.GENERATE_DEMO' | translate }}
              </button>
              <button
                type="button"
                (click)="seedBogusPets()"
                [disabled]="seedingPets()"
                class="flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                @if (seedingPets()) {
                  <div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0"></div>
                } @else {
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H3.75" />
                  </svg>
                }
                {{ 'ADMIN.SEED_PETS' | translate }}
              </button>
              <button
                type="button"
                (click)="clearSOSReports()"
                [disabled]="clearingSOS()"
                class="flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                @if (clearingSOS()) {
                  <div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0"></div>
                } @else {
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                }
                {{ 'ADMIN.CLEAR_SOS' | translate }}
              </button>
            </div>
          </div>
        </aside>

        <!-- ===== Main Content ===== -->
        <main class="flex-1 p-4 md:p-8 overflow-x-hidden min-w-0">

          <!-- ===== Overview Tab ===== -->
          @if (activeTab() === 'overview') {
            @if (loadingStats()) {
              <div class="flex items-center justify-center py-20">
                <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shrink-0"></div>
                <span class="ms-3 text-gray-500">{{ 'ADMIN.LOADING' | translate }}</span>
              </div>
            } @else if (stats()) {
              <h2 class="text-xl font-bold text-gray-800 mb-6 text-start">{{ 'ADMIN.TAB_OVERVIEW' | translate }}</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Users -->
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
                <!-- Pets -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-start">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                      <svg class="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H3.75" />
                      </svg>
                    </div>
                    <span class="text-sm font-medium text-gray-500">{{ 'ADMIN.STAT_PETS' | translate }}</span>
                  </div>
                  <p class="text-3xl font-bold text-gray-900">{{ stats()!.totalPets | number }}</p>
                </div>
                <!-- Providers -->
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
                <!-- Bookings -->
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
                <!-- Active SOS -->
                <div class="bg-white rounded-xl shadow-sm border border-red-100 p-6 text-start">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <span class="text-sm font-medium text-gray-500">{{ 'ADMIN.STAT_SOS' | translate }}</span>
                  </div>
                  <p class="text-3xl font-bold" [class]="stats()!.activeSOSReports > 0 ? 'text-red-600' : 'text-gray-900'">
                    {{ stats()!.activeSOSReports | number }}
                  </p>
                </div>
                <!-- Pending Providers -->
                <div class="bg-white rounded-xl shadow-sm border border-amber-100 p-6 text-start">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span class="text-sm font-medium text-gray-500">{{ 'ADMIN.STAT_PENDING' | translate }}</span>
                  </div>
                  <p class="text-3xl font-bold" [class]="stats()!.pendingProviders > 0 ? 'text-amber-600' : 'text-gray-900'">
                    {{ stats()!.pendingProviders | number }}
                  </p>
                </div>
              </div>

              <!-- Revenue -->
              <div class="mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-start">
                <span class="text-sm font-medium text-indigo-200">{{ 'ADMIN.STAT_REVENUE' | translate }}</span>
                <p class="text-3xl font-bold text-white mt-1" dir="ltr">{{ stats()!.totalPlatformRevenue | currency:'ILS':'symbol-narrow':'1.0-0' }}</p>
              </div>
            }
          }

          <!-- ===== Users Tab ===== -->
          @if (activeTab() === 'users') {
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 class="text-xl font-bold text-gray-800 text-start">{{ 'ADMIN.TAB_USERS' | translate }}</h2>
              <div class="relative">
                <svg class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  [ngModel]="userSearch()"
                  (ngModelChange)="userSearch.set($event)"
                  [placeholder]="'ADMIN.SEARCH_USERS' | translate"
                  class="w-full sm:w-72 rounded-lg border border-gray-200 bg-white ps-9 pe-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
            </div>

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
                        <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_STATUS' | translate }}</th>
                        <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_REGISTERED' | translate }}</th>
                        <th class="text-start px-4 py-3 font-semibold text-gray-600">{{ 'ADMIN.COL_ACTIONS' | translate }}</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      @for (user of filteredUsers(); track user.id) {
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
                          <td class="px-4 py-3">
                            <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                                  [class]="user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                              {{ (user.isActive ? 'ADMIN.ACTIVE' : 'ADMIN.BLOCKED') | translate }}
                            </span>
                          </td>
                          <td class="px-4 py-3 text-gray-500">{{ user.createdAt | date:'mediumDate' }}</td>
                          <td class="px-4 py-3">
                            @if (user.role !== 'Admin') {
                              <div class="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  (click)="changeRole(user, 'Admin')"
                                  [disabled]="updatingRoleId() === user.id"
                                  class="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                                  [title]="'ADMIN.MAKE_ADMIN' | translate">
                                  {{ 'ADMIN.MAKE_ADMIN' | translate }}
                                </button>
                                @if (user.role !== 'Provider') {
                                  <button
                                    type="button"
                                    (click)="changeRole(user, 'Provider')"
                                    [disabled]="updatingRoleId() === user.id"
                                    class="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                    [title]="'ADMIN.MAKE_PROVIDER' | translate">
                                    {{ 'ADMIN.MAKE_PROVIDER' | translate }}
                                  </button>
                                }
                                <button
                                  type="button"
                                  (click)="toggleUserStatus(user)"
                                  [disabled]="togglingId() === user.id"
                                  class="rounded-md px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                                  [class]="user.isActive
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100'">
                                  @if (togglingId() === user.id) {
                                    <div class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                  }
                                  {{ (user.isActive ? 'ADMIN.DEACTIVATE' : 'ADMIN.ACTIVATE') | translate }}
                                </button>
                                @if (user.role === 'Provider') {
                                  <button
                                    type="button"
                                    (click)="confirmAction('suspend', user)"
                                    [disabled]="providerActionId() === user.id"
                                    class="rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-50">
                                    {{ 'ADMIN.FREEZE' | translate }}
                                  </button>
                                  <button
                                    type="button"
                                    (click)="confirmAction('ban', user)"
                                    [disabled]="providerActionId() === user.id"
                                    class="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">
                                    {{ 'ADMIN.BAN' | translate }}
                                  </button>
                                }
                                @if (user.role === 'Owner' && user.providerStatus === 'Suspended') {
                                  <button
                                    type="button"
                                    (click)="confirmAction('reactivate', user)"
                                    [disabled]="providerActionId() === user.id"
                                    class="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50">
                                    {{ 'ADMIN.REACTIVATE' | translate }}
                                  </button>
                                }
                              </div>
                            } @else {
                              <span class="text-xs text-gray-400 italic">{{ 'ADMIN.ADMIN_PROTECTED' | translate }}</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                @if (filteredUsers().length === 0) {
                  <div class="py-12 text-center text-gray-400">{{ 'ADMIN.NO_USERS' | translate }}</div>
                }
              </div>
            }
          }

          <!-- ===== Pets Tab ===== -->
          @if (activeTab() === 'pets') {
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 class="text-xl font-bold text-gray-800 text-start">{{ 'ADMIN.TAB_PETS' | translate }}</h2>
              <div class="relative">
                <svg class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  [ngModel]="petSearch()"
                  (ngModelChange)="petSearch.set($event)"
                  [placeholder]="'ADMIN.SEARCH_PETS' | translate"
                  class="w-full sm:w-72 rounded-lg border border-gray-200 bg-white ps-9 pe-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
            </div>

            @if (loadingPets()) {
              <div class="flex items-center justify-center py-20">
                <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shrink-0"></div>
                <span class="ms-3 text-gray-500">{{ 'ADMIN.LOADING' | translate }}</span>
              </div>
            } @else {
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                @for (pet of filteredPets(); track pet.id) {
                  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div class="aspect-[16/10] bg-gray-100 relative overflow-hidden">
                      @if (pet.imageUrl) {
                        <img [src]="pet.imageUrl" [alt]="pet.name" class="w-full h-full object-cover" />
                      } @else {
                        <div class="w-full h-full flex items-center justify-center">
                          <svg class="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H3.75" />
                          </svg>
                        </div>
                      }
                      <span class="absolute top-2 end-2 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-gray-700 shadow-sm">
                        {{ pet.species }}
                      </span>
                    </div>
                    <div class="p-4 text-start">
                      <div class="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 class="font-semibold text-gray-900">{{ pet.name }}</h3>
                          <p class="text-xs text-gray-500">{{ pet.breed ?? pet.species }} · {{ 'ADMIN.PET_AGE' | translate: { age: pet.age } }}</p>
                        </div>
                      </div>
                      <p class="text-xs text-gray-400 mb-3" dir="auto">{{ 'ADMIN.PET_OWNER' | translate }}: {{ pet.ownerName }}</p>
                      <button
                        type="button"
                        (click)="deletePet(pet)"
                        [disabled]="deletingPetId() === pet.id"
                        class="w-full flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        @if (deletingPetId() === pet.id) {
                          <div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent shrink-0"></div>
                        } @else {
                          <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        }
                        {{ 'ADMIN.ADMIN_DELETE' | translate }}
                      </button>
                    </div>
                  </div>
                }
              </div>
              @if (filteredPets().length === 0) {
                <div class="py-12 text-center text-gray-400">{{ 'ADMIN.NO_PETS' | translate }}</div>
              }
            }
          }

          <!-- ===== Providers (Pending) Tab ===== -->
          @if (activeTab() === 'providers') {
            <h2 class="text-xl font-bold text-gray-800 mb-6 text-start">{{ 'ADMIN.TAB_PROVIDERS' | translate }}</h2>

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

        </main>

        <!-- ===== Confirmation Dialog ===== -->
        @if (confirmDialog()) {
          <div class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
               (click)="cancelConfirm()">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full flex items-center justify-center"
                     [class]="confirmDialog()!.action === 'ban' ? 'bg-red-100' :
                              confirmDialog()!.action === 'suspend' ? 'bg-orange-100' : 'bg-blue-100'">
                  <svg class="w-5 h-5"
                       [class]="confirmDialog()!.action === 'ban' ? 'text-red-600' :
                                confirmDialog()!.action === 'suspend' ? 'text-orange-600' : 'text-blue-600'"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h3 class="font-bold text-gray-900">{{ 'ADMIN.CONFIRM_TITLE' | translate }}</h3>
                  <p class="text-sm text-gray-500">{{ confirmDialog()!.message }}</p>
                </div>
              </div>
              @if (confirmDialog()!.action === 'suspend') {
                <input
                  type="text"
                  [ngModel]="suspendReason()"
                  (ngModelChange)="suspendReason.set($event)"
                  [placeholder]="'ADMIN.SUSPEND_REASON_PLACEHOLDER' | translate"
                  class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              }
              <div class="flex gap-3 justify-end">
                <button type="button" (click)="cancelConfirm()"
                  class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                  {{ 'ADMIN.CONFIRM_CANCEL' | translate }}
                </button>
                <button type="button" (click)="executeConfirmed()"
                  [disabled]="providerActionId() !== null"
                  class="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  [class]="confirmDialog()!.action === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                           confirmDialog()!.action === 'suspend' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'">
                  @if (providerActionId() !== null) {
                    <div class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  } @else {
                    {{ 'ADMIN.CONFIRM_OK' | translate }}
                  }
                </button>
              </div>
            </div>
          </div>
        }

      </div>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'ADMIN.TAB_OVERVIEW', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
    { key: 'users', label: 'ADMIN.TAB_USERS', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
    { key: 'pets', label: 'ADMIN.TAB_PETS', icon: 'M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H3.75' },
    { key: 'providers', label: 'ADMIN.TAB_PROVIDERS', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  activeTab = signal<Tab>('overview');

  stats = signal<AdminStats | null>(null);
  loadingStats = signal(true);

  users = signal<AdminUser[]>([]);
  loadingUsers = signal(true);
  userSearch = signal('');
  togglingId = signal<string | null>(null);
  updatingRoleId = signal<string | null>(null);

  pets = signal<AdminPet[]>([]);
  loadingPets = signal(true);
  petSearch = signal('');
  deletingPetId = signal<string | null>(null);

  bookings = signal<AdminBooking[]>([]);
  loadingBookings = signal(true);

  providers = signal<PendingProvider[]>([]);
  loadingProviders = signal(true);
  approvingId = signal<string | null>(null);
  expandedId = signal<string | null>(null);

  seeding = signal(false);
  seedingPets = signal(false);
  clearingSOS = signal(false);

  providerActionId = signal<string | null>(null);
  confirmDialog = signal<{ action: 'suspend' | 'ban' | 'reactivate'; user: AdminUser; message: string } | null>(null);
  suspendReason = signal('');

  filteredUsers = computed(() => {
    const term = this.userSearch().toLowerCase().trim();
    const list = this.users();
    if (!term) return list;
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
    );
  });

  filteredPets = computed(() => {
    const term = this.petSearch().toLowerCase().trim();
    const list = this.pets();
    if (!term) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.ownerName.toLowerCase().includes(term) ||
        p.species.toLowerCase().includes(term) ||
        (p.breed && p.breed.toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.loadStats();
    this.loadUsers();
    this.loadPets();
    this.loadPending();
  }

  switchTab(tab: Tab): void {
    this.activeTab.set(tab);
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
        this.reloadAll();
      },
      error: () => this.seeding.set(false),
    });
  }

  seedBogusPets(): void {
    this.seedingPets.set(true);
    this.adminService.seedBogusPets().subscribe({
      next: (res) => {
        this.toast.success(res.message);
        this.seedingPets.set(false);
        this.loadPets();
        this.loadStats();
      },
      error: () => this.seedingPets.set(false),
    });
  }

  clearSOSReports(): void {
    this.clearingSOS.set(true);
    this.adminService.clearAllSOSReports().subscribe({
      next: (res) => {
        this.toast.success(res.message);
        this.clearingSOS.set(false);
        this.loadStats();
      },
      error: () => this.clearingSOS.set(false),
    });
  }

  approve(providerId: string): void {
    this.approvingId.set(providerId);
    this.adminService.approveProvider(providerId).subscribe({
      next: () => {
        this.providers.update((list) => list.filter((p) => p.userId !== providerId));
        this.approvingId.set(null);
        if (this.expandedId() === providerId) this.expandedId.set(null);
        this.loadStats();
      },
      error: () => this.approvingId.set(null),
    });
  }

  changeRole(user: AdminUser, newRole: string): void {
    this.updatingRoleId.set(user.id);
    this.adminService.updateUserRole(user.id, newRole).subscribe({
      next: (res) => {
        this.users.update((list) =>
          list.map((u) => (u.id === user.id ? { ...u, role: res.role } : u))
        );
        this.updatingRoleId.set(null);
        this.toast.success(this.translate.instant('ADMIN.TOAST_ROLE_UPDATED'));
      },
      error: () => this.updatingRoleId.set(null),
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

  deletePet(pet: AdminPet): void {
    this.deletingPetId.set(pet.id);
    this.adminService.adminDeletePet(pet.id).subscribe({
      next: () => {
        this.pets.update((list) => list.filter((p) => p.id !== pet.id));
        this.deletingPetId.set(null);
        this.loadStats();
        this.toast.success(this.translate.instant('ADMIN.TOAST_PET_DELETED'));
      },
      error: () => this.deletingPetId.set(null),
    });
  }

  confirmAction(action: 'suspend' | 'ban' | 'reactivate', user: AdminUser): void {
    const messages: Record<string, string> = {
      suspend: this.translate.instant('ADMIN.CONFIRM_SUSPEND', { name: user.name }),
      ban: this.translate.instant('ADMIN.CONFIRM_BAN', { name: user.name }),
      reactivate: this.translate.instant('ADMIN.CONFIRM_REACTIVATE', { name: user.name }),
    };
    this.suspendReason.set('');
    this.confirmDialog.set({ action, user, message: messages[action] });
  }

  cancelConfirm(): void {
    this.confirmDialog.set(null);
  }

  executeConfirmed(): void {
    const dialog = this.confirmDialog();
    if (!dialog) return;
    const { action, user } = dialog;
    this.providerActionId.set(user.id);

    const done = () => {
      this.providerActionId.set(null);
      this.confirmDialog.set(null);
      this.loadUsers();
      this.loadStats();
    };

    if (action === 'suspend') {
      this.adminService.suspendProvider(user.id, this.suspendReason() || undefined).subscribe({
        next: (res) => { this.toast.success(res.message); done(); },
        error: () => this.providerActionId.set(null),
      });
    } else if (action === 'ban') {
      this.adminService.banProvider(user.id).subscribe({
        next: (res) => { this.toast.success(res.message); done(); },
        error: () => this.providerActionId.set(null),
      });
    } else {
      this.adminService.reactivateProvider(user.id).subscribe({
        next: (res) => { this.toast.success(res.message); done(); },
        error: () => this.providerActionId.set(null),
      });
    }
  }

  private reloadAll(): void {
    this.loadStats();
    this.loadUsers();
    this.loadPets();
    this.loadPending();
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

  private loadPets(): void {
    this.adminService.getPets().subscribe({
      next: (data) => {
        this.pets.set(data);
        this.loadingPets.set(false);
      },
      error: () => this.loadingPets.set(false),
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
