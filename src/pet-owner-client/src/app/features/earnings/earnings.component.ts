import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ProviderService,
  EarningsSummary,
  EarningsTransaction,
  StripeConnectStatus,
} from '../../services/provider.service';

@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 pb-24">
      <div class="bg-white border-b border-gray-200 px-5 pt-6 pb-4">
        <h1 class="text-2xl font-bold text-gray-900">Earnings</h1>
        <p class="text-sm text-gray-500 mt-1">Track your income and payouts</p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-16 gap-2 text-gray-500">
          <div class="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-sm">Loading earnings...</span>
        </div>
      } @else {
        <!-- Summary Cards -->
        @if (summary(); as s) {
          <div class="px-4 pt-5">
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Net Earnings</p>
                <p class="text-2xl font-bold text-emerald-600 mt-1">₪{{ s.netEarnings }}</p>
              </div>
              <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Completed</p>
                <p class="text-2xl font-bold text-gray-900 mt-1">{{ s.completedBookings }}</p>
                <p class="text-xs text-gray-400">bookings</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3 mb-5">
              <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                <p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Charged</p>
                <p class="text-lg font-bold text-gray-800 mt-0.5">₪{{ s.totalEarned }}</p>
              </div>
              <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                <p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Platform Fees</p>
                <p class="text-lg font-bold text-red-500 mt-0.5">₪{{ s.platformFees }}</p>
              </div>
              <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                <p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Pending</p>
                <p class="text-lg font-bold text-amber-600 mt-0.5">₪{{ s.pendingAmount }}</p>
                <p class="text-[10px] text-gray-400">{{ s.pendingPayments }} holds</p>
              </div>
            </div>
          </div>
        }

        <!-- Stripe Connect Status -->
        @if (connectStatus(); as cs) {
          <div class="px-4 mb-4">
            @if (cs.isConnected) {
              <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <div>
                  <p class="text-sm font-semibold text-emerald-800">Stripe Connected</p>
                  <p class="text-xs text-emerald-600">Payouts are enabled for your account.</p>
                </div>
              </div>
            } @else {
              <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div class="flex items-center gap-3 mb-3">
                  <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p class="text-sm font-semibold text-amber-800">Connect Stripe to receive payouts</p>
                    <p class="text-xs text-amber-600">Set up your Stripe account to start receiving earnings.</p>
                  </div>
                </div>
                <button
                  class="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold
                         rounded-xl py-2.5 transition-colors">
                  Connect Stripe Account
                </button>
              </div>
            }
          </div>
        }

        <!-- Transaction History -->
        <div class="px-4">
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Transaction History</h2>

          @if (transactions().length === 0) {
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <p class="text-gray-400 text-sm">No transactions yet. Complete bookings to start earning!</p>
            </div>
          } @else {
            @for (tx of transactions(); track tx.paymentId) {
              <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-2.5">
                <div class="flex items-start justify-between mb-1.5">
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-gray-900 text-sm truncate">{{ tx.ownerName }}</p>
                    <p class="text-xs text-gray-500">{{ tx.petName ?? 'Service' }} · {{ tx.createdAt | date:'mediumDate' }}</p>
                  </div>
                  <div class="text-right shrink-0 ml-3">
                    <p class="font-bold text-sm"
                       [class]="tx.status === 'Captured' ? 'text-emerald-600' : tx.status === 'Authorized' ? 'text-amber-600' : 'text-gray-400'">
                      +₪{{ tx.netAmount }}
                    </p>
                    <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          [class]="tx.status === 'Captured' ? 'bg-emerald-50 text-emerald-700'
                                 : tx.status === 'Authorized' ? 'bg-amber-50 text-amber-700'
                                 : tx.status === 'Refunded' ? 'bg-red-50 text-red-600'
                                 : 'bg-gray-50 text-gray-500'">
                      {{ tx.status }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-3 text-[10px] text-gray-400">
                  <span>Charged: ₪{{ tx.amount }}</span>
                  <span>Fee: ₪{{ tx.platformFee }}</span>
                  @if (tx.capturedAt) {
                    <span>Captured: {{ tx.capturedAt | date:'shortDate' }}</span>
                  }
                </div>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
})
export class EarningsComponent implements OnInit {
  private readonly providerService = inject(ProviderService);

  loading = signal(true);
  summary = signal<EarningsSummary | null>(null);
  transactions = signal<EarningsTransaction[]>([]);
  connectStatus = signal<StripeConnectStatus | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    this.providerService.getEarnings().subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.loading.set(false),
    });

    this.providerService.getTransactions().subscribe({
      next: (txs) => this.transactions.set(txs),
    });

    this.providerService.getStripeConnectStatus().subscribe({
      next: (status) => {
        this.connectStatus.set(status);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
