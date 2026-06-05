import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../services/language.service';

interface SharedPassportPet {
  name: string;
  species: string | number;
  breed: string | null;
  gender: string | number;
  age: string;
  birthDate: string | null;
  weight: number | null;
  allergies: string | null;
  medicalConditions: string | null;
  medicalNotes: string | null;
  feedingSchedule: string | null;
  microchipNumber: string | null;
  vetName: string | null;
  vetPhone: string | null;
  isNeutered: boolean;
  imageUrl: string | null;
}

interface SharedPassportOwner {
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface SharedVaccineStatus {
  vaccineName: string;
  dateAdministered: string;
  nextDueDate: string | null;
  status: string;
}

interface SharedWeightEntry {
  weight: number;
  dateRecorded: string;
}

interface SharedMedicalRecord {
  type: string;
  title: string;
  description: string | null;
  date: string;
  documentUrl: string | null;
}

interface SharedHealthPassportDto {
  pet: SharedPassportPet;
  owner: SharedPassportOwner;
  vaccineStatuses: SharedVaccineStatus[];
  weights: SharedWeightEntry[];
  records: SharedMedicalRecord[];
  expiresAt: string;
}

@Component({
  selector: 'app-public-health-passport',
  standalone: true,
  imports: [DatePipe, TranslatePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <header class="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-purple-100 px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🐾</span>
          <span class="text-lg font-bold text-purple-700">PetOwner</span>
        </div>
        <button
          type="button"
          (click)="language.toggleLanguage()"
          class="px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold hover:bg-purple-200 transition-colors">
          {{ language.currentLang() === 'he' ? 'EN' : 'HE' }}
        </button>
      </header>

      <div class="max-w-lg mx-auto px-4 py-6 pb-12">
        @if (isFetching()) {
          <div class="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg class="w-8 h-8 animate-spin mb-3 text-purple-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span class="text-sm">{{ 'HEALTH.LOADING' | translate }}</span>
          </div>
        } @else if (error()) {
          <div class="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
            <div class="text-4xl mb-3">🔗</div>
            <h1 class="text-lg font-bold text-slate-900 mb-2">{{ 'PUBLIC_PASSPORT.LINK_EXPIRED' | translate }}</h1>
            <p class="text-sm text-slate-500">{{ 'PUBLIC_PASSPORT.LINK_EXPIRED_HINT' | translate }}</p>
          </div>
        } @else {
          @if (passport(); as data) {
          <!-- Hero -->
          <div class="bg-white rounded-2xl shadow-md border border-purple-100 overflow-hidden mb-4">
            <div class="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4">
              <p class="text-purple-200 text-xs font-medium mb-1">{{ 'PUBLIC_PASSPORT.SHARED_PASSPORT' | translate }}</p>
              <h1 class="text-2xl font-bold text-white">{{ data.pet.name }}</h1>
            </div>
            <div class="p-5 flex gap-4">
              @if (data.pet.imageUrl) {
                <img [src]="data.pet.imageUrl" [alt]="data.pet.name"
                     class="w-20 h-20 rounded-2xl object-cover shrink-0 ring-2 ring-purple-100" />
              } @else {
                <div class="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center text-3xl shrink-0">
                  {{ speciesEmoji(data.pet.species) }}
                </div>
              }
              <div class="flex-1 min-w-0 space-y-1.5 text-sm">
                <div class="flex flex-wrap gap-x-4 gap-y-1">
                  <span class="text-slate-500">{{ 'PETS.SPECIES' | translate }}:</span>
                  <span class="font-semibold text-slate-800">{{ speciesLabel(data.pet.species) | translate }}</span>
                </div>
                @if (data.pet.breed) {
                  <div class="flex flex-wrap gap-x-4 gap-y-1">
                    <span class="text-slate-500">{{ 'PETS.BREED' | translate }}:</span>
                    <span class="font-semibold text-slate-800">{{ data.pet.breed }}</span>
                  </div>
                }
                <div class="flex flex-wrap gap-x-4 gap-y-1">
                  <span class="text-slate-500">{{ 'PETS.GENDER' | translate }}:</span>
                  <span class="font-semibold text-slate-800">{{ genderLabel(data.pet.gender) | translate }}</span>
                </div>
                @if (data.pet.age) {
                  <div class="flex flex-wrap gap-x-4 gap-y-1">
                    <span class="text-slate-500">{{ 'PETS.AGE' | translate }}:</span>
                    <span class="font-semibold text-slate-800">{{ data.pet.age }}</span>
                  </div>
                }
                @if (data.pet.weight != null) {
                  <div class="flex flex-wrap gap-x-4 gap-y-1">
                    <span class="text-slate-500">{{ 'PETS.WEIGHT' | translate }}:</span>
                    <span class="font-semibold text-slate-800">{{ data.pet.weight }} {{ 'PETS.KG' | translate }}</span>
                  </div>
                }
                @if (data.pet.isNeutered) {
                  <span class="inline-flex items-center rounded-full bg-green-50 text-green-700 px-2 py-0.5 text-xs font-semibold">
                    {{ 'PETS.SPAYED' | translate }}
                  </span>
                }
              </div>
            </div>
          </div>

          <!-- Alerts -->
          @if (data.pet.allergies) {
            <div class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3 text-sm">
              <span class="font-bold text-red-700">{{ 'PETS.ALLERGIES' | translate }}:</span>
              <span class="text-red-800 ms-1">{{ data.pet.allergies }}</span>
            </div>
          }
          @if (data.pet.medicalConditions) {
            <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 text-sm">
              <span class="font-bold text-amber-700">{{ 'PETS.MEDICAL_CONDITIONS' | translate }}:</span>
              <span class="text-amber-800 ms-1">{{ data.pet.medicalConditions }}</span>
            </div>
          }

          <!-- Owner contact -->
          @if (data.owner.name || data.owner.phone || data.owner.email) {
            <section class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
              <h2 class="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                <span>👤</span> {{ 'PUBLIC_PASSPORT.OWNER_CONTACT' | translate }}
              </h2>
              <div class="space-y-2 text-sm">
                @if (data.owner.name) {
                  <p><span class="text-slate-500">{{ 'PUBLIC_PASSPORT.OWNER_NAME' | translate }}:</span> <span class="font-semibold">{{ data.owner.name }}</span></p>
                }
                @if (data.owner.phone) {
                  <p>
                    <span class="text-slate-500">{{ 'PUBLIC_PASSPORT.OWNER_PHONE' | translate }}:</span>
                    <a [href]="'tel:' + data.owner.phone" class="font-semibold text-purple-600 hover:underline ms-1">{{ data.owner.phone }}</a>
                  </p>
                }
                @if (data.owner.email) {
                  <p>
                    <span class="text-slate-500">{{ 'PUBLIC_PASSPORT.OWNER_EMAIL' | translate }}:</span>
                    <a [href]="'mailto:' + data.owner.email" class="font-semibold text-purple-600 hover:underline ms-1 break-all">{{ data.owner.email }}</a>
                  </p>
                }
              </div>
            </section>
          }

          <!-- Vaccines -->
          <section class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
            <h2 class="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
              <span>💉</span> {{ 'HEALTH.TAB_VACCINES' | translate }}
            </h2>
            @if (data.vaccineStatuses.length === 0) {
              <p class="text-sm text-slate-400">{{ 'HEALTH.NO_VACCINES' | translate }}</p>
            } @else {
              <div class="space-y-2.5">
                @for (vs of data.vaccineStatuses; track vs.vaccineName) {
                  <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-sm font-semibold text-slate-900">{{ vaccineI18nKey(vs.vaccineName) | translate }}</span>
                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                              [class]="vaccineStatusBadge(vs.status)">
                          {{ vaccineStatusI18n(vs.status) | translate }}
                        </span>
                      </div>
                      <p class="text-xs text-slate-400 mt-0.5">
                        {{ 'HEALTH.ADMINISTERED' | translate }}: {{ vs.dateAdministered | date:'mediumDate' }}
                        @if (vs.nextDueDate) {
                          · {{ 'HEALTH.NEXT_DUE' | translate }}: {{ vs.nextDueDate | date:'mediumDate' }}
                        }
                      </p>
                    </div>
                  </div>
                }
              </div>
            }
          </section>

          <!-- Weight -->
          <section class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
            <h2 class="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
              <span>📊</span> {{ 'HEALTH.TAB_WEIGHT' | translate }}
            </h2>
            @if (data.weights.length === 0) {
              <p class="text-sm text-slate-400">{{ 'HEALTH.NO_WEIGHT' | translate }}</p>
            } @else {
              <div class="overflow-x-auto -mx-1">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-slate-500 text-xs">
                      <th class="text-start py-2 px-2 font-semibold">{{ 'HEALTH.DATE' | translate }}</th>
                      <th class="text-start py-2 px-2 font-semibold">{{ 'HEALTH.WEIGHT_KG' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (w of data.weights; track w.dateRecorded) {
                      <tr class="border-t border-slate-100">
                        <td class="py-2 px-2 text-slate-700">{{ w.dateRecorded | date:'mediumDate' }}</td>
                        <td class="py-2 px-2 font-semibold text-slate-900">{{ w.weight }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <!-- Medical records -->
          <section class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
            <h2 class="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
              <span>📁</span> {{ 'HEALTH.TAB_VAULT' | translate }}
            </h2>
            @if (data.records.length === 0) {
              <p class="text-sm text-slate-400">{{ 'HEALTH.NO_DOCUMENTS' | translate }}</p>
            } @else {
              <div class="space-y-2.5">
                @for (rec of data.records; track rec.date + rec.title) {
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-slate-900">{{ rec.title }}</p>
                        <p class="text-xs text-slate-400 mt-0.5">
                          {{ recordTypeI18n(rec.type) | translate }} · {{ rec.date | date:'mediumDate' }}
                        </p>
                        @if (rec.description) {
                          <p class="text-xs text-slate-600 mt-1">{{ rec.description }}</p>
                        }
                      </div>
                      @if (rec.documentUrl) {
                        <a [href]="rec.documentUrl" target="_blank" rel="noopener"
                           class="shrink-0 text-xs font-semibold text-purple-600 hover:underline">
                          {{ 'HEALTH.OPEN_FILE' | translate }}
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </section>

          <!-- Extra details -->
          @if (data.pet.medicalNotes || data.pet.feedingSchedule || data.pet.microchipNumber || data.pet.vetName || data.pet.vetPhone) {
            <section class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
              <h2 class="text-sm font-bold text-purple-700 mb-3">{{ 'PETS.MEDICAL_INFO' | translate }}</h2>
              <div class="space-y-2 text-sm">
                @if (data.pet.medicalNotes) {
                  <p><span class="text-slate-500">{{ 'PETS.MEDICAL_NOTES' | translate }}:</span> <span class="text-slate-800">{{ data.pet.medicalNotes }}</span></p>
                }
                @if (data.pet.feedingSchedule) {
                  <p><span class="text-slate-500">{{ 'PETS.FEEDING_SCHEDULE' | translate }}:</span> <span class="text-slate-800">{{ data.pet.feedingSchedule }}</span></p>
                }
                @if (data.pet.microchipNumber) {
                  <p><span class="text-slate-500">{{ 'PETS.MICROCHIP' | translate }}:</span> <span class="font-mono text-slate-800">{{ data.pet.microchipNumber }}</span></p>
                }
                @if (data.pet.vetName || data.pet.vetPhone) {
                  <p>
                    <span class="text-slate-500">{{ 'PETS.VET_DETAILS' | translate }}:</span>
                    <span class="text-slate-800 ms-1">{{ data.pet.vetName }}@if (data.pet.vetPhone) { · {{ data.pet.vetPhone }} }</span>
                  </p>
                }
              </div>
            </section>
          }

          <p class="text-center text-xs text-slate-400 mt-6">
            {{ 'PUBLIC_PASSPORT.EXPIRES' | translate }}: {{ data.expiresAt | date:'medium' }}
          </p>
          }
        }
      </div>
    </div>
  `,
})
export class PublicHealthPassportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  readonly language = inject(LanguageService);

  readonly isFetching = signal(true);
  readonly error = signal(false);
  readonly passport = signal<SharedHealthPassportDto | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.isFetching.set(false);
      this.error.set(true);
      return;
    }

    this.http.get<SharedHealthPassportDto>(`/api/public/health-passport/${token}`).subscribe({
      next: (data) => {
        this.passport.set(data);
        this.isFetching.set(false);
      },
      error: () => {
        this.error.set(true);
        this.isFetching.set(false);
      },
    });
  }

  speciesLabel(species: string | number): string {
    const key = this.normalizeSpeciesKey(species);
    return `PETS.SPECIES_${key}`;
  }

  speciesEmoji(species: string | number): string {
    const key = this.normalizeSpeciesKey(species);
    const emojis: Record<string, string> = {
      DOG: '🐕', CAT: '🐈', BIRD: '🐦', RABBIT: '🐇', REPTILE: '🦎', OTHER: '🐾',
    };
    return emojis[key] ?? '🐾';
  }

  genderLabel(gender: string | number): string {
    const g = typeof gender === 'number' ? gender : gender?.toString().toLowerCase();
    if (g === 1 || g === 'male') return 'PETS.GENDER_MALE';
    if (g === 2 || g === 'female') return 'PETS.GENDER_FEMALE';
    return 'PETS.GENDER_UNKNOWN';
  }

  vaccineI18nKey(name: string): string {
    return `HEALTH.VACCINE_${name.toUpperCase()}`;
  }

  vaccineStatusI18n(status: string): string {
    switch (status) {
      case 'Up to Date': return 'HEALTH.STATUS_VALID';
      case 'Due Soon': return 'HEALTH.STATUS_DUE_SOON';
      case 'Overdue': return 'HEALTH.STATUS_OVERDUE';
      default: return status;
    }
  }

  vaccineStatusBadge(status: string): string {
    switch (status) {
      case 'Up to Date': return 'bg-green-100 text-green-700';
      case 'Due Soon': return 'bg-amber-100 text-amber-700';
      case 'Overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  recordTypeI18n(type: string): string {
    const normalized = type.replace(/\s+/g, '_').toUpperCase();
    return `PETS.RECORD_TYPE_${normalized}`;
  }

  private normalizeSpeciesKey(species: string | number): string {
    if (typeof species === 'number') {
      const map: Record<number, string> = { 1: 'DOG', 2: 'CAT', 3: 'BIRD', 4: 'RABBIT', 5: 'REPTILE', 6: 'OTHER' };
      return map[species] ?? 'OTHER';
    }
    const s = species.toString().trim();
    const asNum = Number(s);
    if (!Number.isNaN(asNum)) return this.normalizeSpeciesKey(asNum);
    return s.toUpperCase();
  }
}
