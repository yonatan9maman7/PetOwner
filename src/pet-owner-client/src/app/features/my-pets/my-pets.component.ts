import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Pet, PetService } from '../../services/pet.service';
import { MedicalRecord, MedicalRecordService } from '../../services/medical-record.service';
import { TeletriageService, TeletriageHistory } from '../../services/teletriage.service';
import { ToastService } from '../../services/toast.service';
import {
  PET_SPECIES_OPTIONS,
  PetSpecies,
  normalizePetSpecies,
  petSpeciesEmoji,
  petSpeciesIconBgClass,
} from '../../models/pet-species.model';

const BREED_OPTIONS = [
  'Mixed / Mutt',
  'Golden Retriever',
  'Labrador Retriever',
  'French Bulldog',
  'German Shepherd',
  'Persian',
  'Poodle',
  'Beagle',
  'Maine Coon',
  'Parakeet',
  'Other',
] as const;

const ALLERGY_OPTIONS = ['None', 'Chicken', 'Beef', 'Grains', 'Fleas', 'Other'] as const;
const RECORD_TYPES = ['Vaccination', 'Condition', 'Medication', 'VetVisit'] as const;

@Component({
  selector: 'app-my-pets',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, TranslatePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-4 py-8">
      <div class="max-w-2xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-slate-900">{{ 'PROFILE.MY_PETS' | translate }}</h1>
          <p class="mt-1 text-sm text-slate-500">{{ 'PROFILE.MY_PETS_SUBTITLE' | translate }}</p>
        </div>

        <!-- Loading State -->
        @if (loading()) {
          <div class="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg class="w-8 h-8 animate-spin mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <p class="text-sm">{{ 'PROFILE.LOADING_PETS' | translate }}</p>
          </div>
        } @else {

          <!-- Pet Grid -->
          @if (pets().length > 0) {
            <div class="space-y-4 mb-8">
              @for (pet of pets(); track pet.id) {
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div class="relative p-5">
                    <!-- Action buttons -->
                    <div class="absolute top-3 end-3 flex items-center gap-0.5">
                      <button
                        type="button"
                        (click)="editPet(pet)"
                        class="p-1.5 rounded-lg text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors duration-150"
                        [attr.title]="'PROFILE.EDIT_PET_ARIA' | translate"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        (click)="confirmDelete(pet)"
                        class="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
                        [attr.title]="'PROFILE.REMOVE_PET_ARIA' | translate"
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
                      <div class="min-w-0 flex-1 pe-16">
                        <h3 class="text-lg font-semibold text-slate-900 truncate">{{ pet.name }}</h3>
                        <p class="text-xs text-slate-500">
                          {{ speciesI18nKey(pet.species) | translate }}@if (pet.breed) {<span> · {{ pet.breed }}</span>} · @if (pet.age === 1) {<span>{{ 'PETS.ONE_YEAR_OLD' | translate }}</span>} @else {<span>{{ 'PETS.N_YEARS_OLD' | translate: { years: pet.age } }}</span>}@if (pet.weight) {<span> · {{ pet.weight }} {{ 'PETS.KG' | translate }}</span>}@if (pet.isNeutered) {<span> · {{ 'PETS.NEUTERED_SHORT' | translate }}</span>}
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

                    <!-- Medical Card / Health Records / Triage History Toggles -->
                    <div class="mt-3 flex items-center gap-4 flex-wrap">
                      <button
                        type="button"
                        (click)="toggleMedicalCard(pet)"
                        class="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
                        [class]="medicalCardPetId() === pet.id ? 'text-teal-600' : 'text-slate-400 hover:text-teal-500'"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        {{ 'PETS.MEDICAL_CARD_TITLE' | translate }}
                        <svg class="w-3.5 h-3.5 transition-transform duration-200" [class.rotate-180]="medicalCardPetId() === pet.id" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
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

                  <!-- ─── Expanded Medical Card Panel ─── -->
                  @if (medicalCardPetId() === pet.id) {
                    <div class="border-t border-gray-100 bg-gradient-to-br from-teal-50/60 to-cyan-50/40 p-5">
                      @if (hasMedicalInfo(pet)) {
                        <div class="space-y-4">
                          <div class="flex items-center gap-2 mb-1">
                            <div class="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                              <svg class="w-4.5 h-4.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </div>
                            <div>
                              <h4 class="text-sm font-semibold text-slate-900">{{ 'PETS.MEDICAL_CARD_TITLE' | translate }}</h4>
                              <p class="text-[11px] text-slate-500">{{ 'PETS.MEDICAL_CARD_SUBTITLE' | translate }}</p>
                            </div>
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            @if (pet.medicalNotes) {
                              <div class="sm:col-span-2 bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
                                <div class="flex items-center gap-2 mb-1.5">
                                  <svg class="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <span class="text-xs font-semibold text-slate-700">{{ 'PETS.MEDICAL_NOTES' | translate }}</span>
                                </div>
                                <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap" dir="auto">{{ pet.medicalNotes }}</p>
                              </div>
                            }
                            @if (pet.feedingSchedule) {
                              <div class="sm:col-span-2 bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
                                <div class="flex items-center gap-2 mb-1.5">
                                  <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span class="text-xs font-semibold text-slate-700">{{ 'PETS.FEEDING_SCHEDULE' | translate }}</span>
                                </div>
                                <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap" dir="auto">{{ pet.feedingSchedule }}</p>
                              </div>
                            }
                            @if (pet.microchipNumber) {
                              <div class="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
                                <div class="flex items-center gap-2 mb-1.5">
                                  <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                  </svg>
                                  <span class="text-xs font-semibold text-slate-700">{{ 'PETS.MICROCHIP' | translate }}</span>
                                </div>
                                <p class="text-sm text-slate-800 font-mono tracking-wide" dir="auto">{{ pet.microchipNumber }}</p>
                              </div>
                            }
                            @if (pet.isNeutered) {
                              <div class="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
                                <div class="flex items-center gap-2">
                                  <svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span class="text-sm font-medium text-slate-700">{{ 'PETS.SPAYED' | translate }}</span>
                                </div>
                              </div>
                            }
                            @if (pet.vetName || pet.vetPhone) {
                              <div class="sm:col-span-2 bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
                                <div class="flex items-center gap-2 mb-1.5">
                                  <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span class="text-xs font-semibold text-slate-700">{{ 'PETS.VET_DETAILS' | translate }}</span>
                                </div>
                                <div class="flex items-center gap-4 text-sm text-slate-700">
                                  @if (pet.vetName) {
                                    <span dir="auto">{{ pet.vetName }}</span>
                                  }
                                  @if (pet.vetPhone) {
                                    <a [href]="'tel:' + pet.vetPhone" class="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium">
                                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                      </svg>
                                      {{ pet.vetPhone }}
                                    </a>
                                  }
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      } @else {
                        <div class="text-center py-6">
                          <div class="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-xl mx-auto mb-2">
                            <svg class="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <p class="text-sm text-slate-500 mb-1">{{ 'PETS.NO_MEDICAL_INFO' | translate }}</p>
                          <button type="button" (click)="editPet(pet); scrollToAddPetForm()"
                                  class="mt-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
                            {{ 'PROFILE.EDIT_PET' | translate }}
                          </button>
                        </div>
                      }
                    </div>
                  }

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
                                  <label class="block text-start text-xs font-medium text-slate-600 mb-1">Type</label>
                                  <select formControlName="type" dir="auto"
                                          class="w-full text-start rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition">
                                    @for (t of recordTypes; track t) {
                                      <option [value]="t">{{ t === 'VetVisit' ? 'Vet Visit' : t }}</option>
                                    }
                                  </select>
                                </div>
                                <div>
                                  <label class="block text-start text-xs font-medium text-slate-600 mb-1">Date</label>
                                  <input type="date" formControlName="date" dir="auto"
                                         class="w-full text-start rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
                                </div>
                              </div>
                              <div>
                                <label class="block text-start text-xs font-medium text-slate-600 mb-1">Title</label>
                                <input type="text" formControlName="title" dir="auto" placeholder="e.g., Rabies vaccine"
                                       class="w-full text-start placeholder:text-start rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
                              </div>
                              <div>
                                <label class="block text-start text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
                                <textarea formControlName="description" rows="2" dir="auto" placeholder="Additional details..."
                                          class="w-full text-start placeholder:text-start rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none"></textarea>
                              </div>
                              <div>
                                <label class="block text-start text-xs font-medium text-slate-600 mb-1">Document URL (optional)</label>
                                <input type="url" formControlName="documentUrl" dir="auto" placeholder="https://..."
                                       class="w-full text-start placeholder:text-start rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
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
            <div class="flex flex-col items-center justify-center p-8 text-center mb-6 rounded-2xl border border-gray-100 bg-white/80 shadow-sm">
              <div class="mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-gray-100" aria-hidden="true">
                <svg class="h-16 w-16 text-gray-300" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M44 58c-14 0-26 9-26 16 0 5 22 8 26 8s26-3 26-8c0-7-12-16-26-16z" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                  <ellipse cx="44" cy="56" rx="22" ry="13" stroke="currentColor" stroke-width="1.5"/>
                  <circle cx="32" cy="48" r="11" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M22 44c-1.5-7 3.5-14 11-11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M28 49h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.65"/>
                  <path d="M58 40l8-11M66 32l7-9" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" opacity="0.45"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold tracking-tight text-gray-900">{{ 'PROFILE.NO_PETS_TITLE' | translate }}</h3>
              <p class="mt-2 max-w-sm text-sm text-gray-500 leading-relaxed">
                {{ 'PROFILE.NO_PETS_DESCRIPTION' | translate }}
              </p>
              <button
                type="button"
                (click)="scrollToAddPetForm()"
                class="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
              >
                {{ 'PROFILE.ADD_PET' | translate }}
              </button>
            </div>
          }

          <!-- ─── Add / Edit Pet Form ─── -->
          <div id="add-pet-form" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 scroll-mt-24">
            <h2 class="text-lg font-semibold text-slate-900 mb-4">
              {{ (editingPetId() ? 'PETS.EDIT_PET' : 'PETS.ADD_NEW_PET') | translate }}
            </h2>

            <form [formGroup]="petForm" (ngSubmit)="onSubmit()" class="space-y-4">

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="pet-name" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.NAME' | translate }}</span></label>
                  <input
                    id="pet-name"
                    type="text"
                    formControlName="name"
                    dir="auto"
                    [attr.placeholder]="'PETS.PLACEHOLDER_NAME' | translate"
                    class="w-full text-start placeholder:text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>

                <div>
                  <label for="pet-species" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.SPECIES' | translate }}</span></label>
                  <select
                    id="pet-species"
                    formControlName="species"
                    dir="auto"
                    class="w-full text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition bg-white"
                  >
                    <option [ngValue]="null" disabled>{{ 'PETS.SELECT_SPECIES' | translate }}</option>
                    @for (opt of petSpeciesOptions; track opt.value) {
                      <option [ngValue]="opt.value">{{ speciesI18nKey(opt.value) | translate }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label for="pet-breed" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.BREED' | translate }}</span></label>
                  <select
                    id="pet-breed"
                    formControlName="breed"
                    dir="auto"
                    class="w-full text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition bg-white"
                  >
                    <option value="">{{ 'PETS.BREED_OPTIONAL' | translate }}</option>
                    @for (b of breedOptions; track b) {
                      <option [value]="b">{{ b }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label for="pet-age" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.AGE' | translate }}</span></label>
                  <input
                    id="pet-age"
                    type="number"
                    min="0"
                    max="100"
                    formControlName="age"
                    dir="auto"
                    [attr.placeholder]="'PETS.PLACEHOLDER_AGE' | translate"
                    class="w-full text-start placeholder:text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>

                <div>
                  <label for="pet-weight" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.WEIGHT' | translate }}</span></label>
                  <input
                    id="pet-weight"
                    type="number"
                    min="0"
                    step="0.1"
                    formControlName="weight"
                    dir="auto"
                    [attr.placeholder]="'PETS.PLACEHOLDER_WEIGHT' | translate"
                    class="w-full text-start placeholder:text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
              </div>

              <div class="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-indigo-50/30 px-4 py-3.5 shadow-sm">
                <div class="min-w-0 text-start">
                  <span class="block text-sm font-semibold text-slate-800 tracking-tight" dir="auto">{{ 'PETS.NEUTERED_QUESTION' | translate }}</span>
                  <p class="text-xs text-slate-500 mt-0.5" dir="auto">{{ 'PETS.NEUTERED_HELP' | translate }}</p>
                </div>
                <label for="pet-neutered" class="group inline-flex cursor-pointer flex-shrink-0 items-center rounded-full focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-300 focus-within:ring-offset-2">
                  <input
                    id="pet-neutered"
                    type="checkbox"
                    formControlName="isNeutered"
                    class="peer sr-only"
                  />
                  <span
                    class="relative h-7 w-12 shrink-0 rounded-full bg-slate-300/90 ring-1 ring-slate-200/80 transition-all duration-200 after:absolute after:top-[3px] after:block after:h-[22px] after:w-[22px] after:rounded-full after:bg-white after:shadow-md after:ring-1 after:ring-black/5 after:transition-transform after:duration-200 after:content-[''] after:[inset-inline-start:3px] peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-violet-600 peer-checked:ring-indigo-500/30 ltr:peer-checked:after:translate-x-[1.35rem] rtl:peer-checked:after:-translate-x-[1.35rem]"
                  ></span>
                </label>
              </div>

              <div>
                <label for="pet-notes" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.NOTES' | translate }}</span></label>
                <textarea
                  id="pet-notes"
                  rows="2"
                  formControlName="notes"
                  dir="auto"
                  [attr.placeholder]="'PETS.PLACEHOLDER_NOTES' | translate"
                  class="w-full text-start placeholder:text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none"
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="sm:col-span-2">
                  <span class="block text-start text-sm font-medium text-slate-700 mb-2" dir="auto">{{ 'PETS.ALLERGIES' | translate }}</span>
                  <p class="text-xs text-start text-slate-500 mb-2" dir="auto">{{ 'PETS.ALLERGIES_HELP' | translate }}</p>
                  <div class="flex flex-wrap gap-2">
                    @for (a of allergyOptions; track a) {
                      <button
                        type="button"
                        (click)="toggleAllergyChip(a)"
                        [class]="allergyChipClass(a)"
                      >
                        {{ allergyLabelKey(a) | translate }}
                      </button>
                    }
                  </div>
                </div>

                <div class="sm:col-span-2">
                  <label for="pet-conditions" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.MEDICAL_CONDITIONS' | translate }}</span></label>
                  <input
                    id="pet-conditions"
                    type="text"
                    formControlName="medicalConditions"
                    dir="auto"
                    [attr.placeholder]="'PETS.PLACEHOLDER_MEDICAL' | translate"
                    class="w-full text-start placeholder:text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
              </div>

              <!-- ─── Care & Medical Details (Collapsible) ─── -->
              <div class="rounded-xl border border-teal-200/60 bg-gradient-to-r from-teal-50/40 to-cyan-50/30 overflow-hidden">
                <button
                  type="button"
                  (click)="showMedicalSection.set(!showMedicalSection())"
                  class="w-full flex items-center justify-between px-4 py-3.5 text-start hover:bg-teal-50/60 transition-colors duration-150"
                >
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <span class="text-sm font-semibold text-slate-800" dir="auto">{{ 'PETS.MEDICAL_INFO' | translate }}</span>
                  </div>
                  <svg class="w-4 h-4 text-slate-400 transition-transform duration-200" [class.rotate-180]="showMedicalSection()" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                @if (showMedicalSection()) {
                  <div class="px-4 pb-4 space-y-4 border-t border-teal-100/80">
                    <div class="pt-3">
                      <label for="pet-medical-notes" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.MEDICAL_NOTES' | translate }}</span></label>
                      <textarea
                        id="pet-medical-notes"
                        rows="2"
                        formControlName="medicalNotes"
                        dir="auto"
                        [attr.placeholder]="'PETS.PLACEHOLDER_MEDICAL_NOTES' | translate"
                        class="w-full text-start placeholder:text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition resize-none"
                      ></textarea>
                    </div>

                    <div>
                      <label for="pet-feeding" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.FEEDING_SCHEDULE' | translate }}</span></label>
                      <textarea
                        id="pet-feeding"
                        rows="2"
                        formControlName="feedingSchedule"
                        dir="auto"
                        [attr.placeholder]="'PETS.PLACEHOLDER_FEEDING' | translate"
                        class="w-full text-start placeholder:text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition resize-none"
                      ></textarea>
                    </div>

                    <div>
                      <label for="pet-microchip" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.MICROCHIP' | translate }}</span></label>
                      <input
                        id="pet-microchip"
                        type="text"
                        formControlName="microchipNumber"
                        dir="auto"
                        [attr.placeholder]="'PETS.PLACEHOLDER_MICROCHIP' | translate"
                        class="w-full text-start placeholder:text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label for="pet-vet-name" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.VET_NAME' | translate }}</span></label>
                        <input
                          id="pet-vet-name"
                          type="text"
                          formControlName="vetName"
                          dir="auto"
                          [attr.placeholder]="'PETS.PLACEHOLDER_VET_NAME' | translate"
                          class="w-full text-start placeholder:text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                        />
                      </div>
                      <div>
                        <label for="pet-vet-phone" class="block text-start text-sm font-medium text-slate-700 mb-1"><span dir="auto">{{ 'PETS.VET_PHONE' | translate }}</span></label>
                        <input
                          id="pet-vet-phone"
                          type="tel"
                          formControlName="vetPhone"
                          dir="auto"
                          [attr.placeholder]="'PETS.PLACEHOLDER_VET_PHONE' | translate"
                          class="w-full text-start placeholder:text-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                }
              </div>

              <div class="flex gap-2">
                <button
                  type="submit"
                  [disabled]="submitting() || petForm.invalid"
                  class="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {{ submitting() ? ('PROFILE.SAVING' | translate) : ('PETS.SAVE_PET' | translate) }}
                </button>
                @if (editingPetId()) {
                  <button
                    type="button"
                    (click)="cancelPetEdit()"
                    class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    {{ 'PETS.CANCEL' | translate }}
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

  readonly petSpeciesOptions = PET_SPECIES_OPTIONS;
  readonly breedOptions = BREED_OPTIONS;
  readonly allergyOptions = ALLERGY_OPTIONS;
  readonly recordTypes = RECORD_TYPES;

  readonly speciesEmoji = petSpeciesEmoji;
  readonly speciesIconClass = petSpeciesIconBgClass;

  private readonly allergyI18nKeys: Record<string, string> = {
    None: 'PETS.ALLERGY_NONE',
    Chicken: 'PETS.ALLERGY_CHICKEN',
    Beef: 'PETS.ALLERGY_BEEF',
    Grains: 'PETS.ALLERGY_GRAINS',
    Fleas: 'PETS.ALLERGY_FLEAS',
    Other: 'PETS.ALLERGY_OTHER',
  };

  allergyLabelKey(key: string): string {
    return this.allergyI18nKeys[key] ?? key;
  }

  speciesI18nKey(species: PetSpecies | number | string | null | undefined): string {
    const n = normalizePetSpecies(species);
    const map: Record<PetSpecies, string> = {
      [PetSpecies.Dog]: 'PETS.SPECIES_DOG',
      [PetSpecies.Cat]: 'PETS.SPECIES_CAT',
      [PetSpecies.Bird]: 'PETS.SPECIES_BIRD',
      [PetSpecies.Rabbit]: 'PETS.SPECIES_RABBIT',
      [PetSpecies.Reptile]: 'PETS.SPECIES_REPTILE',
      [PetSpecies.Other]: 'PETS.SPECIES_OTHER',
    };
    return map[n];
  }

  private readonly selectedAllergies = signal<Set<string>>(new Set(['None']));

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

  readonly medicalCardPetId = signal<string | null>(null);

  readonly triagePetId = signal<string | null>(null);
  readonly triageHistory = signal<TeletriageHistory[]>([]);
  readonly triageLoading = signal(false);

  readonly showMedicalSection = signal(false);

  readonly petForm = this.fb.group({
    name: ['', Validators.required],
    species: [null as PetSpecies | null, Validators.required],
    breed: [''],
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    weight: [null as number | null, [Validators.min(0)]],
    isNeutered: [false],
    notes: [''],
    medicalConditions: [''],
    medicalNotes: [''],
    feedingSchedule: [''],
    microchipNumber: [''],
    vetName: [''],
    vetPhone: [''],
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

  scrollToAddPetForm(): void {
    document.getElementById('add-pet-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      allergies: this.allergiesCommaSeparated(),
      medicalConditions: v.medicalConditions?.trim() || undefined,
      isNeutered: !!v.isNeutered,
      medicalNotes: v.medicalNotes?.trim() || undefined,
      feedingSchedule: v.feedingSchedule?.trim() || undefined,
      microchipNumber: v.microchipNumber?.trim() || undefined,
      vetName: v.vetName?.trim() || undefined,
      vetPhone: v.vetPhone?.trim() || undefined,
    };

    const editId = this.editingPetId();
    const request$ = editId
      ? this.petService.update(editId, payload)
      : this.petService.create(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(editId ? 'Pet updated!' : 'Pet added successfully!');
        this.editingPetId.set(null);
        this.resetPetFormDefaults();
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
    this.hydrateAllergiesFromString(pet.allergies);
    this.petForm.patchValue({
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? '',
      age: pet.age,
      weight: pet.weight ?? null,
      isNeutered: pet.isNeutered ?? false,
      notes: pet.notes ?? '',
      medicalConditions: pet.medicalConditions ?? '',
      medicalNotes: pet.medicalNotes ?? '',
      feedingSchedule: pet.feedingSchedule ?? '',
      microchipNumber: pet.microchipNumber ?? '',
      vetName: pet.vetName ?? '',
      vetPhone: pet.vetPhone ?? '',
    });
    if (pet.medicalNotes || pet.feedingSchedule || pet.microchipNumber || pet.vetName || pet.vetPhone) {
      this.showMedicalSection.set(true);
    }
  }

  cancelPetEdit(): void {
    this.editingPetId.set(null);
    this.resetPetFormDefaults();
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
        if (this.medicalCardPetId() === pet.id) {
          this.medicalCardPetId.set(null);
        }
        if (this.triagePetId() === pet.id) {
          this.triagePetId.set(null);
          this.triageHistory.set([]);
        }
        if (this.editingPetId() === pet.id) {
          this.editingPetId.set(null);
          this.resetPetFormDefaults();
        }
        this.toast.success(`${pet.name} removed.`);
      },
      error: () => this.toast.error('Failed to remove pet. Please try again.'),
    });
  }

  // ── Medical Card ──

  toggleMedicalCard(pet: Pet): void {
    if (this.medicalCardPetId() === pet.id) {
      this.medicalCardPetId.set(null);
      return;
    }
    this.expandedPetId.set(null);
    this.records.set([]);
    this.showRecordForm.set(false);
    this.editingRecordId.set(null);
    this.triagePetId.set(null);
    this.triageHistory.set([]);
    this.medicalCardPetId.set(pet.id);
  }

  hasMedicalInfo(pet: Pet): boolean {
    return !!(pet.medicalNotes || pet.feedingSchedule || pet.microchipNumber || pet.vetName || pet.vetPhone || pet.isNeutered);
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
    this.medicalCardPetId.set(null);
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
    this.medicalCardPetId.set(null);
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

  toggleAllergyChip(key: string): void {
    this.selectedAllergies.update((prev) => {
      const next = new Set(prev);
      if (key === 'None') {
        next.clear();
        next.add('None');
        return next;
      }
      next.delete('None');
      if (next.has(key)) next.delete(key);
      else next.add(key);
      if (next.size === 0) next.add('None');
      return next;
    });
  }

  allergyChipClass(key: string): string {
    const on = this.selectedAllergies().has(key);
    const base =
      'min-h-[2.25rem] rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 border';
    if (on) {
      return `${base} border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-500/25`;
    }
    return `${base} border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60`;
  }

  private allergiesCommaSeparated(): string | undefined {
    const set = this.selectedAllergies();
    if (set.size === 0 || set.has('None')) return undefined;
    return [...set].join(', ');
  }

  private hydrateAllergiesFromString(s: string | null | undefined): void {
    const known = new Set<string>(ALLERGY_OPTIONS.filter((x) => x !== 'None'));
    if (!s?.trim()) {
      this.selectedAllergies.set(new Set(['None']));
      return;
    }
    const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
    const next = new Set<string>();
    let other = false;
    for (const p of parts) {
      const match = [...known].find((k) => k.toLowerCase() === p.toLowerCase());
      if (match) next.add(match);
      else other = true;
    }
    if (other) next.add('Other');
    if (next.size === 0) next.add('None');
    this.selectedAllergies.set(next);
  }

  private resetAllergiesToNone(): void {
    this.selectedAllergies.set(new Set(['None']));
  }

  private resetPetFormDefaults(): void {
    this.petForm.reset({
      name: '',
      species: null,
      breed: '',
      age: null,
      weight: null,
      isNeutered: false,
      notes: '',
      medicalConditions: '',
      medicalNotes: '',
      feedingSchedule: '',
      microchipNumber: '',
      vetName: '',
      vetPhone: '',
    });
    this.resetAllergiesToNone();
    this.showMedicalSection.set(false);
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

  private refreshPets(): void {
    this.petService.getAll().subscribe({
      next: (pets) => this.pets.set(pets),
    });
  }
}
