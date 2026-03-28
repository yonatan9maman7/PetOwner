import { Component, inject, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Pet, PetService, ReportLostPayload } from '../../services/pet.service';
import { TeletriageService, TeletriageHistory } from '../../services/teletriage.service';
import { GeocodingService, AddressSuggestion } from '../../services/geocoding.service';
import { ToastService } from '../../services/toast.service';
import {
  PET_SPECIES_OPTIONS,
  PetSpecies,
  normalizePetSpecies,
  petSpeciesEmoji,
  petSpeciesIconBgClass,
} from '../../models/pet-species.model';
import { BREED_I18N_MAP } from './breed.constants';
import { PetFormComponent } from './pet-form/pet-form.component';
import { PetHealthPassportComponent } from './pet-health-passport/pet-health-passport.component';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

@Component({
  selector: 'app-my-pets',
  standalone: true,
  imports: [DatePipe, TranslatePipe, PetFormComponent, PetHealthPassportComponent],
  template: `
    <div class="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-b from-indigo-50 to-white px-4 py-8">
      <div class="max-w-2xl mx-auto min-w-0">

        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-slate-900">{{ 'PROFILE.MY_PETS' | translate }}</h1>
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
                          {{ speciesI18nKey(pet.species) | translate }}@if (pet.breed) {<span> · {{ breedI18nKey(pet.breed) | translate }}</span>} · @if (pet.age === 1) {<span>{{ 'PETS.ONE_YEAR_OLD' | translate }}</span>} @else {<span>{{ 'PETS.N_YEARS_OLD' | translate: { years: pet.age } }}</span>}@if (pet.weight) {<span> · {{ pet.weight }} {{ 'PETS.KG' | translate }}</span>}@if (pet.isNeutered) {<span> · {{ 'PETS.NEUTERED_SHORT' | translate }}</span>}
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

                    <!-- SOS Button -->
                    <div class="mt-3">
                      @if (pet.isLost) {
                        <button
                          type="button"
                          (click)="markPetFound(pet)"
                          [disabled]="sosSubmitting()"
                          class="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4
                                 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                                 text-white text-sm font-bold shadow-md
                                 transition-all duration-150
                                 disabled:opacity-50 disabled:cursor-not-allowed">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {{ 'SOS.MARK_FOUND' | translate }}
                        </button>
                      } @else if (sosCooldownRemaining()) {
                        <button
                          type="button"
                          disabled
                          class="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4
                                 bg-gray-200 text-gray-500 text-sm font-bold cursor-not-allowed">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {{ 'SOS.COOLDOWN' | translate: { time: sosCooldownRemaining() } }}
                        </button>
                      } @else {
                        <button
                          type="button"
                          (click)="openSosDialog(pet)"
                          class="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4
                                 bg-red-500 hover:bg-red-600 active:bg-red-700
                                 text-white text-sm font-bold shadow-lg
                                 sos-pulse-btn transition-all duration-150">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {{ 'SOS.REPORT_LOST' | translate }}
                        </button>
                      }
                    </div>

                    <!-- Medical Card / Health Passport / Triage History Toggles -->
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
                        (click)="toggleHealthPassport(pet)"
                        class="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
                        [class]="healthPassportPetId() === pet.id ? 'text-purple-600' : 'text-slate-400 hover:text-purple-500'"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        {{ 'HEALTH.TAB_TITLE' | translate }}
                        <svg class="w-3.5 h-3.5 transition-transform duration-200" [class.rotate-180]="healthPassportPetId() === pet.id" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
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
                        {{ 'PETS.TRIAGE_HISTORY' | translate }}
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

                  <!-- ─── Expanded Health Passport Panel ─── -->
                  @if (healthPassportPetId() === pet.id) {
                    <div class="border-t border-gray-100 bg-gradient-to-br from-purple-50/60 to-indigo-50/40 p-5">
                      <app-pet-health-passport [pet]="pet"></app-pet-health-passport>
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
                          <span class="text-sm">{{ 'PETS.LOADING_TRIAGE' | translate }}</span>
                        </div>
                      } @else if (triageHistory().length === 0) {
                        <div class="text-center py-6">
                          <div class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                            <svg class="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </div>
                          <p class="text-sm text-slate-500 mb-1">{{ 'PETS.NO_TRIAGE' | translate }}</p>
                          <p class="text-xs text-slate-400">{{ 'PETS.NO_TRIAGE_HINT' | translate }}</p>
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
                                    <span class="font-medium text-slate-600">{{ 'PETS.SYMPTOMS' | translate }}:</span> {{ session.symptoms }}
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
            </div>
          }

          <!-- ─── Add / Edit Pet Form ─── -->
          <app-pet-form
            [editingPet]="editingPetData()"
            (petSaved)="onPetFormSaved()"
            (editCancelled)="onEditCancelled()"
          ></app-pet-form>
        }
      </div>
    </div>

    <!-- ─── SOS Report Lost Dialog ─── -->
    @if (sosPet()) {
      <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" (click)="closeSosDialog()"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden
                    animate-[sosSlideIn_0.25s_ease-out]" dir="auto">
          <!-- Red Header -->
          <div class="bg-gradient-to-r from-red-500 to-red-600 px-5 py-4 text-white">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🆘</span>
              <div>
                <h2 class="text-lg font-bold">{{ 'SOS.DIALOG_TITLE' | translate }}</h2>
                <p class="text-sm text-red-100">{{ 'SOS.DIALOG_SUBTITLE' | translate: { name: sosPet()!.name } }}</p>
              </div>
            </div>
          </div>

          <div class="p-5 space-y-4">
            <!-- Address Autocomplete -->
            <div>
              <label class="block text-start text-xs font-semibold text-slate-600 mb-1.5">
                {{ 'SOS.LAST_SEEN_ADDRESS' | translate }}
              </label>
              <input
                type="text"
                dir="auto"
                [attr.placeholder]="'SOS.ADDRESS_PLACEHOLDER' | translate"
                [value]="sosAddressQuery()"
                (input)="onSosAddressInput($any($event.target).value)"
                class="w-full text-start placeholder:text-start rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm
                       text-slate-900 placeholder-slate-400
                       focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition" />
              @if (sosSuggestions().length > 0) {
                <ul class="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto text-start">
                  @for (s of sosSuggestions(); track s.displayName) {
                    <li (click)="selectSosSuggestion(s)"
                        class="px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 cursor-pointer
                               transition-colors border-b border-gray-50 last:border-0">
                      {{ s.displayName }}
                    </li>
                  }
                </ul>
              }
            </div>

            <!-- Emergency Phone -->
            <div>
              <label class="block text-start text-xs font-semibold text-slate-600 mb-1.5">
                {{ 'SOS.EMERGENCY_PHONE' | translate }}
              </label>
              <input
                type="tel"
                dir="ltr"
                [attr.placeholder]="'SOS.PHONE_PLACEHOLDER' | translate"
                [value]="sosPhone()"
                (input)="sosPhone.set($any($event.target).value)"
                class="w-full text-start rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm
                       text-slate-900 placeholder-slate-400
                       focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition" />
            </div>

            <!-- Actions -->
            <div class="flex gap-2 pt-1">
              <button
                type="button"
                (click)="submitSos()"
                [disabled]="sosSubmitting() || !sosSelectedAddress() || !sosPhone()"
                class="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4
                       bg-red-500 hover:bg-red-600 active:bg-red-700
                       text-white text-sm font-bold shadow-lg
                       transition-all duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed">
                @if (sosSubmitting()) {
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                }
                {{ 'SOS.SEND_ALERT' | translate }}
              </button>
              <button
                type="button"
                (click)="closeSosDialog()"
                class="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium
                       text-slate-600 hover:bg-slate-50 transition">
                {{ 'PETS.CANCEL' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ─── SOS Success Dialog ─── -->
    @if (sosSuccessPet(); as sp) {
      <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-[2px]" (click)="dismissSosSuccess()"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden
                    animate-[sosSlideIn_0.3s_ease-out]">
          <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-center">
            <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-white" dir="auto">{{ 'SOS.SUCCESS_TITLE' | translate }}</h3>
            <p class="mt-1 text-sm text-white/90" dir="auto">{{ 'SOS.SUCCESS_MESSAGE' | translate: { name: sp.name } }}</p>
          </div>
          <div class="p-5 space-y-3">
            @if (sp.communityPostId) {
              <button
                type="button"
                (click)="goToSosPost()"
                class="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4
                       bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold
                       transition-all duration-150">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {{ 'SOS.EDIT_POST' | translate }}
              </button>
            }
            <button
              type="button"
              (click)="dismissSosSuccess()"
              class="w-full rounded-xl border border-gray-200 py-3 px-4 text-sm font-medium
                     text-slate-600 hover:bg-slate-50 transition">
              {{ 'SOS.CLOSE' | translate }}
            </button>
          </div>
        </div>
      </div>
    }

    <style>
      .sos-pulse-btn {
        animation: sosPulse 2s ease-in-out infinite;
      }
      @@keyframes sosPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
        50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
      }
      @@keyframes sosSlideIn {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
    </style>
  `,
})
export class MyPetsComponent implements OnInit, OnDestroy {
  private readonly petService = inject(PetService);
  private readonly triageService = inject(TeletriageService);
  private readonly geocoding = inject(GeocodingService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  @ViewChild(PetFormComponent) petFormComp?: PetFormComponent;

  readonly petSpeciesOptions = PET_SPECIES_OPTIONS;

  readonly speciesEmoji = petSpeciesEmoji;
  readonly speciesIconClass = petSpeciesIconBgClass;


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

  breedI18nKey(breed: string): string {
    return BREED_I18N_MAP[breed] ?? breed;
  }

  readonly pets = signal<Pet[]>([]);
  readonly loading = signal(true);

  readonly editingPetData = signal<Pet | null>(null);

  readonly medicalCardPetId = signal<string | null>(null);
  readonly healthPassportPetId = signal<string | null>(null);

  readonly triagePetId = signal<string | null>(null);
  readonly triageHistory = signal<TeletriageHistory[]>([]);
  readonly triageLoading = signal(false);

  ngOnInit(): void {
    this.loadPets();
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }

  loadPets(): void {
    this.loading.set(true);
    this.petService.getAll().subscribe({
      next: (pets) => {
        this.pets.set(pets);
        this.loading.set(false);
        this.startCooldownTimer();
      },
      error: () => {
        this.toast.error('Failed to load pets.');
        this.loading.set(false);
      },
    });
  }

  scrollToAddPetForm(): void {
    this.petFormComp?.openForm();
    setTimeout(() => {
      document.getElementById('add-pet-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ── Pet Form Integration ──

  editPet(pet: Pet): void {
    this.editingPetData.set(pet);
    setTimeout(() => {
      document.getElementById('add-pet-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  onPetFormSaved(): void {
    this.editingPetData.set(null);
    this.refreshPets();
  }

  onEditCancelled(): void {
    this.editingPetData.set(null);
  }

  confirmDelete(pet: Pet): void {
    if (!confirm(`Remove ${pet.name} from your pets?`)) return;

    this.petService.delete(pet.id).subscribe({
      next: () => {
        this.pets.update((list) => list.filter((p) => p.id !== pet.id));
        if (this.medicalCardPetId() === pet.id) {
          this.medicalCardPetId.set(null);
        }
        if (this.healthPassportPetId() === pet.id) {
          this.healthPassportPetId.set(null);
        }
        if (this.triagePetId() === pet.id) {
          this.triagePetId.set(null);
          this.triageHistory.set([]);
        }
        if (this.editingPetData()?.id === pet.id) {
          this.editingPetData.set(null);
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
    this.triagePetId.set(null);
    this.triageHistory.set([]);
    this.healthPassportPetId.set(null);
    this.medicalCardPetId.set(pet.id);
  }

  // ── Health Passport ──

  toggleHealthPassport(pet: Pet): void {
    if (this.healthPassportPetId() === pet.id) {
      this.healthPassportPetId.set(null);
      return;
    }
    this.medicalCardPetId.set(null);
    this.triagePetId.set(null);
    this.triageHistory.set([]);
    this.healthPassportPetId.set(pet.id);
  }

  hasMedicalInfo(pet: Pet): boolean {
    return !!(pet.medicalNotes || pet.feedingSchedule || pet.microchipNumber || pet.vetName || pet.vetPhone || pet.isNeutered);
  }

  // ── Triage History ──

  toggleTriageHistory(pet: Pet): void {
    if (this.triagePetId() === pet.id) {
      this.triagePetId.set(null);
      this.triageHistory.set([]);
      return;
    }
    this.medicalCardPetId.set(null);
    this.healthPassportPetId.set(null);
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

  // ── SOS / Lost Pet ──

  readonly sosPet = signal<Pet | null>(null);
  readonly sosAddressQuery = signal('');
  readonly sosSuggestions = signal<AddressSuggestion[]>([]);
  readonly sosSelectedAddress = signal<AddressSuggestion | null>(null);
  readonly sosPhone = signal('');
  readonly sosSubmitting = signal(false);
  readonly sosCooldownRemaining = signal<string | null>(null);
  readonly sosSuccessPet = signal<Pet | null>(null);
  private readonly router = inject(Router);
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;
  private readonly sosSearch$ = new Subject<string>();

  private initSosSearch(): void {
    this.sosSearch$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(q => this.geocoding.search(q)),
    ).subscribe(results => this.sosSuggestions.set(results));
  }

  private startCooldownTimer(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.tickCooldown();
    this.cooldownTimer = setInterval(() => this.tickCooldown(), 60_000);
  }

  private tickCooldown(): void {
    const pets = this.pets();
    const SOS_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    let latestLostAt = 0;
    for (const p of pets) {
      if (p.lostAt) {
        const t = new Date(p.lostAt).getTime();
        if (t > latestLostAt) latestLostAt = t;
      }
    }

    if (!latestLostAt || now - latestLostAt >= SOS_COOLDOWN_MS) {
      this.sosCooldownRemaining.set(null);
      if (this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
      return;
    }

    const remaining = SOS_COOLDOWN_MS - (now - latestLostAt);
    const hours = Math.floor(remaining / 3_600_000);
    const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
    this.sosCooldownRemaining.set(
      hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
    );
  }

  openSosDialog(pet: Pet): void {
    this.sosPet.set(pet);
    this.sosAddressQuery.set('');
    this.sosSuggestions.set([]);
    this.sosSelectedAddress.set(null);
    this.sosPhone.set('');
    this.initSosSearch();
  }

  closeSosDialog(): void {
    this.sosPet.set(null);
  }

  onSosAddressInput(value: string): void {
    this.sosAddressQuery.set(value);
    this.sosSelectedAddress.set(null);
    this.sosSearch$.next(value);
  }

  selectSosSuggestion(s: AddressSuggestion): void {
    this.sosAddressQuery.set(s.displayName);
    this.sosSelectedAddress.set(s);
    this.sosSuggestions.set([]);
  }

  submitSos(): void {
    const pet = this.sosPet();
    const addr = this.sosSelectedAddress();
    const phone = this.sosPhone().trim();
    if (!pet || !addr || !phone) return;

    this.sosSubmitting.set(true);
    const payload: ReportLostPayload = {
      lastSeenLocation: addr.displayName,
      lastSeenLat: addr.lat,
      lastSeenLng: addr.lon,
      contactPhone: phone,
    };

    this.petService.reportLost(pet.id, payload).subscribe({
      next: (updated) => {
        this.pets.update(list => list.map(p => p.id === updated.id ? updated : p));
        this.sosSubmitting.set(false);
        this.closeSosDialog();
        this.startCooldownTimer();
        this.sosSuccessPet.set(updated);
      },
      error: (err) => {
        this.sosSubmitting.set(false);
        const body = err?.error;
        if (body?.code === 'SOS_COOLDOWN') {
          this.closeSosDialog();
          this.startCooldownTimer();
          this.toast.error(this.translate.instant('SOS.COOLDOWN_ERROR'));
        } else {
          this.toast.error(this.translate.instant('SOS.REPORT_FAILED'));
        }
      },
    });
  }

  markPetFound(pet: Pet): void {
    this.sosSubmitting.set(true);
    this.petService.markFound(pet.id).subscribe({
      next: (updated) => {
        this.pets.update(list => list.map(p => p.id === updated.id ? updated : p));
        this.sosSubmitting.set(false);
        this.startCooldownTimer();
        this.toast.success(this.translate.instant('SOS.FOUND_SUCCESS', { name: pet.name }));
      },
      error: () => {
        this.sosSubmitting.set(false);
        this.toast.error(this.translate.instant('SOS.FOUND_FAILED'));
      },
    });
  }

  goToSosPost(): void {
    const pet = this.sosSuccessPet();
    if (pet?.communityPostId) {
      this.sosSuccessPet.set(null);
      this.router.navigate(['/community'], { queryParams: { highlightPost: pet.communityPostId } });
    }
  }

  dismissSosSuccess(): void {
    this.sosSuccessPet.set(null);
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

  private refreshPets(): void {
    this.petService.getAll().subscribe({
      next: (pets) => this.pets.set(pets),
    });
  }
}
