import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Pet, PetService } from '../../services/pet.service';
import { petSpeciesEmoji } from '../../models/pet-species.model';
import { Activity, ActivityService, CreateActivityPayload } from '../../services/activity.service';
import { ToastService } from '../../services/toast.service';

const ACTIVITY_TYPES = ['Walk', 'Meal', 'Exercise', 'Weight'] as const;

@Component({
  selector: 'app-pet-activity',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-emerald-50 to-white px-4 py-8">
      <div class="max-w-2xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold text-slate-900">Activity Log</h1>
          <p class="mt-1 text-sm text-slate-500">Track walks, meals, exercise, and weight</p>
        </div>

        <!-- Pet Selector -->
        @if (petsLoading()) {
          <div class="flex justify-center py-12">
            <svg class="w-8 h-8 animate-spin text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        } @else if (pets().length === 0) {
          <div class="text-center py-16 text-slate-400">
            <p class="font-medium">No pets found</p>
            <p class="text-sm mt-1">Add a pet from the My Pets page first</p>
          </div>
        } @else {
          <!-- Pet Tabs -->
          <div class="flex gap-2 mb-6 overflow-x-auto pb-1">
            @for (pet of pets(); track pet.id) {
              <button
                (click)="selectPet(pet)"
                class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                [class]="selectedPet()?.id === pet.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-slate-600 hover:border-emerald-300'"
              >
                <span>{{ petSpeciesEmoji(pet.species) }}</span>
                {{ pet.name }}
              </button>
            }
          </div>

          @if (selectedPet()) {
            <!-- Quick Log Buttons -->
            <div class="grid grid-cols-4 gap-3 mb-6">
              @for (t of activityTypes; track t) {
                <button
                  (click)="quickLog(t)"
                  class="flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all"
                  [class]="activeType() === t
                    ? typeActiveClass(t)
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'"
                >
                  <span class="text-2xl">{{ typeEmoji(t) }}</span>
                  <span class="text-xs font-semibold" [class]="activeType() === t ? 'text-white' : 'text-slate-600'">{{ t }}</span>
                </button>
              }
            </div>

            <!-- Quick Log Form -->
            @if (activeType()) {
              <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">{{ typeEmoji(activeType()!) }}</span>
                  <h3 class="text-base font-semibold text-slate-900">Log {{ activeType() }}</h3>
                </div>

                <form (ngSubmit)="submitActivity()" class="space-y-3">
                  <div class="grid grid-cols-2 gap-3">
                    @if (activeType() === 'Walk' || activeType() === 'Exercise') {
                      <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1">Duration (min)</label>
                        <input type="number" [(ngModel)]="formDuration" name="duration" min="1" placeholder="e.g., 30"
                               dir="auto"
                               class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-start placeholder:text-start text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition" />
                      </div>
                    }
                    @if (activeType() === 'Walk') {
                      <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1">Distance (km)</label>
                        <input type="number" [(ngModel)]="formValue" name="value" min="0" step="0.1" placeholder="e.g., 2.5"
                               dir="auto"
                               class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-start placeholder:text-start text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition" />
                      </div>
                    }
                    @if (activeType() === 'Weight') {
                      <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1">Weight (kg)</label>
                        <input type="number" [(ngModel)]="formValue" name="value" min="0" step="0.1" placeholder="e.g., 8.5" required
                               dir="auto"
                               class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-start placeholder:text-start text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition" />
                      </div>
                    }
                    @if (activeType() === 'Exercise') {
                      <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1">Calories</label>
                        <input type="number" [(ngModel)]="formValue" name="value" min="0" placeholder="e.g., 150"
                               dir="auto"
                               class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-start placeholder:text-start text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition" />
                      </div>
                    }
                    <div>
                      <label class="block text-xs font-medium text-slate-600 mb-1">Date</label>
                      <input type="date" [(ngModel)]="formDate" name="date" required
                             dir="auto"
                             class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-start text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition" />
                    </div>
                  </div>

                  @if (activeType() !== 'Weight') {
                    <div>
                      <label class="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
                      <input type="text" [(ngModel)]="formNotes" name="notes" placeholder="Quick note..."
                             dir="auto"
                             class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-start placeholder:text-start text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition" />
                    </div>
                  }

                  <div class="flex gap-2 pt-1">
                    <button type="submit" [disabled]="submitting()"
                            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition">
                      {{ submitting() ? 'Saving...' : 'Log Activity' }}
                    </button>
                    <button type="button" (click)="cancelForm()"
                            class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            }

            <!-- View Dashboard Link -->
            <button
              (click)="goToDashboard()"
              class="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm font-medium text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Fitness Dashboard
            </button>

            <!-- Recent Activities -->
            <div class="mb-4">
              <h3 class="text-sm font-semibold text-slate-700 mb-3">Recent Activity</h3>
              @if (activitiesLoading()) {
                <div class="flex items-center justify-center py-8 text-slate-400">
                  <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span class="text-sm">Loading...</span>
                </div>
              } @else if (activities().length === 0) {
                <div class="text-center py-8 text-slate-400">
                  <p class="text-sm">No activities logged yet. Use the buttons above to get started!</p>
                </div>
              } @else {
                <div class="space-y-2">
                  @for (act of activities(); track act.id) {
                    <div class="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg" [class]="typeBgClass(act.type)">
                        {{ typeEmoji(act.type) }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-semibold text-slate-800">{{ act.type }}</span>
                          @if (act.durationMinutes) {
                            <span class="text-xs text-slate-400">{{ act.durationMinutes }} min</span>
                          }
                          @if (act.value != null) {
                            <span class="text-xs text-slate-400">{{ formatValue(act) }}</span>
                          }
                        </div>
                        <p class="text-xs text-slate-400">{{ act.date | date:'mediumDate' }}</p>
                        @if (act.notes) {
                          <p class="text-xs text-slate-500 mt-0.5 truncate">{{ act.notes }}</p>
                        }
                      </div>
                      <button (click)="deleteActivity(act)" class="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class PetActivityComponent implements OnInit {
  private readonly petService = inject(PetService);
  private readonly activityService = inject(ActivityService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly activityTypes = ACTIVITY_TYPES;
  readonly petSpeciesEmoji = petSpeciesEmoji;

  pets = signal<Pet[]>([]);
  petsLoading = signal(true);
  selectedPet = signal<Pet | null>(null);
  activities = signal<Activity[]>([]);
  activitiesLoading = signal(false);
  activeType = signal<string | null>(null);
  submitting = signal(false);

  formValue: number | null = null;
  formDuration: number | null = null;
  formNotes = '';
  formDate = new Date().toISOString().substring(0, 10);

  ngOnInit(): void {
    this.petService.getAll().subscribe({
      next: (pets) => {
        this.pets.set(pets);
        this.petsLoading.set(false);
        if (pets.length > 0) this.selectPet(pets[0]);
      },
      error: () => {
        this.toast.error('Failed to load pets.');
        this.petsLoading.set(false);
      },
    });
  }

  selectPet(pet: Pet): void {
    this.selectedPet.set(pet);
    this.activeType.set(null);
    this.loadActivities(pet.id);
  }

  private loadActivities(petId: string): void {
    this.activitiesLoading.set(true);
    this.activityService.getAll(petId, 30).subscribe({
      next: (items) => {
        this.activities.set(items);
        this.activitiesLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load activities.');
        this.activitiesLoading.set(false);
      },
    });
  }

  quickLog(type: string): void {
    if (this.activeType() === type) {
      this.activeType.set(null);
      return;
    }
    this.activeType.set(type);
    this.resetForm();
  }

  submitActivity(): void {
    const pet = this.selectedPet();
    const type = this.activeType();
    if (!pet || !type || this.submitting() || !this.formDate) return;

    if (type === 'Weight' && !this.formValue) {
      this.toast.error('Please enter a weight value.');
      return;
    }

    this.submitting.set(true);
    const payload: CreateActivityPayload = {
      type,
      value: this.formValue,
      durationMinutes: this.formDuration,
      notes: this.formNotes.trim() || null,
      date: new Date(this.formDate).toISOString(),
    };

    this.activityService.create(pet.id, payload).subscribe({
      next: () => {
        this.toast.success(`${type} logged!`);
        this.activeType.set(null);
        this.resetForm();
        this.loadActivities(pet.id);
        this.submitting.set(false);
      },
      error: () => {
        this.toast.error('Failed to log activity.');
        this.submitting.set(false);
      },
    });
  }

  deleteActivity(act: Activity): void {
    if (!confirm('Delete this activity?')) return;
    const pet = this.selectedPet();
    if (!pet) return;

    this.activityService.delete(pet.id, act.id).subscribe({
      next: () => {
        this.activities.update((list) => list.filter((a) => a.id !== act.id));
        this.toast.success('Activity deleted.');
      },
      error: () => this.toast.error('Failed to delete activity.'),
    });
  }

  cancelForm(): void {
    this.activeType.set(null);
    this.resetForm();
  }

  goToDashboard(): void {
    const pet = this.selectedPet();
    if (pet) this.router.navigate(['/fitness'], { queryParams: { petId: pet.id } });
  }

  formatValue(act: Activity): string {
    if (act.value == null) return '';
    switch (act.type) {
      case 'Walk': return `${act.value} km`;
      case 'Weight': return `${act.value} kg`;
      case 'Exercise': return `${act.value} cal`;
      default: return `${act.value}`;
    }
  }

  typeEmoji(type: string): string {
    switch (type) {
      case 'Walk': return '\uD83D\uDEB6';
      case 'Meal': return '\uD83C\uDF7D\uFE0F';
      case 'Exercise': return '\uD83C\uDFCB\uFE0F';
      case 'Weight': return '\u2696\uFE0F';
      default: return '\uD83D\uDCCB';
    }
  }

  typeActiveClass(type: string): string {
    switch (type) {
      case 'Walk': return 'bg-emerald-600 border-emerald-600 text-white shadow-md';
      case 'Meal': return 'bg-orange-500 border-orange-500 text-white shadow-md';
      case 'Exercise': return 'bg-blue-600 border-blue-600 text-white shadow-md';
      case 'Weight': return 'bg-purple-600 border-purple-600 text-white shadow-md';
      default: return 'bg-gray-600 border-gray-600 text-white shadow-md';
    }
  }

  typeBgClass(type: string): string {
    switch (type) {
      case 'Walk': return 'bg-emerald-100';
      case 'Meal': return 'bg-orange-100';
      case 'Exercise': return 'bg-blue-100';
      case 'Weight': return 'bg-purple-100';
      default: return 'bg-gray-100';
    }
  }

  private resetForm(): void {
    this.formValue = null;
    this.formDuration = null;
    this.formNotes = '';
    this.formDate = new Date().toISOString().substring(0, 10);
  }
}
