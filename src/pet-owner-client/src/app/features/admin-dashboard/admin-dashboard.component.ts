import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';
import { PendingProvider } from '../../models/pending-provider.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="min-h-screen bg-gray-50 p-4 md:p-10">
      <div class="max-w-4xl mx-auto">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-1">Admin Dashboard</h1>
            <p class="text-gray-500">Review and approve pending provider applications.</p>
          </div>
          <button
            (click)="seedDummyData()"
            [disabled]="seeding()"
            class="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
            @if (seeding()) {
              <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Seeding...
            } @else {
              Generate 30 Dummy Providers
            }
          </button>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-20">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <span class="ml-3 text-gray-500">Loading pending providers...</span>
          </div>
        }

        @if (!loading() && providers().length === 0) {
          <div class="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100">
            <svg class="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-4 text-lg font-semibold text-gray-700">All caught up!</h3>
            <p class="mt-1 text-gray-400">No pending provider applications.</p>
          </div>
        }

        @if (!loading() && providers().length > 0) {
          <p class="text-sm text-gray-400 mb-4">{{ providers().length }} pending application{{ providers().length > 1 ? 's' : '' }}</p>

          <div class="grid gap-4">
            @for (provider of providers(); track provider.userId) {
              <div class="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md">
                <!-- Card header — always visible -->
                <button
                  (click)="toggleExpand(provider.userId)"
                  class="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">

                  <!-- Avatar -->
                  <div class="shrink-0 w-14 h-14 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden flex items-center justify-center">
                    @if (provider.profileImageUrl) {
                      <img [src]="provider.profileImageUrl" [alt]="provider.name" class="w-full h-full object-cover" />
                    } @else {
                      <svg class="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    }
                  </div>

                  <!-- Summary -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="font-semibold text-gray-800">{{ provider.name }}</h3>
                      <span class="text-xs text-gray-400">{{ provider.phone }}</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 mt-1.5">
                      @for (svc of provider.services; track svc) {
                        <span class="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          {{ svc }}
                        </span>
                      }
                      <span class="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {{ provider.hourlyRate }} ILS/hr
                      </span>
                    </div>
                  </div>

                  <!-- Expand chevron -->
                  <svg
                    class="w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200"
                    [class.rotate-180]="expandedId() === provider.userId"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <!-- Expanded detail panel -->
                @if (expandedId() === provider.userId) {
                  <div class="border-t border-gray-100 px-5 py-5 bg-gray-50/30">
                    <div class="grid gap-4 sm:grid-cols-2">

                      <!-- Full bio -->
                      <div class="sm:col-span-2">
                        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bio</label>
                        <p class="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{{ provider.bio ?? 'No bio provided.' }}</p>
                      </div>

                      <!-- Profile image (large) -->
                      @if (provider.profileImageUrl) {
                        <div class="sm:col-span-2">
                          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Profile Photo</label>
                          <img
                            [src]="provider.profileImageUrl"
                            [alt]="provider.name"
                            class="mt-2 w-32 h-32 rounded-xl object-cover border border-gray-200 shadow-sm"
                          />
                        </div>
                      }

                      <div>
                        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hourly Rate</label>
                        <p class="mt-1 text-sm font-medium text-gray-800">{{ provider.hourlyRate }} ILS</p>
                      </div>

                      <div>
                        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied</label>
                        <p class="mt-1 text-sm text-gray-800">{{ provider.createdAt | date:'mediumDate' }}</p>
                      </div>

                      <div>
                        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</label>
                        <p class="mt-1 text-sm text-gray-800">{{ provider.phone }}</p>
                      </div>

                      <div>
                        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Services</label>
                        <p class="mt-1 text-sm text-gray-800">{{ provider.services.join(', ') }}</p>
                      </div>

                      <div class="sm:col-span-2">
                        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location / Address</label>
                        <p class="mt-1 text-sm text-gray-800">{{ provider.address ?? 'No address provided' }}</p>
                      </div>

                      <div class="sm:col-span-2 mt-2 pt-3 border-t border-gray-200">
                        <label class="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Trust & Verification</label>
                      </div>

                      <div>
                        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Number</label>
                        <p class="mt-1 text-sm font-mono text-gray-800">{{ provider.idNumber ?? 'N/A' }}</p>
                      </div>

                      <div>
                        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference Name</label>
                        <p class="mt-1 text-sm text-gray-800">{{ provider.referenceName ?? 'N/A' }}</p>
                      </div>

                      <div class="sm:col-span-2">
                        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference Contact</label>
                        <p class="mt-1 text-sm text-gray-800">{{ provider.referenceContact ?? 'N/A' }}</p>
                      </div>
                    </div>

                    <!-- Action buttons -->
                    <div class="flex items-center gap-3 mt-5 pt-4 border-t border-gray-200">
                      <button
                        (click)="approve(provider.userId)"
                        [disabled]="approvingId() === provider.userId"
                        class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        @if (approvingId() === provider.userId) {
                          <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Approving...
                        } @else {
                          Approve Provider
                        }
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  providers = signal<PendingProvider[]>([]);
  loading = signal(true);
  approvingId = signal<string | null>(null);
  seeding = signal(false);
  expandedId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPending();
  }

  toggleExpand(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  seedDummyData(): void {
    this.seeding.set(true);
    this.adminService.seedDummyData().subscribe({
      next: () => {
        this.toast.success('30 fake providers created successfully! Check the map.');
        this.seeding.set(false);
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
        if (this.expandedId() === providerId) {
          this.expandedId.set(null);
        }
      },
      error: () => this.approvingId.set(null),
    });
  }

  private loadPending(): void {
    this.adminService.getPendingProviders().subscribe({
      next: (data) => {
        this.providers.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
