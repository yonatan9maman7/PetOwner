import { Component, inject, OnInit, signal } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';
import { PendingProvider } from '../../models/pending-provider.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-50 p-6 md:p-10">
      <div class="max-w-5xl mx-auto">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
            <p class="text-gray-500">Review and approve pending provider applications.</p>
          </div>
          <button
            (click)="seedDummyData()"
            [disabled]="seeding()"
            class="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
            @if (seeding()) {
              <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Seeding…
            } @else {
              🌱 Generate 30 Dummy Providers
            }
          </button>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-20">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <span class="ml-3 text-gray-500">Loading pending providers…</span>
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
          <!-- Desktop table -->
          <div class="hidden md:block overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th class="px-6 py-4">Name</th>
                  <th class="px-6 py-4">Phone</th>
                  <th class="px-6 py-4">Services</th>
                  <th class="px-6 py-4">Bio</th>
                  <th class="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                @for (provider of providers(); track provider.userId) {
                  <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-6 py-4 font-medium text-gray-800">{{ provider.name }}</td>
                    <td class="px-6 py-4 text-gray-600">{{ provider.phone }}</td>
                    <td class="px-6 py-4">
                      <div class="flex flex-wrap gap-1">
                        @for (svc of provider.services; track svc) {
                          <span class="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                            {{ svc }}
                          </span>
                        }
                      </div>
                    </td>
                    <td class="px-6 py-4 text-gray-500 max-w-xs truncate">{{ provider.bio ?? '—' }}</td>
                    <td class="px-6 py-4 text-right">
                      <button
                        (click)="approve(provider.userId)"
                        [disabled]="approvingId() === provider.userId"
                        class="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        @if (approvingId() === provider.userId) {
                          <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Approving…
                        } @else {
                          ✓ Approve
                        }
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile card grid -->
          <div class="md:hidden grid gap-4">
            @for (provider of providers(); track provider.userId) {
              <div class="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <h3 class="font-semibold text-gray-800">{{ provider.name }}</h3>
                    <p class="text-sm text-gray-500">{{ provider.phone }}</p>
                  </div>
                  <button
                    (click)="approve(provider.userId)"
                    [disabled]="approvingId() === provider.userId"
                    class="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    @if (approvingId() === provider.userId) {
                      Approving…
                    } @else {
                      ✓ Approve
                    }
                  </button>
                </div>
                <div class="flex flex-wrap gap-1 mb-3">
                  @for (svc of provider.services; track svc) {
                    <span class="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {{ svc }}
                    </span>
                  }
                </div>
                @if (provider.bio) {
                  <p class="text-sm text-gray-500 line-clamp-3">{{ provider.bio }}</p>
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

  ngOnInit(): void {
    this.loadPending();
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
