import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MapService, ProviderPublicProfile } from '../../services/map.service';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="min-h-screen bg-gray-50">
      @if (loading()) {
        <div class="flex items-center justify-center h-screen">
          <div class="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (error()) {
        <div class="flex flex-col items-center justify-center h-screen gap-4">
          <p class="text-gray-500">Provider not found</p>
          <button (click)="goBack()" class="text-violet-600 font-medium hover:underline">Back to map</button>
        </div>
      } @else if (!error() && profile()) {
        <!-- Hero -->
        <div class="bg-gradient-to-br from-violet-600 to-indigo-700 text-white pt-12 pb-16 px-5">
          <button (click)="goBack()" class="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-6 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div class="flex items-center gap-4">
            <div class="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl overflow-hidden ring-4 ring-white/30 shrink-0">
              @if (profile()!.profileImageUrl) {
                <img [src]="profile()!.profileImageUrl" [alt]="profile()!.name" class="w-full h-full object-cover" />
              } @else {
                🐾
              }
            </div>
            <div class="min-w-0">
              <h1 class="text-2xl font-bold truncate">{{ profile()!.name }}</h1>
              <div class="flex items-center gap-2 mt-1">
                @if (profile()!.isAvailableNow) {
                  <span class="inline-flex items-center gap-1 bg-emerald-500/25 text-emerald-100 text-xs font-semibold px-2 py-0.5 rounded-full">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                    Available
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1 bg-white/15 text-white/70 text-xs font-semibold px-2 py-0.5 rounded-full">
                    Offline
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
          <!-- Rate + Services card -->
          <div class="bg-white rounded-2xl shadow-md p-5">
            <div class="flex items-baseline justify-between mb-3">
              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Hourly Rate</p>
                <p class="text-3xl font-bold text-gray-900">₪{{ profile()!.hourlyRate }}</p>
              </div>
              @if (profile()!.acceptsOffHoursRequests) {
                <span class="text-xs bg-amber-50 text-amber-700 font-medium px-2 py-1 rounded-full border border-amber-200">Off-hours OK</span>
              }
            </div>
            <div class="flex flex-wrap gap-1.5">
              @for (svc of profile()!.services; track svc) {
                <span class="bg-violet-50 text-violet-700 text-xs font-medium px-2.5 py-1 rounded-full">{{ svc }}</span>
              }
            </div>
          </div>

          <!-- Bio -->
          @if (profile()!.bio) {
            <div class="bg-white rounded-2xl shadow-md p-5">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">About</h2>
              <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ profile()!.bio }}</p>
            </div>
          }

          <!-- Availability -->
          @if (profile()!.availabilitySlots.length > 0) {
            <div class="bg-white rounded-2xl shadow-md p-5">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Weekly Schedule</h2>
              <div class="space-y-2">
                @for (slot of profile()!.availabilitySlots; track $index) {
                  <div class="flex items-center justify-between py-1.5">
                    <span class="text-sm font-medium text-gray-800">{{ dayName(slot.dayOfWeek) }}</span>
                    <span class="text-sm text-gray-500">{{ slot.startTime }} – {{ slot.endTime }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Reviews -->
          <div class="bg-white rounded-2xl shadow-md p-5">
            <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Reviews ({{ profile()!.reviewCount }})
            </h2>
            @if (profile()!.recentReviews.length === 0) {
              <p class="text-sm text-gray-400 text-center py-4">No reviews yet</p>
            } @else {
              <div class="space-y-3">
                @for (review of profile()!.recentReviews; track review.id) {
                  <div class="border border-gray-100 rounded-xl p-3">
                    <div class="flex items-center justify-between mb-1">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-sm text-gray-800">{{ review.reviewerName }}</span>
                        @if (review.isVerified) {
                          <span class="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700
                                       text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-200">
                            <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        }
                      </div>
                      <span class="text-[10px] text-gray-400">{{ review.createdAt | date:'mediumDate' }}</span>
                    </div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-amber-500 text-xs">
                        @for (s of [1,2,3,4,5]; track s) {
                          <span [class]="s <= review.rating ? 'opacity-100' : 'opacity-25'">&#9733;</span>
                        }
                      </span>
                      @if (review.communicationRating || review.reliabilityRating) {
                        <span class="text-[10px] text-gray-400">
                          @if (review.communicationRating) { Comm {{ review.communicationRating }}/5 }
                          @if (review.communicationRating && review.reliabilityRating) { · }
                          @if (review.reliabilityRating) { Reliability {{ review.reliabilityRating }}/5 }
                        </span>
                      }
                    </div>
                    @if (review.comment) {
                      <p class="text-xs text-gray-600 leading-relaxed">{{ review.comment }}</p>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- CTA -->
          <button
            (click)="bookProvider()"
            class="w-full flex items-center justify-center gap-2
                   bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                   text-white font-bold rounded-2xl py-4 text-base shadow-lg transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Book Now
          </button>
        </div>
      }
    </div>
  `,
})
export class ProviderProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mapService = inject(MapService);

  profile = signal<ProviderPublicProfile | null>(null);
  loading = signal(true);
  error = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set(true); this.loading.set(false); return; }

    this.mapService.getProviderProfile(id).subscribe({
      next: (p) => { this.profile.set(p); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  dayName(day: number): string {
    return DAY_NAMES[day] ?? `Day ${day}`;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  bookProvider(): void {
    this.router.navigate(['/']);
  }
}
