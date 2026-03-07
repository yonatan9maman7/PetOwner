import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Pet, PetService } from '../../services/pet.service';
import { ActivityService, ActivitySummary, WeightEntry } from '../../services/activity.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-fitness-dashboard',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-emerald-50 to-white px-4 py-8">
      <div class="max-w-2xl mx-auto">

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-slate-900">Fitness Dashboard</h1>
            @if (selectedPet()) {
              <p class="text-sm text-slate-500">{{ selectedPet()!.name }}'s activity overview</p>
            }
          </div>
          <button
            (click)="goToLog()"
            class="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 transition-colors"
          >
            + Log Activity
          </button>
        </div>

        <!-- Pet Tabs -->
        @if (pets().length > 1) {
          <div class="flex gap-2 mb-6 overflow-x-auto pb-1">
            @for (pet of pets(); track pet.id) {
              <button
                (click)="selectPet(pet)"
                class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                [class]="selectedPet()?.id === pet.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-slate-600 hover:border-emerald-300'"
              >
                {{ pet.name }}
              </button>
            }
          </div>
        }

        @if (loading()) {
          <div class="flex justify-center py-16">
            <svg class="w-8 h-8 animate-spin text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        } @else if (summary()) {

          <!-- Streak Banner -->
          @if (summary()!.currentStreak > 0) {
            <div class="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-5 mb-6 text-white shadow-lg">
              <div class="flex items-center gap-4">
                <div class="text-4xl font-black">{{ summary()!.currentStreak }}</div>
                <div>
                  <p class="font-bold text-sm">Day Streak!</p>
                  <p class="text-xs opacity-80">Keep up the great work with {{ selectedPet()?.name }}</p>
                </div>
                <div class="ml-auto text-5xl opacity-70">&#x1F525;</div>
              </div>
            </div>
          }

          <!-- Stat Cards -->
          <div class="grid grid-cols-2 gap-3 mb-6">
            <!-- Walks -->
            <div class="bg-white rounded-2xl border border-gray-100 p-4">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-sm">&#x1F6B6;</div>
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Walks</span>
              </div>
              <p class="text-2xl font-bold text-slate-900">{{ summary()!.totalWalks }}</p>
              <div class="flex gap-3 mt-1">
                <span class="text-xs text-slate-400">{{ summary()!.totalWalkMinutes }} min</span>
                <span class="text-xs text-slate-400">{{ summary()!.totalWalkDistance.toFixed(1) }} km</span>
              </div>
            </div>

            <!-- Exercise -->
            <div class="bg-white rounded-2xl border border-gray-100 p-4">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm">&#x1F3CB;&#xFE0F;</div>
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Exercise</span>
              </div>
              <p class="text-2xl font-bold text-slate-900">{{ summary()!.totalExercises }}</p>
              <span class="text-xs text-slate-400">{{ summary()!.totalExerciseMinutes }} min total</span>
            </div>

            <!-- Meals -->
            <div class="bg-white rounded-2xl border border-gray-100 p-4">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-sm">&#x1F37D;&#xFE0F;</div>
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Meals</span>
              </div>
              <p class="text-2xl font-bold text-slate-900">{{ summary()!.totalMeals }}</p>
              <span class="text-xs text-slate-400">in the last 30 days</span>
            </div>

            <!-- Current Weight -->
            <div class="bg-white rounded-2xl border border-gray-100 p-4">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-sm">&#x2696;&#xFE0F;</div>
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Weight</span>
              </div>
              @if (latestWeight()) {
                <p class="text-2xl font-bold text-slate-900">{{ latestWeight()!.value }} kg</p>
                <span class="text-xs text-slate-400">{{ latestWeight()!.date | date:'mediumDate' }}</span>
              } @else {
                <p class="text-lg font-semibold text-slate-300">No data</p>
              }
            </div>
          </div>

          <!-- Weight Trend Chart -->
          @if (summary()!.weightHistory.length >= 2) {
            <div class="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
              <h3 class="text-sm font-semibold text-slate-700 mb-4">Weight Trend</h3>
              <div class="relative h-40">
                <svg class="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
                  <!-- Grid lines -->
                  <line x1="0" y1="0" x2="400" y2="0" stroke="#e2e8f0" stroke-width="0.5" />
                  <line x1="0" y1="40" x2="400" y2="40" stroke="#e2e8f0" stroke-width="0.5" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="#e2e8f0" stroke-width="0.5" />
                  <line x1="0" y1="120" x2="400" y2="120" stroke="#e2e8f0" stroke-width="0.5" />
                  <line x1="0" y1="160" x2="400" y2="160" stroke="#e2e8f0" stroke-width="0.5" />

                  <!-- Area fill -->
                  <path [attr.d]="weightAreaPath()" fill="url(#weightGrad)" />

                  <!-- Line -->
                  <path [attr.d]="weightLinePath()" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

                  <!-- Dots -->
                  @for (pt of weightPoints(); track $index) {
                    <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="4" fill="#8b5cf6" stroke="white" stroke-width="2" />
                  }

                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.3" />
                      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.02" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div class="flex justify-between mt-2">
                <span class="text-[10px] text-slate-400">{{ summary()!.weightHistory[0].date | date:'shortDate' }}</span>
                <span class="text-[10px] text-slate-400">{{ summary()!.weightHistory[summary()!.weightHistory.length - 1].date | date:'shortDate' }}</span>
              </div>
            </div>
          }

          <!-- Weekly Activity Bars -->
          @if (weeklyBars().length > 0) {
            <div class="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
              <h3 class="text-sm font-semibold text-slate-700 mb-4">Weekly Activity</h3>
              <div class="flex items-end gap-2 h-32">
                @for (bar of weeklyBars(); track bar.label) {
                  <div class="flex-1 flex flex-col items-center gap-1">
                    <span class="text-[10px] font-semibold text-slate-600">{{ bar.count }}</span>
                    <div
                      class="w-full rounded-t-lg bg-emerald-400 transition-all"
                      [style.height.%]="bar.height"
                      [style.min-height.px]="bar.count > 0 ? 8 : 2"
                      [class]="bar.count > 0 ? 'bg-emerald-400' : 'bg-gray-200'"
                    ></div>
                    <span class="text-[10px] text-slate-400">{{ bar.label }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- No data fallback -->
          @if (summary()!.totalWalks === 0 && summary()!.totalMeals === 0 && summary()!.totalExercises === 0 && summary()!.weightHistory.length === 0) {
            <div class="text-center py-12 text-slate-400">
              <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3 text-3xl">
                &#x1F3C3;
              </div>
              <p class="font-medium">No activity data yet</p>
              <p class="text-sm mt-1">Start logging walks, meals, and exercise to see your dashboard</p>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class FitnessDashboardComponent implements OnInit {
  private readonly petService = inject(PetService);
  private readonly activityService = inject(ActivityService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  pets = signal<Pet[]>([]);
  selectedPet = signal<Pet | null>(null);
  summary = signal<ActivitySummary | null>(null);
  loading = signal(true);

  latestWeight = computed(() => {
    const s = this.summary();
    if (!s || s.weightHistory.length === 0) return null;
    return s.weightHistory[s.weightHistory.length - 1];
  });

  weightPoints = computed(() => {
    const s = this.summary();
    if (!s || s.weightHistory.length < 2) return [];
    return this.calcWeightPoints(s.weightHistory);
  });

  weightLinePath = computed(() => {
    const pts = this.weightPoints();
    if (pts.length < 2) return '';
    return 'M' + pts.map((p) => `${p.x},${p.y}`).join(' L');
  });

  weightAreaPath = computed(() => {
    const pts = this.weightPoints();
    if (pts.length < 2) return '';
    const line = pts.map((p) => `${p.x},${p.y}`).join(' L');
    return `M${pts[0].x},160 L${line} L${pts[pts.length - 1].x},160 Z`;
  });

  weeklyBars = computed(() => {
    const s = this.summary();
    if (!s) return [];
    const entries = Object.entries(s.weeklyBreakdown)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries.map(([date, count]) => {
      const d = new Date(date);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      return { label, count, height: (count / max) * 100 };
    });
  });

  ngOnInit(): void {
    this.petService.getAll().subscribe({
      next: (pets) => {
        this.pets.set(pets);
        const qp = this.route.snapshot.queryParams['petId'];
        const pet = qp ? pets.find((p) => p.id === qp) : pets[0];
        if (pet) this.selectPet(pet);
        else this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load pets.');
        this.loading.set(false);
      },
    });
  }

  selectPet(pet: Pet): void {
    this.selectedPet.set(pet);
    this.loadSummary(pet.id);
  }

  goToLog(): void {
    this.router.navigate(['/activity']);
  }

  private loadSummary(petId: string): void {
    this.loading.set(true);
    this.activityService.getSummary(petId, 30).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load fitness data.');
        this.loading.set(false);
      },
    });
  }

  private calcWeightPoints(history: WeightEntry[]): { x: number; y: number }[] {
    const values = history.map((h) => h.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = 10;

    return history.map((h, i) => ({
      x: history.length === 1 ? 200 : (i / (history.length - 1)) * 400,
      y: padding + ((max - h.value) / range) * (160 - 2 * padding),
    }));
  }
}
