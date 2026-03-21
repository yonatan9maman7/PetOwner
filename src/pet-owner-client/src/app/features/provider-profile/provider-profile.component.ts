import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MapService, ProviderPublicProfile } from '../../services/map.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { petSpeciesEmoji, petSpeciesLabel } from '../../models/pet-species.model';
import { BookingModalComponent, BookingModalInput } from './booking-modal.component';

const DAY_KEYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [CommonModule, DatePipe, TranslatePipe, BookingModalComponent],
  template: `
    <div class="min-h-screen bg-gray-50" dir="auto">
      @if (loading()) {
        <div class="flex items-center justify-center h-screen">
          <div class="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (error()) {
        <div class="flex flex-col items-center justify-center h-screen gap-4 px-4">
          <p class="text-gray-500 text-center text-start">{{ 'PROVIDER_PROFILE.NOT_FOUND' | translate }}</p>
          <button type="button" (click)="goBack()" class="text-violet-600 font-medium hover:underline">
            {{ 'PROVIDER_PROFILE.BACK_TO_MAP' | translate }}
          </button>
        </div>
      } @else if (!error() && profile()) {
        <!-- Hero -->
        <div class="bg-gradient-to-br from-violet-600 to-indigo-700 text-white pt-12 pb-16 px-5">
          <button type="button" (click)="goBack()" class="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-6 transition-colors">
            <svg class="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {{ 'PROVIDER_PROFILE.BACK' | translate }}
          </button>
          <div class="flex items-center gap-4">
            <div class="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl overflow-hidden ring-4 ring-white/30 shrink-0">
              @if (profile()!.profileImageUrl) {
                <img [src]="profile()!.profileImageUrl" [alt]="profile()!.name" class="w-full h-full object-cover" />
              } @else {
                🐾
              }
            </div>
            <div class="min-w-0 text-start">
              <h1 class="text-2xl font-bold truncate">{{ profile()!.name }}</h1>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                @if (profile()!.isAvailableNow) {
                  <span class="inline-flex items-center gap-1 bg-emerald-500/25 text-emerald-100 text-xs font-semibold px-2 py-0.5 rounded-full">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                    {{ 'DASHBOARD.ONLINE' | translate }}
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1 bg-white/15 text-white/70 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {{ 'DASHBOARD.OFFLINE' | translate }}
                  </span>
                }
                @if (profile()!.reviewCount > 0) {
                  <span class="text-sm text-white/80">
                    <span class="text-amber-300">&#9733;</span>
                    {{ profile()!.averageRating }} ({{ profile()!.reviewCount }})
                  </span>
                }
              </div>
            </div>
          </div>
        </div>

        <div class="px-5 -mt-8 pb-28 max-w-lg mx-auto space-y-4">
          <!-- Services & Rates card -->
          <div class="bg-white rounded-2xl shadow-md p-5">
            <div class="flex items-baseline justify-between gap-2 mb-3">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider text-start">
                {{ 'PROVIDER_PROFILE.SERVICES_RATES' | translate }}
              </h2>
              @if (profile()!.acceptsOffHoursRequests) {
                <span class="text-xs bg-amber-50 text-amber-700 font-medium px-2 py-1 rounded-full border border-amber-200 shrink-0 text-start">
                  {{ 'PROVIDER_PROFILE.OFF_HOURS_OK' | translate }}
                </span>
              }
            </div>
            <div class="space-y-2">
              @for (rate of profile()!.serviceRates; track rate.serviceType) {
                <div class="flex items-center justify-between gap-2 py-1.5">
                  <span class="text-sm font-medium text-gray-800 text-start">{{ serviceTypeKey(rate.serviceType) | translate }}</span>
                  <span class="text-sm font-semibold text-indigo-700 shrink-0" dir="auto">
                    ₪{{ rate.rate }}/{{ unitKey(rate.pricingUnit) | translate }}
                  </span>
                </div>
              }
            </div>
          </div>

          <!-- Bio -->
          @if (profile()!.bio) {
            <div class="bg-white rounded-2xl shadow-md p-5">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-start">{{ 'PROVIDER_PROFILE.ABOUT' | translate }}</h2>
              <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line text-start">{{ profile()!.bio }}</p>
            </div>
          }

          <!-- Availability -->
          @if (profile()!.availabilitySlots.length > 0) {
            <div class="bg-white rounded-2xl shadow-md p-5">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-start">
                {{ 'PROVIDER_PROFILE.WEEKLY_SCHEDULE' | translate }}
              </h2>
              <div class="space-y-2">
                @for (slot of profile()!.availabilitySlots; track $index) {
                  <div class="flex items-center justify-between gap-2 py-1.5">
                    <span class="text-sm font-medium text-gray-800 text-start">{{ dayScheduleKey(slot.dayOfWeek) | translate }}</span>
                    <span class="text-sm text-gray-500 shrink-0" dir="auto">{{ slot.startTime }} – {{ slot.endTime }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Reviews -->
          <div class="bg-white rounded-2xl shadow-md p-5">
            <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-start">
              {{ 'PROVIDER_PROFILE.REVIEWS_WITH_COUNT' | translate: { count: profile()!.reviewCount } }}
            </h2>
            @if (profile()!.recentReviews.length === 0) {
              <p class="text-sm text-gray-400 text-center py-4">{{ 'DASHBOARD.NO_REVIEWS_YET' | translate }}</p>
            } @else {
              <div class="space-y-3">
                @for (review of profile()!.recentReviews; track review.id) {
                  <div class="border border-gray-100 rounded-xl p-3 text-start">
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="font-medium text-sm text-gray-800 truncate">{{ review.reviewerName }}</span>
                        @if (review.isVerified) {
                          <span class="shrink-0 inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700
                                       text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-200">
                            <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                            {{ 'DASHBOARD.VERIFIED' | translate }}
                          </span>
                        }
                      </div>
                      <span class="text-[10px] text-gray-400 shrink-0">{{ review.createdAt | date:'mediumDate' }}</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                      <span class="text-amber-500 text-xs">
                        @for (s of [1,2,3,4,5]; track s) {
                          <span [class]="s <= review.rating ? 'opacity-100' : 'opacity-25'">&#9733;</span>
                        }
                      </span>
                      @if (review.communicationRating || review.reliabilityRating) {
                        <span class="text-[10px] text-gray-400">
                          @if (review.communicationRating) {
                            {{ 'DASHBOARD.REVIEW_COMM' | translate: { n: review.communicationRating } }}
                          }
                          @if (review.communicationRating && review.reliabilityRating) { · }
                          @if (review.reliabilityRating) {
                            {{ 'DASHBOARD.REVIEW_REL' | translate: { n: review.reliabilityRating } }}
                          }
                        </span>
                      }
                    </div>
                    @if (review.comment) {
                      <p class="text-xs text-gray-600 leading-relaxed" dir="auto">{{ review.comment }}</p>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- CTA -->
          @if (isLoggedIn()) {
            <button
              type="button"
              (click)="openBookingModal()"
              class="w-full flex items-center justify-center gap-2
                     bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                     text-white font-bold rounded-2xl py-4 text-base shadow-lg transition-colors">
              <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ 'BOOKING.BOOK_NOW' | translate }}
            </button>
          } @else {
            <button
              type="button"
              (click)="redirectToLogin()"
              class="w-full flex items-center justify-center gap-2
                     bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                     text-white font-bold rounded-2xl py-4 text-base shadow-lg transition-colors">
              <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25V9m-3 0h13.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75v-7.5A.75.75 0 015.25 9z" />
              </svg>
              {{ 'BOOKING.LOGIN_TO_BOOK' | translate }}
            </button>
          }
        </div>
      }
    </div>

    <!-- Booking Modal -->
    <app-booking-modal
      [open]="isBookingModalOpen()"
      [data]="bookingModalData()"
      (closed)="closeBookingModal()"
      (booked)="onBookingSuccess()">
    </app-booking-modal>
  `,
})
export class ProviderProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mapService = inject(MapService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly petSpeciesEmoji = petSpeciesEmoji;
  readonly petSpeciesLabel = petSpeciesLabel;

  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  profile = signal<ProviderPublicProfile | null>(null);
  loading = signal(true);
  error = signal(false);

  isBookingModalOpen = signal(false);

  bookingModalData = computed<BookingModalInput | null>(() => {
    const p = this.profile();
    if (!p) return null;
    return {
      providerId: p.providerId,
      providerName: p.name,
      serviceRates: p.serviceRates,
    };
  });

  dayScheduleKey(day: number): string {
    const key = DAY_KEYS[day];
    return key ? `SCHEDULE.DAYS.${key}` : `SCHEDULE.DAYS.SUNDAY`;
  }

  serviceTypeKey(type: string): string {
    const map: Record<string, string> = {
      DogWalking: 'WIZARD.SERVICE_DOG_WALKING_TITLE',
      PetSitting: 'WIZARD.SERVICE_PET_SITTING_TITLE',
      Boarding: 'WIZARD.SERVICE_BOARDING_TITLE',
      DropInVisit: 'WIZARD.SERVICE_DROP_IN_TITLE',
    };
    return map[type] ?? type;
  }

  unitKey(unit: string): string {
    const map: Record<string, string> = {
      PerHour: 'BOOKING.UNIT_HR',
      PerNight: 'BOOKING.UNIT_NIGHT',
      PerVisit: 'BOOKING.UNIT_VISIT',
    };
    return map[unit] ?? unit;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }

    this.mapService.getProviderProfile(id).subscribe({
      next: (p) => {
        this.profile.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  redirectToLogin(): void {
    this.router.navigate(['/login']);
  }

  openBookingModal(): void {
    if (!this.auth.isLoggedIn()) {
      this.toast.error(this.translate.instant('BOOKING.LOGIN_REQUIRED'));
      return;
    }
    this.isBookingModalOpen.set(true);
  }

  closeBookingModal(): void {
    this.isBookingModalOpen.set(false);
  }

  onBookingSuccess(): void {
    this.isBookingModalOpen.set(false);
    this.toast.success(this.translate.instant('BOOKING.SUCCESS'));
  }
}
