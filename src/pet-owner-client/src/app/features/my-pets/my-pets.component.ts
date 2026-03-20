import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Pet, PetService } from '../../services/pet.service';
import { MedicalRecord, MedicalRecordService } from '../../services/medical-record.service';
import { TeletriageService, TeletriageHistory } from '../../services/teletriage.service';
import { ToastService } from '../../services/toast.service';

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Other'] as const;
const BREED_OPTIONS = [
  'Mixed / Mutt',
  'Golden Retriever',
  'Labrador',
  'French Bulldog',
  'Poodle',
  'German Shepherd',
  'Other',
] as const;
const RECORD_TYPES = ['Vaccination', 'Condition', 'Medication', 'VetVisit'] as const;

@Component({
  selector: 'app-my-pets',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
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
                    <!-- Action buttons -->
                    <div class="absolute top-3 right-3 flex items-center gap-0.5">
                      <button
                        type="button"
                        (click)="editPet(pet)"
                        class="p-1.5 rounded-lg text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors duration-150"
                        title="Edit pet"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        (click)="confirmDelete(pet)"
                        class="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
                        title="Remove pet"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl"
                           [class]="speciesIconClass(pet.species)">
                        {{ speciesEmoji(pet.species) }}
                      </div>
                      <div class="min-w-0 flex-1 pr-16">
                        <h3 class="text-lg font-semibold text-slate-900 truncate">{{ pet.name }}</h3>
                        <p class="text-xs text-slate-500">
                          {{ pet.species }}@if (pet.breed) {<span> · {{ pet.breed }}</span>} · {{ pet.age }} {{ pet.age === 1 ? 'year' : 'years' }} old@if (pet.weight) {<span> · {{ pet.weight }} kg</span>}
                        </p>
                      </div>
                    </div>

                    @if (pet.notes) {
                      <p class="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">{{ pet.notes }}</p>
                    }

                    @if (pet.allergies || pet.medicalConditions) {
                      <div class="mt-2.5 flex flex-wrap gap-1.5">
                        @if (pet.allergies) {
                          <span class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-700">
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {{ pet.allergies }}
                          </span>
                        }
                        @if (pet.medicalConditions) {
                          <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {{ pet.medicalConditions }}
                          </span>
                        }
                      </div>
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

                  <!-- ─── Expanded Health Records Panel ─── -->
                  @if (expandedPetId() === pet.id) {
                    <div class="border-t border-gray-100 bg-slate-50/70 p-5">

                      @if (recordsLoading()) {
                        <div class="flex items-center justify-center py-6 text-slate-400">
                          <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          <span class="text-sm">Loading records...</span>
                        </div>
                      } @else {

                        <!-- ─── Medical Timeline ─── -->
                        @if (records().length > 0) {
                          <div class="mb-4">
                            <h4 class="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-5">Medical Timeline</h4>

                            <div class="relative pl-9">
                              <!-- Vertical line -->
                              <div class="absolute left-[11px] top-1 bottom-1 w-px bg-gradient-to-b from-indigo-300 via-slate-200 to-transparent"></div>

                              <div class="space-y-5">
                                @for (rec of records(); track rec.id) {
                                  <div class="relative group">
                                    <!-- Timeline dot -->
                                    <div class="absolute -left-9 top-3.5 z-10 flex items-center justify-center w-[22px] h-[22px] rounded-full ring-[3px] ring-slate-50 text-[11px] shadow-sm"
                                         [class]="recordTypeClass(rec.type)">
                                      {{ recordTypeIcon(rec.type) }}
                                    </div>

                                    <!-- Card -->
                                    <div class="bg-white rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md group-hover:border-indigo-100 transition-all duration-200 overflow-hidden">
                                      <div class="h-0.5" [class]="recordTypeAccentClass(rec.type)"></div>

                                      <div class="p-4">
                                        <div class="flex items-start justify-between gap-2">
                                          <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-2 flex-wrap">
                                              <h5 class="text-sm font-semibold text-slate-900">{{ rec.title }}</h5>
                                              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                                                    [class]="recordTypeBadgeClass(rec.type)">
                                                {{ rec.type === 'VetVisit' ? 'Vet Visit' : rec.type }}
                                              </span>
                                            </div>

                                            <p class="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                              </svg>
                                              {{ rec.date | date:'mediumDate' }}
                                            </p>

                                            @if (rec.description) {
                                              <p class="text-sm text-slate-600 mt-2 leading-relaxed">{{ rec.description }}</p>
                                            }

                                            @if (rec.documentUrl) {
                                              <a [href]="rec.documentUrl" target="_blank" rel="noopener"
                                                 class="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-xs text-indigo-600 hover:bg-indigo-100 font-medium transition-colors">
                                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                                                </svg>
                                                View Document
                                              </a>
                                            }
                                          </div>

                                          <div class="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
                                    </div>
                                  </div>
                                }
                              </div>
                            </div>
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
                            <form [formGroup]="recordForm" (ngSubmit)="submitRecord()" class="space-y-3">
                              <div class="grid grid-cols-2 gap-3">
                                <div>
                                  <label class="block text-xs font-medium text-slate-600 mb-1">Type</label>
                                  <select formControlName="type"
                                          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition">
                                    @for (t of recordTypes; track t) {
                                      <option [value]="t">{{ t === 'VetVisit' ? 'Vet Visit' : t }}</option>
                                    }
                                  </select>
                                </div>
                                <div>
                                  <label class="block text-xs font-medium text-slate-600 mb-1">Date</label>
                                  <input type="date" formControlName="date"
                                         class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
                                </div>
                              </div>
                              <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">Title</label>
                                <input type="text" formControlName="title" placeholder="e.g., Rabies vaccine"
                                       class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
                              </div>
                              <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
                                <textarea formControlName="description" rows="2" placeholder="Additional details..."
                                          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none"></textarea>
                              </div>
                              <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">Document URL (optional)</label>
                                <input type="url" formControlName="documentUrl" placeholder="https://..."
                                       class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
                              </div>
                              <div class="flex gap-2">
                                <button type="submit" [disabled]="recordSubmitting() || recordForm.invalid"
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

                  <!-- ─── Expanded Triage History Panel ─── -->
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
                                <div class="flex-shrink-0 mt-1.5">
                                  <div class="w-3 h-3 rounded-full" [class]="triageSeverityDotClass(session.severity)"></div>
                                </div>
                                <div class="flex-1 min-w-0">
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
                                  <p class="text-xs text-slate-500 mt-1.5">
                                    <span class="font-medium text-slate-600">Symptoms:</span> {{ session.symptoms }}
                                  </p>
                                  <p class="text-sm text-slate-700 mt-2 whitespace-pre-wrap leading-relaxed">{{ session.assessment }}</p>
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
              <p class="text-sm text-slate-500 max-w-xs">Add your first pet below so providers know who they'll be caring for.</p>
            </div>
          }

          <!-- ─── Add / Edit Pet Form ─── -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 class="text-lg font-semibold text-slate-900 mb-4">
              {{ editingPetId() ? 'Edit Pet' : 'Add a New Pet' }}
            </h2>

            <form [formGroup]="petForm" (ngSubmit)="onSubmit()" class="space-y-4">

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="pet-name" class="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    id="pet-name"
                    type="text"
                    formControlName="name"
                    placeholder="e.g., Buddy"
                    class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>

                <div>
                  <label for="pet-species" class="block text-sm font-medium text-slate-700 mb-1">Species</label>
                  <select
                    id="pet-species"
                    formControlName="species"
                    class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition bg-white"
                  >
                    <option value="" disabled>Select...</option>
                    @for (s of speciesOptions; track s) {
                      <option [value]="s">{{ s }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label for="pet-breed" class="block text-sm font-medium text-slate-700 mb-1">Breed</label>
                  <select
                    id="pet-breed"
                    formControlName="breed"
                    class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition bg-white"
                  >
                    <option value="">Optional — select breed</option>
                    @for (b of breedOptions; track b) {
                      <option [value]="b">{{ b }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label for="pet-age" class="block text-sm font-medium text-slate-700 mb-1">Age</label>
                  <input
                    id="pet-age"
                    type="number"
                    min="0"
                    max="100"
                    formControlName="age"
                    placeholder="e.g., 3"
                    class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>

                <div>
                  <label for="pet-weight" class="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
                  <input
                    id="pet-weight"
                    type="number"
                    min="0"
                    step="0.1"
                    formControlName="weight"
                    placeholder="e.g., 12.5"
                    class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label for="pet-notes" class="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  id="pet-notes"
                  rows="2"
                  formControlName="notes"
                  placeholder="e.g., 15-year-old cat, needs gentle care and quiet environment..."
                  class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none"
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="pet-allergies" class="block text-sm font-medium text-slate-700 mb-1">Allergies</label>
                  <input
                    id="pet-allergies"
                    type="text"
                    formControlName="allergies"
                    placeholder="e.g., Chicken, Pollen"
                    class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>

                <div>
                  <label for="pet-conditions" class="block text-sm font-medium text-slate-700 mb-1">Medical Conditions</label>
                  <input
                    id="pet-conditions"
                    type="text"
                    formControlName="medicalConditions"
                    placeholder="e.g., Hip dysplasia"
                    class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
              </div>

              <div class="flex gap-2">
                <button
                  type="submit"
                  [disabled]="submitting() || petForm.invalid"
                  class="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {{ submitting() ? 'Saving...' : (editingPetId() ? 'Update Pet' : '+ Add Pet') }}
                </button>
                @if (editingPetId()) {
                  <button
                    type="button"
                    (click)="cancelPetEdit()"
                    class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                }
              </div>
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
  private readonly fb = inject(FormBuilder);

  readonly speciesOptions = SPECIES_OPTIONS;
  readonly breedOptions = BREED_OPTIONS;
  readonly recordTypes = RECORD_TYPES;

  readonly pets = signal<Pet[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);

  readonly expandedPetId = signal<string | null>(null);
  readonly records = signal<MedicalRecord[]>([]);
  readonly recordsLoading = signal(false);
  readonly showRecordForm = signal(false);
  readonly recordSubmitting = signal(false);
  readonly editingRecordId = signal<string | null>(null);

  readonly editingPetId = signal<string | null>(null);

  readonly triagePetId = signal<string | null>(null);
  readonly triageHistory = signal<TeletriageHistory[]>([]);
  readonly triageLoading = signal(false);

  readonly petForm = this.fb.group({
    name: ['', Validators.required],
    species: ['', Validators.required],
    breed: [''],
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    weight: [null as number | null, [Validators.min(0)]],
    notes: [''],
    allergies: [''],
    medicalConditions: [''],
  });

  readonly recordForm = this.fb.group({
    type: ['Vaccination', Validators.required],
    title: ['', Validators.required],
    description: [''],
    date: ['', Validators.required],
    documentUrl: [''],
  });

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

  // ── Pet CRUD ──

  onSubmit(): void {
    if (this.submitting() || this.petForm.invalid) return;

    this.submitting.set(true);
    const v = this.petForm.getRawValue();
    const payload = {
      name: v.name!.trim(),
      species: v.species!,
      age: v.age!,
      notes: v.notes?.trim() || null,
      breed: v.breed?.trim() || undefined,
      weight: v.weight ?? undefined,
      allergies: v.allergies?.trim() || undefined,
      medicalConditions: v.medicalConditions?.trim() || undefined,
    };

    const editId = this.editingPetId();
    const request$ = editId
      ? this.petService.update(editId, payload)
      : this.petService.create(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(editId ? 'Pet updated!' : 'Pet added successfully!');
        this.editingPetId.set(null);
        this.petForm.reset();
        this.refreshPets();
        this.submitting.set(false);
      },
      error: () => {
        this.toast.error(editId ? 'Failed to update pet.' : 'Failed to add pet. Please try again.');
        this.submitting.set(false);
      },
    });
  }

  editPet(pet: Pet): void {
    this.editingPetId.set(pet.id);
    this.petForm.patchValue({
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? '',
      age: pet.age,
      weight: pet.weight ?? null,
      notes: pet.notes ?? '',
      allergies: pet.allergies ?? '',
      medicalConditions: pet.medicalConditions ?? '',
    });
  }

  cancelPetEdit(): void {
    this.editingPetId.set(null);
    this.petForm.reset();
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
        if (this.editingPetId() === pet.id) {
          this.editingPetId.set(null);
          this.petForm.reset();
        }
        this.toast.success(`${pet.name} removed.`);
      },
      error: () => this.toast.error('Failed to remove pet. Please try again.'),
    });
  }

  // ── Medical Records ──

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
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    this.recordForm.reset({ type: 'Vaccination', title: '', description: '', date: '', documentUrl: '' });
    this.showRecordForm.set(true);
  }

  editRecord(rec: MedicalRecord): void {
    this.editingRecordId.set(rec.id);
    this.recordForm.patchValue({
      type: rec.type,
      title: rec.title,
      description: rec.description ?? '',
      date: rec.date.substring(0, 10),
      documentUrl: rec.documentUrl ?? '',
    });
    this.showRecordForm.set(true);
  }

  cancelRecordForm(): void {
    this.showRecordForm.set(false);
    this.editingRecordId.set(null);
    this.recordForm.reset({ type: 'Vaccination', title: '', description: '', date: '', documentUrl: '' });
  }

  submitRecord(): void {
    const petId = this.expandedPetId();
    if (!petId || this.recordSubmitting() || this.recordForm.invalid) return;

    this.recordSubmitting.set(true);
    const v = this.recordForm.getRawValue();
    const payload = {
      type: v.type!,
      title: v.title!.trim(),
      description: v.description?.trim() || null,
      date: new Date(v.date!).toISOString(),
      documentUrl: v.documentUrl?.trim() || null,
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
        this.recordForm.reset({ type: 'Vaccination', title: '', description: '', date: '', documentUrl: '' });
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

  // ── Triage History ──

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

  // ── UI helpers ──

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

  recordTypeAccentClass(type: string): string {
    switch (type) {
      case 'Vaccination': return 'bg-green-400';
      case 'Condition':   return 'bg-orange-400';
      case 'Medication':  return 'bg-blue-400';
      case 'VetVisit':    return 'bg-purple-400';
      default:            return 'bg-slate-300';
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
}
