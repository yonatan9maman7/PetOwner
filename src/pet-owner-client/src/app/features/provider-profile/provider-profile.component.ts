import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MapService, ProviderPublicProfile } from '../../services/map.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { FavoriteService } from '../../services/favorite.service';
import { petSpeciesEmoji, petSpeciesLabel } from '../../models/pet-species.model';
import { BookingModalComponent, BookingModalInput } from '../../shared/booking-modal/booking-modal.component';
import { ServiceTypePipe, PricingUnitPipe } from '../../shared/service-type.utils';
import { RouterLink } from '@angular/router';

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
  imports: [CommonModule, DatePipe, TranslatePipe, RouterLink, BookingModalComponent, ServiceTypePipe, PricingUnitPipe],
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
          <div class="flex items-center justify-between mb-6">
            <button type="button" (click)="goBack()" class="flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors">
              <svg class="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {{ 'PROVIDER_PROFILE.BACK' | translate }}
            </button>
            @if (isLoggedIn()) {
              <button
                type="button"
                (click)="toggleFavorite()"
                class="p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                [attr.aria-label]="(isFavorited() ? 'FAVORITES.REMOVE' : 'FAVORITES.ADD') | translate">
                @if (isFavorited()) {
                  <svg class="w-6 h-6 text-red-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                } @else {
                  <svg class="w-6 h-6 text-white/70 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                }
              </button>
            }
          </div>
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
                  <span class="inline-flex items-center gap-1 text-sm text-white/90 bg-white/10 px-2 py-0.5 rounded-full">
                    <span class="text-amber-300">&#9733;</span>
                    {{ profile()!.averageRating }}
                    <span class="text-white/60">({{ 'PROVIDER_PROFILE.REVIEWS_COUNT' | translate: { count: profile()!.reviewCount } }})</span>
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
              @for (rate of profile()!.serviceRates; track $index) {
                <div class="flex items-center justify-between gap-2 py-1.5">
                  <span class="text-sm font-medium text-gray-800 text-start">{{ rate.serviceType | serviceType | translate }}</span>
                  <span class="text-sm font-semibold text-indigo-700 shrink-0" dir="auto">
                    ₪{{ rate.rate }}/{{ rate.pricingUnit | pricingUnit | translate }}
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
              {{ 'PROVIDER_PROFILE.REVIEWS_TITLE' | translate }}
              @if (profile()!.reviewCount > 0) {
                <span class="text-gray-400 font-normal">({{ profile()!.reviewCount }})</span>
              }
            </h2>
            @if (profile()!.recentReviews.length === 0) {
              <p class="text-sm text-gray-400 text-center py-4">{{ 'DASHBOARD.NO_REVIEWS_YET' | translate }}</p>
            } @else {
              <div class="space-y-3">
                @for (review of profile()!.recentReviews; track review.id) {
                  <div class="border border-gray-100 rounded-xl p-3 text-start">
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0 overflow-hidden">
                          @if (review.reviewerAvatar) {
                            <img [src]="review.reviewerAvatar" [alt]="review.reviewerName" class="w-full h-full object-cover" />
                          } @else {
                            <span class="text-gray-400">{{ review.reviewerName.charAt(0) }}</span>
                          }
                        </div>
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
            <div class="space-y-3">
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
              <a
                [routerLink]="['/chat', profile()!.providerId]"
                [state]="{ name: profile()!.name, avatar: profile()!.profileImageUrl }"
                class="w-full flex items-center justify-center gap-2
                       bg-white hover:bg-gray-50 active:bg-gray-100
                       text-violet-700 font-bold rounded-2xl py-4 text-base shadow-lg transition-colors
                       border-2 border-violet-200">
                <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
                {{ 'CHAT.SEND_MESSAGE' | translate }}
              </a>
              <button
                type="button"
                (click)="contactViaWhatsApp()"
                [disabled]="whatsAppLoading()"
                class="w-full flex items-center justify-center gap-2
                       bg-[#25D366] hover:bg-[#1fb855] active:bg-[#1a9e49]
                       text-white font-bold rounded-2xl py-4 text-base shadow-lg transition-colors
                       disabled:opacity-50 disabled:cursor-wait">
                <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.477-.67-6.309-1.826l-.452-.277-2.644.886.886-2.644-.277-.452A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                {{ 'PROFILE.WHATSAPP_BTN' | translate }}
              </button>
            </div>
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
  private readonly favoriteService = inject(FavoriteService);

  readonly petSpeciesEmoji = petSpeciesEmoji;
  readonly petSpeciesLabel = petSpeciesLabel;

  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());
  readonly isFavorited = computed(() => {
    const p = this.profile();
    return p ? this.favoriteService.isFavorited(p.providerId) : false;
  });

  profile = signal<ProviderPublicProfile | null>(null);
  loading = signal(true);
  error = signal(false);

  isBookingModalOpen = signal(false);
  whatsAppLoading = signal(false);

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
      Training: 'WIZARD.SERVICE_TRAINING_TITLE',
      Insurance: 'WIZARD.SERVICE_INSURANCE_TITLE',
    };
    return map[type] ?? type;
  }

  unitKey(unit: string): string {
    const map: Record<string, string> = {
      PerHour: 'BOOKING.UNIT_HR',
      PerNight: 'BOOKING.UNIT_NIGHT',
      PerVisit: 'BOOKING.UNIT_VISIT',
      PerSession: 'BOOKING.UNIT_SESSION',
      PerPackage: 'BOOKING.UNIT_PACKAGE',
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

  toggleFavorite(): void {
    const p = this.profile();
    if (!p) return;
    this.favoriteService.toggle(p.providerId).subscribe();
  }

  contactViaWhatsApp(): void {
    const p = this.profile();
    if (!p) return;

    this.whatsAppLoading.set(true);
    this.mapService.getProviderContact(p.providerId).subscribe({
      next: ({ phone }) => {
        this.whatsAppLoading.set(false);
        const formatted = this.formatIsraeliPhone(phone);
        const msg = this.translate.instant('PROFILE.WHATSAPP_MSG', { name: p.name });
        window.open(
          `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`,
          '_blank',
          'noopener',
        );
      },
      error: () => {
        this.whatsAppLoading.set(false);
        this.toast.error(this.translate.instant('PROFILE.WHATSAPP_ERROR'));
      },
    });
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
}
