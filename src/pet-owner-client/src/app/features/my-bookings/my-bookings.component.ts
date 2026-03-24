import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { BookingService } from '../../services/booking.service';
import { ProviderService } from '../../services/provider.service';
import { ToastService } from '../../services/toast.service';
import { BookingDto } from '../../models/booking.model';
import { ReviewModalComponent, ReviewModalInput } from './review-modal.component';
import { ServiceTypePipe } from '../../shared/service-type.utils';

type Tab = 'owner' | 'provider';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ServiceTypePipe, ReviewModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 pb-24">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-5 pt-6 pb-4">
        <h1 class="text-2xl font-bold text-gray-900">{{ 'BOOKINGS_DASHBOARD.TITLE' | translate }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ 'BOOKINGS_DASHBOARD.SUBTITLE' | translate }}</p>
      </div>

      <!-- Tabs -->
      @if (showTabs()) {
        <div class="px-4 pt-4">
          <div class="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              (click)="activeTab.set('owner')"
              class="flex-1 text-sm font-semibold py-2 rounded-lg transition-all duration-200"
              [class]="activeTab() === 'owner'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'">
              {{ 'BOOKINGS_DASHBOARD.TAB_MY_TRIPS' | translate }}
            </button>
            <button
              (click)="activeTab.set('provider')"
              class="flex-1 text-sm font-semibold py-2 rounded-lg transition-all duration-200"
              [class]="activeTab() === 'provider'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'">
              {{ 'BOOKINGS_DASHBOARD.TAB_CLIENT_REQUESTS' | translate }}
            </button>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="flex items-center justify-center py-16 gap-2 text-gray-500">
          <div class="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-sm">{{ 'BOOKINGS_DASHBOARD.LOADING' | translate }}</span>
        </div>
      } @else if (visibleBookings().length === 0) {
        <div class="flex flex-col items-center justify-center p-8 text-center mx-4 mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div class="mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-gray-100" aria-hidden="true">
            <svg class="h-16 w-16 text-gray-300" viewBox="0 0 88 88" fill="none">
              <rect x="18" y="26" width="52" height="44" rx="6" stroke="currentColor" stroke-width="1.5"/>
              <path d="M18 38h52" stroke="currentColor" stroke-width="1.5"/>
              <path d="M30 18v12M44 18v12M58 18v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold tracking-tight text-gray-900">{{ 'BOOKINGS_DASHBOARD.EMPTY_TITLE' | translate }}</h3>
          <p class="mt-2 max-w-sm text-sm text-gray-500 leading-relaxed">{{ 'BOOKINGS_DASHBOARD.EMPTY_SUBTITLE' | translate }}</p>
          <a routerLink="/"
             class="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors">
            {{ 'BOOKINGS_DASHBOARD.FIND_PROVIDER' | translate }}
          </a>
        </div>
      } @else {
        <!-- Pending -->
        @if (pendingBookings().length > 0) {
          <div class="px-4 pt-5 pb-2">
            <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {{ 'BOOKINGS_DASHBOARD.SECTION_PENDING' | translate }}
            </h2>
          </div>
          @for (b of pendingBookings(); track b.id) {
            <ng-container *ngTemplateOutlet="bookingCard; context: { $implicit: b }" />
          }
        }

        <!-- Confirmed -->
        @if (confirmedBookings().length > 0) {
          <div class="px-4 pt-5 pb-2">
            <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {{ 'BOOKINGS_DASHBOARD.SECTION_CONFIRMED' | translate }}
            </h2>
          </div>
          @for (b of confirmedBookings(); track b.id) {
            <ng-container *ngTemplateOutlet="bookingCard; context: { $implicit: b }" />
          }
        }

        <!-- Past -->
        @if (pastBookings().length > 0) {
          <div class="px-4 pt-5 pb-2">
            <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {{ 'BOOKINGS_DASHBOARD.SECTION_PAST' | translate }}
            </h2>
          </div>
          @for (b of pastBookings(); track b.id) {
            <ng-container *ngTemplateOutlet="bookingCard; context: { $implicit: b }" />
          }
        }
      }

      <!-- Card Template -->
      <ng-template #bookingCard let-b>
        <div class="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="p-4">
            <!-- Top row: ID + status -->
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-mono text-gray-400 tracking-wide">#{{ b.id.slice(0, 8).toUpperCase() }}</span>
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [class]="statusClass(b.status)">
                {{ statusLabel(b.status) | translate }}
              </span>
            </div>

            <!-- Provider / Owner name + translated service -->
            <div class="mb-2">
              <p class="font-semibold text-gray-900 text-sm truncate" dir="auto">
                {{ activeTab() === 'provider' ? b.ownerName : b.providerName }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5" dir="auto">
                {{ b.service | serviceType | translate }} · {{ b.createdAt | date:'mediumDate' }}
              </p>
            </div>

            <!-- Date range + price -->
            <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 mb-2 text-xs text-gray-600">
              <span>📅 {{ b.startDate | date:'EEE, MMM d' }}</span>
              <span>→ {{ b.endDate | date:'EEE, MMM d' }}</span>
              <span class="ms-auto font-semibold text-indigo-700">₪{{ b.totalPrice | number:'1.0-0' }}</span>
            </div>

            @if (b.notes) {
              <p class="text-xs text-gray-500 italic mb-2 px-0.5" dir="auto">"{{ b.notes }}"</p>
            }

            <!-- Payment badge / Pay Now -->
            @if (b.paymentStatus === 'Paid') {
              <div class="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mb-2 px-0.5">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ 'BOOKINGS_DASHBOARD.PAID' | translate }}
              </div>
            } @else if (b.paymentStatus === 'Failed') {
              <div class="flex items-center gap-1.5 text-xs text-red-500 font-medium mb-2 px-0.5">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                {{ 'BOOKINGS_DASHBOARD.PAYMENT_FAILED' | translate }}
              </div>
            } @else if (b.status === 'Confirmed' && b.paymentStatus === 'Pending' && activeTab() === 'owner' && b.paymentUrl) {
              <button
                (click)="payNow(b.paymentUrl)"
                class="mt-1 mb-2 w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700
                       text-white text-sm font-semibold rounded-xl py-2.5 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {{ 'BOOKINGS_DASHBOARD.PAY_NOW' | translate }} · ₪{{ b.totalPrice | number:'1.0-0' }}
              </button>
            }

            <!-- WhatsApp contact for active bookings -->
            @if (b.status === 'Pending' || b.status === 'Confirmed') {
              <button
                (click)="openWhatsApp(b)"
                class="mt-2 w-full flex items-center justify-center gap-1.5
                       bg-[#25D366] hover:bg-[#1fb855] text-white text-sm font-semibold
                       rounded-xl py-2.5 transition-colors">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.477-.67-6.309-1.826l-.452-.277-2.644.886.886-2.644-.277-.452A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                {{ 'BOOKINGS_DASHBOARD.WHATSAPP' | translate }}
              </button>
            }

            <!-- Provider actions on Pending -->
            @if (b.status === 'Pending' && activeTab() === 'provider') {
              <div class="flex gap-2 mt-3">
                <button
                  (click)="confirmBooking(b.id)"
                  [disabled]="actionLoading() === b.id"
                  class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold
                         rounded-xl py-2.5 transition-colors disabled:opacity-50">
                  {{ actionLoading() === b.id ? ('BOOKINGS_DASHBOARD.UPDATING' | translate) : ('BOOKINGS_DASHBOARD.APPROVE' | translate) }}
                </button>
                <button
                  (click)="cancelBooking(b.id)"
                  [disabled]="actionLoading() === b.id"
                  class="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold
                         rounded-xl py-2.5 transition-colors disabled:opacity-50">
                  {{ 'BOOKINGS_DASHBOARD.DECLINE' | translate }}
                </button>
              </div>
            }

            <!-- Owner cancel -->
            @if ((b.status === 'Pending' || b.status === 'Confirmed') && activeTab() === 'owner') {
              <button
                (click)="cancelBooking(b.id)"
                [disabled]="actionLoading() === b.id"
                class="mt-2 w-full bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600
                       text-xs font-medium rounded-xl py-2 transition-colors disabled:opacity-50">
                {{ 'BOOKINGS_DASHBOARD.CANCEL' | translate }}
              </button>
            }

            <!-- Leave a Review -->
            @if ((b.status === 'Completed' || b.paymentStatus === 'Paid') && !b.hasReview && activeTab() === 'owner') {
              <button
                (click)="openReviewModal(b)"
                class="mt-2 w-full flex items-center justify-center gap-2
                       bg-amber-50 hover:bg-amber-100 text-amber-700
                       text-sm font-semibold rounded-xl py-2.5 transition-colors border border-amber-200">
                <span class="text-amber-500">&#9733;</span>
                {{ 'BOOKINGS_DASHBOARD.LEAVE_REVIEW' | translate }}
              </button>
            }
            @if (b.hasReview && (b.status === 'Completed' || b.paymentStatus === 'Paid')) {
              <div class="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium px-0.5">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ 'BOOKINGS_DASHBOARD.REVIEWED' | translate }}
              </div>
            }
          </div>
        </div>
      </ng-template>
    </div>

    <!-- Review Modal -->
    <app-review-modal
      [open]="isReviewModalOpen()"
      [data]="reviewModalData()"
      (closed)="closeReviewModal()"
      (reviewed)="onReviewSuccess()">
    </app-review-modal>
  `,
})
export class MyBookingsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly bookingService = inject(BookingService);
  private readonly providerService = inject(ProviderService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly bookings = signal<BookingDto[]>([]);
  readonly loading = signal(false);
  readonly actionLoading = signal<string | null>(null);
  readonly activeTab = signal<Tab>('owner');
  readonly isReviewModalOpen = signal(false);
  readonly reviewModalData = signal<ReviewModalInput | null>(null);

  private readonly userId = computed(() => this.auth.userId());

  readonly isProvider = computed(
    () => this.providerService.providerStatus() === 'Approved',
  );

  readonly showTabs = computed(() => {
    if (!this.isProvider()) return false;
    return this.bookings().some(b => b.providerProfileId === this.userId());
  });

  readonly ownerBookings = computed(() =>
    this.bookings().filter(b => b.ownerId === this.userId()),
  );

  readonly providerBookings = computed(() =>
    this.bookings().filter(b => b.providerProfileId === this.userId()),
  );

  readonly visibleBookings = computed(() =>
    this.activeTab() === 'provider' ? this.providerBookings() : this.ownerBookings(),
  );

  readonly pendingBookings = computed(() =>
    this.visibleBookings().filter(b => b.status === 'Pending'),
  );

  readonly confirmedBookings = computed(() =>
    this.visibleBookings().filter(b => b.status === 'Confirmed'),
  );

  readonly pastBookings = computed(() =>
    this.visibleBookings().filter(b => b.status === 'Cancelled' || b.status === 'Completed'),
  );

  ngOnInit(): void {
    this.loadBookings();
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Pending':   return 'bg-amber-50 text-amber-700';
      case 'Confirmed': return 'bg-emerald-50 text-emerald-700';
      case 'Completed': return 'bg-indigo-50 text-indigo-700';
      case 'Cancelled': return 'bg-gray-100 text-gray-500';
      default:          return 'bg-gray-50 text-gray-600';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'Pending':   return 'BOOKINGS_DASHBOARD.STATUS_PENDING';
      case 'Confirmed': return 'BOOKINGS_DASHBOARD.STATUS_CONFIRMED';
      case 'Completed': return 'BOOKINGS_DASHBOARD.STATUS_COMPLETED';
      case 'Cancelled': return 'BOOKINGS_DASHBOARD.STATUS_CANCELLED';
      default:          return status;
    }
  }

  confirmBooking(id: string): void {
    this.actionLoading.set(id);
    this.bookingService.confirm(id).subscribe({
      next: () => {
        this.toast.success('Booking confirmed!');
        this.loadBookings();
      },
      error: () => {
        this.toast.error('Failed to confirm booking.');
        this.actionLoading.set(null);
      },
    });
  }

  payNow(url: string): void {
    window.location.href = url;
  }

  cancelBooking(id: string): void {
    this.actionLoading.set(id);
    this.bookingService.cancel(id).subscribe({
      next: () => {
        this.toast.show('Booking cancelled.', 'info');
        this.loadBookings();
      },
      error: () => {
        this.toast.error('Failed to cancel booking.');
        this.actionLoading.set(null);
      },
    });
  }

  openReviewModal(b: BookingDto): void {
    this.reviewModalData.set({
      bookingId: b.id,
      providerName: b.providerName,
    });
    this.isReviewModalOpen.set(true);
  }

  closeReviewModal(): void {
    this.isReviewModalOpen.set(false);
  }

  onReviewSuccess(): void {
    this.isReviewModalOpen.set(false);
    this.toast.success(this.translate.instant('REVIEWS.SUCCESS'));
    this.loadBookings();
  }

  openWhatsApp(b: BookingDto): void {
    const isProviderTab = this.activeTab() === 'provider';
    const phone = isProviderTab ? b.ownerPhone : b.providerPhone;
    const name = isProviderTab ? b.ownerName : b.providerName;

    if (!phone) return;

    const formatted = this.formatIsraeliPhone(phone);
    const datePipe = new DatePipe('en-US');
    const dateStr = datePipe.transform(b.startDate, 'EEE, MMM d') ?? b.startDate;
    const msg = this.translate.instant('BOOKINGS_DASHBOARD.WHATSAPP_MSG', {
      name,
      service: b.service,
      date: dateStr,
    });
    window.open(
      `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener',
    );
  }

  private formatIsraeliPhone(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      digits = '972' + digits.substring(1);
    }
    if (!digits.startsWith('972')) {
      digits = '972' + digits;
    }
    return digits;
  }

  private loadBookings(): void {
    this.loading.set(true);
    this.bookingService.getMine().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loading.set(false);
        this.actionLoading.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.actionLoading.set(null);
      },
    });
  }
}
