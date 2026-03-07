import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Pet, PetService } from '../../services/pet.service';
import { MedicalRecord, MedicalRecordService } from '../../services/medical-record.service';
import { TeletriageService, TeletriageHistory } from '../../services/teletriage.service';
import { ToastService } from '../../services/toast.service';

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Other'] as const;
const RECORD_TYPES = ['Vaccination', 'Condition', 'Medication', 'VetVisit'] as const;

@Component({
  selector: 'app-my-pets',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-4 py-8">
      <div class="max-w-2xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-slate-900">My Pets</h1>
          <p class="mt-1 text-sm text-slate-500">Manage your furry (or scaly) family members</p>
        </div>

        <!-- Loading State -->
        @if (loading()) {
          <div class="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg class="w-8 h-8 animate-spin mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <p class="text-sm">Loading your pets...</p>
          </div>
        } @else {

          <!-- Pet Grid -->
          @if (pets().length > 0) {
            <div class="space-y-4 mb-8">
              @for (pet of pets(); track pet.id) {
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div class="relative p-5">
                    <!-- Delete button -->
                    <button
                      type="button"
                      (click)="confirmDelete(pet)"
                      class="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
                      title="Remove pet"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl"
                           [class]="speciesIconClass(pet.species)">
                        {{ speciesEmoji(pet.species) }}
                      </div>
                      <div class="min-w-0 flex-1 pr-6">
                        <h3 class="text-lg font-semibold text-slate-900 truncate">{{ pet.name }}</h3>
                        <p class="text-xs text-slate-500">
                          {{ pet.species }} · {{ pet.age }} {{ pet.age === 1 ? 'year' : 'years' }} old
                        </p>
                      </div>
                    </div>

                    @if (pet.notes) {
                      <p class="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">{{ pet.notes }}</p>
                    }

                    <!-- Health Records & Triage History Toggles -->
                    <div class="mt-3 flex items-center gap-4">
                      <button
                        type="button"
                        (click)="toggleHealthRecords(pet)"
                        class="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
                        [class]="expandedPetId() === pet.id ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Health Records
                        <svg class="w-3.5 h-3.5 transition-transform duration-200" [class.rotate-180]="expandedPetId() === pet.id" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        (click)="toggleTriageHistory(pet)"
                        class="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
                        [class]="triagePetId() === pet.id ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Triage History
                        <svg class="w-3.5 h-3.5 transition-transform duration-200" [class.rotate-180]="triagePetId() === pet.id" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Expanded Health Records Panel -->
                  @if (expandedPetId() === pet.id) {
                    <div class="border-t border-gray-100 bg-slate-50 p-5">

                      <!-- Loading records -->
                      @if (recordsLoading()) {
                        <div class="flex items-center justify-center py-6 text-slate-400">
                          <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          <span class="text-sm">Loading records...</span>
                        </div>
                      } @else {

                        <!-- Records List -->
                        @if (records().length > 0) {
                          <div class="space-y-3 mb-4">
                            @for (rec of records(); track rec.id) {
                              <div class="bg-white rounded-xl border border-gray-100 p-4">
                                <div class="flex items-start justify-between gap-2">
                                  <div class="flex items-start gap-3 min-w-0 flex-1">
                                    <div class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                         [class]="recordTypeClass(rec.type)">
                                      {{ recordTypeIcon(rec.type) }}
                                    </div>
                                    <div class="min-w-0 flex-1">
                                      <div class="flex items-center gap-2 flex-wrap">
                                        <h4 class="text-sm font-semibold text-slate-900">{{ rec.title }}</h4>
                                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                                              [class]="recordTypeBadgeClass(rec.type)">
                                          {{ rec.type === 'VetVisit' ? 'Vet Visit' : rec.type }}
                                        </span>
                                      </div>
                                      <p class="text-xs text-slate-400 mt-0.5">{{ rec.date | date:'mediumDate' }}</p>
                                      @if (rec.description) {
                                        <p class="text-sm text-slate-600 mt-1.5 leading-relaxed">{{ rec.description }}</p>
                                      }
                                      @if (rec.documentUrl) {
                                        <a [href]="rec.documentUrl" target="_blank" rel="noopener"
                                           class="inline-flex items-center gap-1 mt-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                                          </svg>
                                          View Document
                                        </a>
                                      }
                                    </div>
                                  </div>
                                  <div class="flex items-center gap-1 flex-shrink-0">
                                    <button type="button" (click)="editRecord(rec)"
                                            class="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors">
                                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button type="button" (click)="confirmDeleteRecord(rec)"
                                            class="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            }
                          </div>
                        } @else if (!showRecordForm()) {
                          <div class="text-center py-6">
                            <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl mx-auto mb-2">
                              📋
                            </div>
                            <p class="text-sm text-slate-500 mb-1">No health records yet</p>
                            <p class="text-xs text-slate-400">Add vaccinations, conditions, medications, or vet visits</p>
                          </div>
                        }

                        <!-- Add / Edit Record Form -->
                        @if (showRecordForm()) {
                          <div class="bg-white rounded-xl border border-indigo-100 p-4">
                            <h4 class="text-sm font-semibold text-slate-900 mb-3">
                              {{ editingRecordId() ? 'Edit Record' : 'Add Record' }}
                            </h4>
                            <form (ngSubmit)="submitRecord()" class="space-y-3">
                              <div class="grid grid-cols-2 gap-3">
                                <div>
                                  <label class="block text-xs font-medium text-slate-600 mb-1">Type</label>
                                  <select [(ngModel)]="recType" name="recType" required
                                          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition">
                                    @for (t of recordTypes; track t) {
                                      <option [value]="t">{{ t === 'VetVisit' ? 'Vet Visit' : t }}</option>
                                    }
                                  </select>
                                </div>
                                <div>
                                  <label class="block text-xs font-medium text-slate-600 mb-1">Date</label>
                                  <input type="date" [(ngModel)]="recDate" name="recDate" required
                                         class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
                                </div>
                              </div>
                              <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">Title</label>
                                <input type="text" [(ngModel)]="recTitle" name="recTitle" required placeholder="e.g., Rabies vaccine"
                                       class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
                              </div>
                              <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
                                <textarea [(ngModel)]="recDescription" name="recDescription" rows="2" placeholder="Additional details..."
                                          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none"></textarea>
                              </div>
                              <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">Document URL (optional)</label>
                                <input type="url" [(ngModel)]="recDocumentUrl" name="recDocumentUrl" placeholder="https://..."
                                       class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
                              </div>
                              <div class="flex gap-2">
                                <button type="submit" [disabled]="recordSubmitting()"
                                        class="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition">
                                  {{ recordSubmitting() ? 'Saving...' : (editingRecordId() ? 'Update' : 'Add Record') }}
                                </button>
                                <button type="button" (click)="cancelRecordForm()"
                                        class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        } @else {
                          <button type="button" (click)="openAddRecordForm()"
                                  class="w-full rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm font-medium text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors duration-150">
                            + Add Health Record
                          </button>
                        }
                      }
                    </div>
                  }

                  <!-- Expanded Triage History Panel -->
                  @if (triagePetId() === pet.id) {
                    <div class="border-t border-gray-100 bg-emerald-50/50 p-5">
                      @if (triageLoading()) {
                        <div class="flex items-center justify-center py-6 text-slate-400">
                          <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          <span class="text-sm">Loading triage history...</span>
                        </div>
                      } @else if (triageHistory().length === 0) {
                        <div class="text-center py-6">
                          <div class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                            <svg class="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </div>
                          <p class="text-sm text-slate-500 mb-1">No triage assessments yet</p>
                          <p class="text-xs text-slate-400">Run a health triage from the Triage page to see results here</p>
                        </div>
                      } @else {
                        <div class="space-y-3">
                          @for (session of triageHistory(); track session.id) {
                            <div class="bg-white rounded-xl border border-gray-100 p-4">
                              <div class="flex items-start gap-3">
                                <!-- Severity Dot -->
                                <div class="flex-shrink-0 mt-1.5">
                                  <div class="w-3 h-3 rounded-full" [class]="triageSeverityDotClass(session.severity)"></div>
                                </div>
                                <div class="flex-1 min-w-0">
                                  <!-- Header -->
                                  <div class="flex items-center gap-2 flex-wrap">
                                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                          [class]="triageSeverityBadgeClass(session.severity)">
                                      {{ session.severity }}
                                    </span>
                                    @if (session.isEmergency) {
                                      <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700">
                                        Emergency
                                      </span>
                                    }
                                    <span class="text-xs text-slate-400">{{ session.createdAt | date:'medium' }}</span>
                                  </div>

                                  <!-- Symptoms -->
                                  <p class="text-xs text-slate-500 mt-1.5">
                                    <span class="font-medium text-slate-600">Symptoms:</span> {{ session.symptoms }}
                                  </p>

                                  <!-- Assessment -->
                                  <p class="text-sm text-slate-700 mt-2 whitespace-pre-wrap leading-relaxed">{{ session.assessment }}</p>

                                  <!-- Recommendations -->
                                  @if (session.recommendations) {
                                    <div class="mt-2 p-2.5 bg-slate-50 rounded-lg">
                                      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Recommendations</p>
                                      <p class="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{{ session.recommendations }}</p>
                                    </div>
                                  }
                                </div>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <!-- Empty state -->
            <div class="flex flex-col items-center justify-center py-16 text-center">
              <div class="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-4xl mb-4">
                🐾
              </div>
              <h2 class="text-xl font-semibold text-slate-800 mb-1">You haven't added any pets yet 🐾</h2>
              <p class="text-sm text-slate-500 max-w-xs">Add your first pet below so sitters know who they'll be caring for.</p>
            </div>
          }

          <!-- Add Pet Form -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 class="text-lg font-semibold text-slate-900 mb-4">Add a New Pet</h2>

            <form (ngSubmit)="onSubmit()" #petForm="ngForm" class="space-y-4">

              <div>
                <label for="pet-name" class="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  id="pet-name"
                  type="text"
                  required
                  [(ngModel)]="name"
                  name="name"
                  placeholder="e.g., Buddy"
                  class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="pet-species" class="block text-sm font-medium text-slate-700 mb-1">Species</label>
                  <select
                    id="pet-species"
                    required
                    [(ngModel)]="species"
                    name="species"
                    class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition bg-white"
                  >
                    <option value="" disabled>Select...</option>
                    @for (s of speciesOptions; track s) {
                      <option [value]="s">{{ s }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label for="pet-age" class="block text-sm font-medium text-slate-700 mb-1">Age</label>
                  <input
                    id="pet-age"
                    type="number"
                    required
                    min="0"
                    max="100"
                    [(ngModel)]="age"
                    name="age"
                    placeholder="e.g., 3"
                    class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label for="pet-notes" class="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  id="pet-notes"
                  rows="3"
                  [(ngModel)]="notes"
                  name="notes"
                  placeholder="e.g., 15-year-old cat, needs gentle care and quiet environment..."
                  class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                [disabled]="submitting()"
                class="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {{ submitting() ? 'Adding...' : '+ Add Pet' }}
              </button>
            </form>
          </div>
        }
      </div>
    </div>
  `,
})
export class MyPetsComponent implements OnInit {
  private readonly petService = inject(PetService);
  private readonly medicalRecordService = inject(MedicalRecordService);
  private readonly triageService = inject(TeletriageService);
  private readonly toast = inject(ToastService);

  readonly speciesOptions = SPECIES_OPTIONS;
  readonly recordTypes = RECORD_TYPES;

  readonly pets = signal<Pet[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);

  // Medical records state
  readonly expandedPetId = signal<string | null>(null);
  readonly records = signal<MedicalRecord[]>([]);
  readonly recordsLoading = signal(false);
  readonly showRecordForm = signal(false);
  readonly recordSubmitting = signal(false);
  readonly editingRecordId = signal<string | null>(null);

  // Triage history state
  readonly triagePetId = signal<string | null>(null);
  readonly triageHistory = signal<TeletriageHistory[]>([]);
  readonly triageLoading = signal(false);

  // Pet form
  name = '';
  species = '';
  age: number | null = null;
  notes = '';

  // Medical record form
  recType = 'Vaccination';
  recTitle = '';
  recDescription = '';
  recDate = '';
  recDocumentUrl = '';

  ngOnInit(): void {
    this.loadPets();
  }

  loadPets(): void {
    this.loading.set(true);
    this.petService.getAll().subscribe({
      next: (pets) => {
        this.pets.set(pets);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load pets.');
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.submitting() || !this.name.trim() || !this.species || this.age == null) return;

    this.submitting.set(true);
    this.petService.create({
      name: this.name.trim(),
      species: this.species,
      age: this.age,
      notes: this.notes.trim() || null,
    }).subscribe({
      next: () => {
        this.toast.success('Pet added successfully!');
        this.resetForm();
        this.refreshPets();
        this.submitting.set(false);
      },
      error: () => {
        this.toast.error('Failed to add pet. Please try again.');
        this.submitting.set(false);
      },
    });
  }

  confirmDelete(pet: Pet): void {
    if (!confirm(`Remove ${pet.name} from your pets?`)) return;

    this.petService.delete(pet.id).subscribe({
      next: () => {
        this.pets.update((list) => list.filter((p) => p.id !== pet.id));
        if (this.expandedPetId() === pet.id) {
          this.expandedPetId.set(null);
          this.records.set([]);
        }
        if (this.triagePetId() === pet.id) {
          this.triagePetId.set(null);
          this.triageHistory.set([]);
        }
        this.toast.success(`${pet.name} removed.`);
      },
      error: () => this.toast.error('Failed to remove pet. Please try again.'),
    });
  }

  // --- Medical Records ---

  toggleHealthRecords(pet: Pet): void {
    if (this.expandedPetId() === pet.id) {
      this.expandedPetId.set(null);
      this.records.set([]);
      this.showRecordForm.set(false);
      this.editingRecordId.set(null);
      return;
    }
    this.triagePetId.set(null);
    this.triageHistory.set([]);
    this.expandedPetId.set(pet.id);
    this.showRecordForm.set(false);
    this.editingRecordId.set(null);
    this.loadRecords(pet.id);
  }

  loadRecords(petId: string): void {
    this.recordsLoading.set(true);
    this.medicalRecordService.getAll(petId).subscribe({
      next: (records) => {
        this.records.set(records);
        this.recordsLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load health records.');
        this.recordsLoading.set(false);
      },
    });
  }

  openAddRecordForm(): void {
    this.editingRecordId.set(null);
    this.resetRecordForm();
    this.showRecordForm.set(true);
  }

  editRecord(rec: MedicalRecord): void {
    this.editingRecordId.set(rec.id);
    this.recType = rec.type;
    this.recTitle = rec.title;
    this.recDescription = rec.description ?? '';
    this.recDate = rec.date.substring(0, 10);
    this.recDocumentUrl = rec.documentUrl ?? '';
    this.showRecordForm.set(true);
  }

  cancelRecordForm(): void {
    this.showRecordForm.set(false);
    this.editingRecordId.set(null);
    this.resetRecordForm();
  }

  submitRecord(): void {
    const petId = this.expandedPetId();
    if (!petId || this.recordSubmitting() || !this.recTitle.trim() || !this.recDate) return;

    this.recordSubmitting.set(true);
    const payload = {
      type: this.recType,
      title: this.recTitle.trim(),
      description: this.recDescription.trim() || null,
      date: new Date(this.recDate).toISOString(),
      documentUrl: this.recDocumentUrl.trim() || null,
    };

    const editId = this.editingRecordId();
    const request$ = editId
      ? this.medicalRecordService.update(petId, editId, payload)
      : this.medicalRecordService.create(petId, payload);

    request$.subscribe({
      next: () => {
        this.toast.success(editId ? 'Record updated.' : 'Record added.');
        this.showRecordForm.set(false);
        this.editingRecordId.set(null);
        this.resetRecordForm();
        this.loadRecords(petId);
        this.recordSubmitting.set(false);
      },
      error: () => {
        this.toast.error('Failed to save record. Please try again.');
        this.recordSubmitting.set(false);
      },
    });
  }

  confirmDeleteRecord(rec: MedicalRecord): void {
    if (!confirm(`Delete "${rec.title}"?`)) return;
    const petId = this.expandedPetId();
    if (!petId) return;

    this.medicalRecordService.delete(petId, rec.id).subscribe({
      next: () => {
        this.records.update((list) => list.filter((r) => r.id !== rec.id));
        this.toast.success('Record deleted.');
      },
      error: () => this.toast.error('Failed to delete record.'),
    });
  }

  // --- Triage History ---

  toggleTriageHistory(pet: Pet): void {
    if (this.triagePetId() === pet.id) {
      this.triagePetId.set(null);
      this.triageHistory.set([]);
      return;
    }
    this.expandedPetId.set(null);
    this.records.set([]);
    this.showRecordForm.set(false);
    this.editingRecordId.set(null);
    this.triagePetId.set(pet.id);
    this.loadTriageHistory(pet.id);
  }

  private loadTriageHistory(petId: string): void {
    this.triageLoading.set(true);
    this.triageService.getHistory(petId).subscribe({
      next: (items) => {
        this.triageHistory.set(items);
        this.triageLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load triage history.');
        this.triageLoading.set(false);
      },
    });
  }

  triageSeverityDotClass(severity: string): string {
    switch (severity) {
      case 'Low': return 'bg-green-500';
      case 'Medium': return 'bg-yellow-500';
      case 'High': return 'bg-orange-500';
      case 'Critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  triageSeverityBadgeClass(severity: string): string {
    switch (severity) {
      case 'Low': return 'bg-green-100 text-green-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  recordTypeIcon(type: string): string {
    switch (type) {
      case 'Vaccination': return '💉';
      case 'Condition':   return '🩺';
      case 'Medication':  return '💊';
      case 'VetVisit':    return '🏥';
      default:            return '📋';
    }
  }

  recordTypeClass(type: string): string {
    switch (type) {
      case 'Vaccination': return 'bg-green-100';
      case 'Condition':   return 'bg-orange-100';
      case 'Medication':  return 'bg-blue-100';
      case 'VetVisit':    return 'bg-purple-100';
      default:            return 'bg-slate-100';
    }
  }

  recordTypeBadgeClass(type: string): string {
    switch (type) {
      case 'Vaccination': return 'bg-green-100 text-green-700';
      case 'Condition':   return 'bg-orange-100 text-orange-700';
      case 'Medication':  return 'bg-blue-100 text-blue-700';
      case 'VetVisit':    return 'bg-purple-100 text-purple-700';
      default:            return 'bg-slate-100 text-slate-700';
    }
  }

  speciesEmoji(species: string): string {
    switch (species) {
      case 'Dog': return '🐶';
      case 'Cat': return '🐱';
      default:    return '🐾';
    }
  }

  speciesIconClass(species: string): string {
    switch (species) {
      case 'Dog': return 'bg-amber-100';
      case 'Cat': return 'bg-violet-100';
      default:    return 'bg-emerald-100';
    }
  }

  private refreshPets(): void {
    this.petService.getAll().subscribe({
      next: (pets) => this.pets.set(pets),
    });
  }

  private resetForm(): void {
    this.name = '';
    this.species = '';
    this.age = null;
    this.notes = '';
  }

  private resetRecordForm(): void {
    this.recType = 'Vaccination';
    this.recTitle = '';
    this.recDescription = '';
    this.recDate = '';
    this.recDocumentUrl = '';
  }
}
