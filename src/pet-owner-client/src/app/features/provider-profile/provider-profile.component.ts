import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MapService, ProviderPublicProfile } from '../../services/map.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { PetService, Pet } from '../../services/pet.service';
import { RequestService } from '../../services/request.service';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
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
          @if (isLoggedIn()) {
            <button
              (click)="openRequestModal()"
              class="w-full flex items-center justify-center gap-2
                     bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                     text-white font-bold rounded-2xl py-4 text-base shadow-lg transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Now
            </button>
          } @else {
            <button
              (click)="redirectToLogin()"
              class="w-full flex items-center justify-center gap-2
                     bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                     text-white font-bold rounded-2xl py-4 text-base shadow-lg transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25V9m-3 0h13.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75v-7.5A.75.75 0 015.25 9z" />
              </svg>
              Login to Book
            </button>
          }
        </div>
      }
    </div>

    <!-- ─── Booking Modal ─── -->
    <div
      class="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center transition-opacity duration-200"
      [class.pointer-events-none]="!isRequestModalOpen()"
      [class.opacity-0]="!isRequestModalOpen()">

      <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" (click)="closeRequestModal()"></div>

      <div class="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[calc(100%-2rem)] sm:max-w-md p-6 z-10
                  max-h-[90vh] overflow-y-auto transition-all duration-200"
           [class.translate-y-full]="!isRequestModalOpen()"
           [class.translate-y-0]="isRequestModalOpen()">

        <h3 class="text-lg font-bold text-gray-900 mb-1">Book a Service</h3>
        @if (profile(); as p) {
          <p class="text-sm text-gray-500 mb-4">With <span class="font-medium text-violet-600">{{ p.name }}</span> · ₪{{ p.hourlyRate }}/hr</p>
        }

        @if (loadingPets()) {
          <div class="flex items-center justify-center py-8 gap-2 text-sm text-gray-500">
            <div class="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            Loading your pets...
          </div>
        } @else if (pets().length === 0) {
          <div class="text-center py-6">
            <p class="text-gray-500 text-sm mb-3">You don't have any pets yet.</p>
            <a href="/my-pets" class="text-indigo-600 font-medium text-sm hover:underline">Add a pet first</a>
          </div>
        } @else {
          <!-- Pet Selector -->
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Pet</label>
          <div class="space-y-2 mb-4 max-h-36 overflow-y-auto">
            @for (pet of pets(); track pet.id) {
              <label
                class="flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all duration-150"
                [class]="selectedPetId() === pet.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'">
                <input
                  type="radio"
                  name="pet"
                  [value]="pet.id"
                  [checked]="selectedPetId() === pet.id"
                  (change)="selectedPetId.set(pet.id)"
                  class="sr-only" />
                <span class="text-lg">{{ pet.species === 'Dog' ? '🐕' : pet.species === 'Cat' ? '🐈' : '🐾' }}</span>
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-gray-900 text-sm truncate">{{ pet.name }}</p>
                  <p class="text-xs text-gray-500">{{ pet.species }} · {{ pet.age }}y</p>
                </div>
                @if (selectedPetId() === pet.id) {
                  <svg class="w-5 h-5 text-indigo-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                }
              </label>
            }
          </div>

          <!-- Date & Time -->
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">When</label>
          <div class="space-y-3 mb-4">
            <input
              type="date"
              [value]="bookingDate()"
              (input)="bookingDate.set($any($event.target).value)"
              class="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900
                     focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Start</label>
                <input
                  type="time"
                  [value]="bookingStartTime()"
                  (input)="bookingStartTime.set($any($event.target).value)"
                  class="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900
                         focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">End</label>
                <input
                  type="time"
                  [value]="bookingEndTime()"
                  (input)="bookingEndTime.set($any($event.target).value)"
                  class="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900
                         focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
              </div>
            </div>
          </div>

          <!-- Notes -->
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes (optional)</label>
          <textarea
            rows="2"
            [value]="bookingNotes()"
            (input)="bookingNotes.set($any($event.target).value)"
            placeholder="Any special instructions for the sitter..."
            class="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400
                   focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none mb-4">
          </textarea>

          <!-- Share Medical Records -->
          <label class="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              [checked]="shareMedicalRecords()"
              (change)="shareMedicalRecords.set($any($event.target).checked)"
              class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <div class="min-w-0 flex-1">
              <span class="text-sm font-medium text-gray-800">Share health records</span>
              <p class="text-xs text-gray-500 mt-0.5">Allow the provider to view your pet's medical records for this booking</p>
            </div>
            <svg class="w-5 h-5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </label>

          <!-- Outside Working Hours Warning -->
          @if (isOutsideWorkingHours()) {
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-xl">
              <p class="text-sm text-yellow-700">⚠️ <b>Note:</b> The requested time is outside the sitter's regular working hours. You can still send the request, but it may take longer for them to approve.</p>
            </div>
          }

          <!-- Price Preview -->
          @if (estimatedPrice(); as price) {
            <div class="bg-indigo-50 rounded-xl p-3.5 mb-4 flex items-center justify-between">
              <div class="text-sm text-gray-600">
                {{ price.hours }}h × ₪{{ price.rate }}/hr
              </div>
              <div class="text-lg font-bold text-indigo-700">
                ₪{{ price.total }}
              </div>
            </div>
          }

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              (click)="sendRequest()"
              [disabled]="!canBook()"
              class="flex-1 flex items-center justify-center gap-2
                     bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-white font-semibold rounded-xl py-3 px-4
                     transition-colors duration-150 text-sm">
              @if (sendingRequest()) {
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              } @else {
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Send Request
              }
            </button>
            <button
              (click)="closeRequestModal()"
              class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-3 px-5
                     transition-colors duration-150 text-sm">
              Cancel
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProviderProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mapService = inject(MapService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly petService = inject(PetService);
  private readonly requestService = inject(RequestService);

  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  profile = signal<ProviderPublicProfile | null>(null);
  loading = signal(true);
  error = signal(false);

  isRequestModalOpen = signal(false);
  pets = signal<Pet[]>([]);
  selectedPetId = signal<string | null>(null);
  loadingPets = signal(false);
  sendingRequest = signal(false);

  bookingDate = signal('');
  bookingStartTime = signal('09:00');
  bookingEndTime = signal('11:00');
  bookingNotes = signal('');
  shareMedicalRecords = signal(false);

  estimatedPrice = computed(() => {
    const p = this.profile();
    const start = this.bookingStartTime();
    const end = this.bookingEndTime();
    if (!p || !start || !end) return null;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const hours = (eh * 60 + em - sh * 60 - sm) / 60;
    if (hours <= 0) return null;

    return {
      hours: Math.round(hours * 10) / 10,
      rate: p.hourlyRate,
      total: Math.round(p.hourlyRate * hours * 100) / 100,
    };
  });

  canBook = computed(() => {
    return !!this.selectedPetId()
      && !!this.bookingDate()
      && !!this.bookingStartTime()
      && !!this.bookingEndTime()
      && this.estimatedPrice() !== null
      && !this.sendingRequest();
  });

  isOutsideWorkingHours = computed(() => {
    const date = this.bookingDate();
    const startTime = this.bookingStartTime();
    const endTime = this.bookingEndTime();
    const slots = this.profile()?.availabilitySlots ?? [];
    if (!date || !startTime || !endTime || slots.length === 0) return false;

    const [y, m, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const startMin = this.timeToMinutes(startTime);
    const endMin = this.timeToMinutes(endTime);

    return !slots.some(s =>
      s.dayOfWeek === dayOfWeek
      && this.timeToMinutes(s.startTime) <= startMin
      && this.timeToMinutes(s.endTime) >= endMin
    );
  });

  private timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

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

  redirectToLogin(): void {
    this.router.navigate(['/login']);
  }

  openRequestModal(): void {
    if (!this.profile()) return;

    if (!this.auth.isLoggedIn()) {
      this.toast.error('You must be logged in to request a service.');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.bookingDate.set(tomorrow.toISOString().split('T')[0]);
    this.bookingStartTime.set('09:00');
    this.bookingEndTime.set('11:00');
    this.bookingNotes.set('');
    this.shareMedicalRecords.set(false);

    this.loadingPets.set(true);
    this.isRequestModalOpen.set(true);

    this.petService.getAll().subscribe({
      next: (pets) => {
        this.pets.set(pets);
        if (pets.length === 1) {
          this.selectedPetId.set(pets[0].id);
        }
        this.loadingPets.set(false);
      },
      error: () => {
        this.loadingPets.set(false);
        this.toast.error('Failed to load your pets.');
      },
    });
  }

  closeRequestModal(): void {
    this.isRequestModalOpen.set(false);
    this.selectedPetId.set(null);
    this.shareMedicalRecords.set(false);
  }

  sendRequest(): void {
    const p = this.profile();
    const petId = this.selectedPetId();
    const date = this.bookingDate();
    const start = this.bookingStartTime();
    const end = this.bookingEndTime();
    if (!p || !petId || !date || !start || !end) return;

    this.sendingRequest.set(true);

    const scheduledStart = `${date}T${start}:00`;
    const scheduledEnd = `${date}T${end}:00`;

    this.requestService.create({
      providerId: p.providerId,
      petId,
      scheduledStart,
      scheduledEnd,
      notes: this.bookingNotes().trim() || null,
      shareMedicalRecords: this.shareMedicalRecords(),
    }).subscribe({
      next: () => {
        this.sendingRequest.set(false);
        this.closeRequestModal();
        this.toast.success('Request sent successfully! Waiting for the sitter\'s approval.');
      },
      error: () => {
        this.sendingRequest.set(false);
      },
    });
  }
}
