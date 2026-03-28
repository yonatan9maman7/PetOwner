import {
  Component, Input, OnChanges, SimpleChanges, signal, inject,
  ViewChild, ElementRef, AfterViewInit, OnDestroy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Chart, registerables } from 'chart.js';
import { Pet } from '../../../services/pet.service';
import { MedicalRecord, MedicalRecordService } from '../../../services/medical-record.service';
import {
  PetHealthService, Vaccination, VaccineStatus, WeightLog,
  VACCINE_NAMES, CreateVaccinationPayload, CreateWeightLogPayload,
} from '../../../services/pet-health.service';
import { ToastService } from '../../../services/toast.service';

Chart.register(...registerables);

type ActiveSection = 'vaccines' | 'weight' | 'vault';

@Component({
  selector: 'app-pet-health-passport',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, TranslatePipe],
  template: `
    <!-- Section Tabs -->
    <div class="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
      <button type="button" (click)="activeSection.set('vaccines')"
              class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200"
              [class]="activeSection() === 'vaccines'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-purple-300 hover:text-purple-600'">
        <span>💉</span> {{ 'HEALTH.TAB_VACCINES' | translate }}
        @if (overdueCount() > 0) {
          <span class="ml-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold bg-red-500 text-white vaccine-overdue-pulse">
            {{ overdueCount() }}
          </span>
        }
      </button>
      <button type="button" (click)="activeSection.set('weight')"
              class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200"
              [class]="activeSection() === 'weight'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-purple-300 hover:text-purple-600'">
        <span>📊</span> {{ 'HEALTH.TAB_WEIGHT' | translate }}
      </button>
      <button type="button" (click)="activeSection.set('vault')"
              class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200"
              [class]="activeSection() === 'vault'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-purple-300 hover:text-purple-600'">
        <span>📁</span> {{ 'HEALTH.TAB_VAULT' | translate }}
      </button>
    </div>

    <!-- ═══════════ SECTION A: VACCINATION BOOK ═══════════ -->
    @if (activeSection() === 'vaccines') {
      <div class="space-y-3">
        @if (vaccinesLoading()) {
          <div class="flex items-center justify-center py-10 text-slate-400">
            <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span class="text-sm">{{ 'HEALTH.LOADING' | translate }}</span>
          </div>
        } @else {
          @if (vaccineStatuses().length > 0) {
            <div class="space-y-2.5">
              @for (vs of vaccineStatuses(); track vs.vaccineName) {
                <div class="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                  <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
                       [class]="vaccineStatusBg(vs.status)">
                    💉
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-semibold text-slate-900">{{ vaccineI18nKey(vs.vaccineName) | translate }}</span>
                      <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                            [class]="vaccineStatusBadge(vs.status)">
                        @if (vs.status === 'Overdue') {
                          <span class="vaccine-overdue-pulse inline-block mr-0.5 w-1.5 h-1.5 rounded-full bg-red-400"></span>
                        }
                        {{ vaccineStatusI18n(vs.status) | translate }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-400 mt-0.5">
                      {{ 'HEALTH.ADMINISTERED' | translate }}: {{ vs.dateAdministered | date:'mediumDate' }}
                      @if (vs.nextDueDate) {
                        <span> · {{ 'HEALTH.NEXT_DUE' | translate }}: {{ vs.nextDueDate | date:'mediumDate' }}</span>
                      }
                    </p>
                  </div>
                  <button type="button" (click)="confirmDeleteVaccination(vs.vaccineName)"
                          class="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          style="opacity:1">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              }
            </div>
          } @else if (!showVaccineForm()) {
            <div class="text-center py-8">
              <div class="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center text-2xl mx-auto mb-3">💉</div>
              <p class="text-sm text-slate-500">{{ 'HEALTH.NO_VACCINES' | translate }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ 'HEALTH.NO_VACCINES_HINT' | translate }}</p>
            </div>
          }

          <!-- Add Vaccination Form -->
          @if (showVaccineForm()) {
            <div class="bg-white rounded-xl border border-purple-100 p-4 shadow-sm">
              <h4 class="text-sm font-semibold text-slate-900 mb-3">{{ 'HEALTH.ADD_VACCINE' | translate }}</h4>
              <form [formGroup]="vaccineForm" (ngSubmit)="submitVaccine()" class="space-y-3">
                <div>
                  <label class="block text-start text-xs font-medium text-slate-600 mb-1">{{ 'HEALTH.VACCINE_NAME' | translate }}</label>
                  <select formControlName="vaccineName" dir="auto"
                          class="w-full text-start rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition">
                    @for (v of vaccineNames; track v) {
                      <option [value]="v">{{ vaccineI18nKey(v) | translate }}</option>
                    }
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-start text-xs font-medium text-slate-600 mb-1">{{ 'HEALTH.DATE_ADMINISTERED' | translate }}</label>
                    <input type="date" formControlName="dateAdministered"
                           class="w-full text-start rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition" />
                  </div>
                  <div>
                    <label class="block text-start text-xs font-medium text-slate-600 mb-1">{{ 'HEALTH.NEXT_DUE_DATE' | translate }}</label>
                    <input type="date" formControlName="nextDueDate"
                           class="w-full text-start rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition" />
                  </div>
                </div>
                <div>
                  <label class="block text-start text-xs font-medium text-slate-600 mb-1">{{ 'HEALTH.NOTES' | translate }}</label>
                  <input type="text" formControlName="notes" dir="auto"
                         class="w-full text-start rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition"
                         [placeholder]="'HEALTH.NOTES_PLACEHOLDER' | translate" />
                </div>
                <div class="flex gap-2">
                  <button type="submit" [disabled]="vaccineSubmitting() || vaccineForm.invalid"
                          class="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm">
                    {{ vaccineSubmitting() ? ('HEALTH.SAVING' | translate) : ('HEALTH.ADD_VACCINE' | translate) }}
                  </button>
                  <button type="button" (click)="showVaccineForm.set(false)"
                          class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                    {{ 'PETS.CANCEL' | translate }}
                  </button>
                </div>
              </form>
            </div>
          } @else {
            <button type="button" (click)="openVaccineForm()"
                    class="w-full rounded-xl border-2 border-dashed border-purple-200 px-4 py-3 text-sm font-medium text-purple-400 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50/50 transition-all duration-200">
              + {{ 'HEALTH.ADD_VACCINE' | translate }}
            </button>
          }
        }
      </div>
    }

    <!-- ═══════════ SECTION B: WEIGHT TRACKER ═══════════ -->
    @if (activeSection() === 'weight') {
      <div class="space-y-4">
        @if (weightLoading()) {
          <div class="flex items-center justify-center py-10 text-slate-400">
            <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span class="text-sm">{{ 'HEALTH.LOADING' | translate }}</span>
          </div>
        } @else {
          <!-- Weight Chart -->
          @if (weightHistory().length > 1) {
            <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <h4 class="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">{{ 'HEALTH.WEIGHT_TREND' | translate }}</h4>
              <div class="relative" style="height: 220px;">
                <canvas #weightChart></canvas>
              </div>
            </div>
          }

          <!-- Weight Log List -->
          @if (weightHistory().length > 0) {
            <div class="space-y-2">
              @for (w of weightHistory().slice().reverse().slice(0, 10); track w.id) {
                <div class="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3 shadow-sm">
                  <div class="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                    <span class="text-sm font-bold text-indigo-600">{{ w.weight }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-slate-800">{{ w.weight }} {{ 'PETS.KG' | translate }}</span>
                    <p class="text-xs text-slate-400">{{ w.dateRecorded | date:'mediumDate' }}</p>
                  </div>
                  <button type="button" (click)="confirmDeleteWeight(w)"
                          class="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              }
            </div>
          } @else if (!showWeightForm()) {
            <div class="text-center py-8">
              <div class="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-2xl mx-auto mb-3">📊</div>
              <p class="text-sm text-slate-500">{{ 'HEALTH.NO_WEIGHT' | translate }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ 'HEALTH.NO_WEIGHT_HINT' | translate }}</p>
            </div>
          }

          <!-- Quick Log Weight -->
          @if (showWeightForm()) {
            <div class="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
              <h4 class="text-sm font-semibold text-slate-900 mb-3">{{ 'HEALTH.LOG_WEIGHT' | translate }}</h4>
              <form [formGroup]="weightForm" (ngSubmit)="submitWeight()" class="flex items-end gap-3">
                <div class="flex-1">
                  <label class="block text-start text-xs font-medium text-slate-600 mb-1">{{ 'HEALTH.WEIGHT_KG' | translate }}</label>
                  <input type="number" step="0.1" formControlName="weight" min="0.1"
                         class="w-full text-start rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                         placeholder="12.5" />
                </div>
                <div class="flex-1">
                  <label class="block text-start text-xs font-medium text-slate-600 mb-1">{{ 'HEALTH.DATE' | translate }}</label>
                  <input type="date" formControlName="dateRecorded"
                         class="w-full text-start rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
                </div>
                <button type="submit" [disabled]="weightSubmitting() || weightForm.invalid"
                        class="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm">
                  {{ weightSubmitting() ? '...' : '+' }}
                </button>
                <button type="button" (click)="showWeightForm.set(false)"
                        class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                  {{ 'PETS.CANCEL' | translate }}
                </button>
              </form>
            </div>
          } @else {
            <button type="button" (click)="openWeightForm()"
                    class="w-full rounded-xl border-2 border-dashed border-indigo-200 px-4 py-3 text-sm font-medium text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all duration-200">
              + {{ 'HEALTH.LOG_WEIGHT' | translate }}
            </button>
          }
        }
      </div>
    }

    <!-- ═══════════ SECTION C: MEDICAL VAULT ═══════════ -->
    @if (activeSection() === 'vault') {
      <div class="space-y-4">
        @if (vaultLoading()) {
          <div class="flex items-center justify-center py-10 text-slate-400">
            <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span class="text-sm">{{ 'HEALTH.LOADING' | translate }}</span>
          </div>
        } @else {
          <!-- Export PDF Button -->
          <button type="button" (click)="exportPdfSummary()"
                  class="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4
                         bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700
                         text-white text-sm font-bold shadow-md transition-all duration-200">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {{ 'HEALTH.EXPORT_PDF' | translate }}
          </button>

          <!-- Document Grid -->
          @if (vaultRecords().length > 0) {
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              @for (rec of vaultRecords(); track rec.id) {
                <div class="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow group">
                  @if (rec.documentUrl) {
                    @if (isImage(rec.documentUrl)) {
                      <div class="w-full h-24 rounded-lg bg-slate-100 overflow-hidden mb-2">
                        <img [src]="rec.documentUrl" [alt]="rec.title" class="w-full h-full object-cover" />
                      </div>
                    } @else {
                      <div class="w-full h-24 rounded-lg bg-red-50 flex items-center justify-center mb-2">
                        <svg class="w-10 h-10 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    }
                  } @else {
                    <div class="w-full h-24 rounded-lg bg-slate-50 flex items-center justify-center mb-2">
                      <svg class="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  }
                  <h5 class="text-xs font-semibold text-slate-800 truncate">{{ rec.title }}</h5>
                  <p class="text-[10px] text-slate-400 mt-0.5">{{ rec.date | date:'mediumDate' }}</p>
                  @if (rec.documentUrl) {
                    <a [href]="rec.documentUrl" target="_blank" rel="noopener"
                       class="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 hover:text-purple-700">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {{ 'HEALTH.OPEN_FILE' | translate }}
                    </a>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-8">
              <div class="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-2xl mx-auto mb-3">📁</div>
              <p class="text-sm text-slate-500">{{ 'HEALTH.NO_DOCUMENTS' | translate }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ 'HEALTH.NO_DOCUMENTS_HINT' | translate }}</p>
            </div>
          }
        }
      </div>
    }

    <style>
      .vaccine-overdue-pulse {
        animation: overduePulse 1.5s ease-in-out infinite;
      }
      @@keyframes overduePulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); transform: scale(1); }
        50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); transform: scale(1.05); }
      }
    </style>
  `,
})
export class PetHealthPassportComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() pet: Pet | null = null;
  @ViewChild('weightChart') weightChartRef?: ElementRef<HTMLCanvasElement>;

  private readonly healthService = inject(PetHealthService);
  private readonly recordService = inject(MedicalRecordService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  readonly vaccineNames = VACCINE_NAMES;
  readonly activeSection = signal<ActiveSection>('vaccines');

  // Vaccines
  readonly vaccineStatuses = signal<VaccineStatus[]>([]);
  readonly vaccinations = signal<Vaccination[]>([]);
  readonly vaccinesLoading = signal(false);
  readonly showVaccineForm = signal(false);
  readonly vaccineSubmitting = signal(false);
  readonly overdueCount = signal(0);

  readonly vaccineForm = this.fb.group({
    vaccineName: ['Rabies', Validators.required],
    dateAdministered: ['', Validators.required],
    nextDueDate: [''],
    notes: [''],
  });

  // Weight
  readonly weightHistory = signal<WeightLog[]>([]);
  readonly weightLoading = signal(false);
  readonly showWeightForm = signal(false);
  readonly weightSubmitting = signal(false);

  readonly weightForm = this.fb.group({
    weight: [null as number | null, [Validators.required, Validators.min(0.1)]],
    dateRecorded: ['', Validators.required],
  });

  // Vault
  readonly vaultRecords = signal<MedicalRecord[]>([]);
  readonly vaultLoading = signal(false);

  private chartInstance: Chart | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pet'] && this.pet) {
      this.loadAll();
    }
  }

  ngAfterViewInit(): void {
    if (this.pet) {
      setTimeout(() => this.renderChart());
    }
  }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
  }

  private loadAll(): void {
    if (!this.pet) return;
    this.loadVaccines();
    this.loadWeight();
    this.loadVault();
  }

  // ── Vaccines ──

  private loadVaccines(): void {
    if (!this.pet) return;
    this.vaccinesLoading.set(true);
    this.healthService.getVaccineStatus(this.pet.id).subscribe({
      next: (statuses) => {
        this.vaccineStatuses.set(statuses);
        this.overdueCount.set(statuses.filter(s => s.status === 'Overdue').length);
        this.vaccinesLoading.set(false);
      },
      error: () => {
        this.vaccinesLoading.set(false);
        this.toast.error(this.translate.instant('HEALTH.LOAD_FAILED'));
      },
    });
    this.healthService.getVaccinations(this.pet.id).subscribe({
      next: (v) => this.vaccinations.set(v),
    });
  }

  openVaccineForm(): void {
    this.vaccineForm.reset({ vaccineName: 'Rabies', dateAdministered: '', nextDueDate: '', notes: '' });
    this.showVaccineForm.set(true);
  }

  submitVaccine(): void {
    if (!this.pet || this.vaccineSubmitting() || this.vaccineForm.invalid) return;
    this.vaccineSubmitting.set(true);
    const v = this.vaccineForm.getRawValue();
    const payload: CreateVaccinationPayload = {
      vaccineName: v.vaccineName!,
      dateAdministered: new Date(v.dateAdministered!).toISOString(),
      nextDueDate: v.nextDueDate ? new Date(v.nextDueDate).toISOString() : null,
      notes: v.notes?.trim() || null,
    };
    this.healthService.createVaccination(this.pet.id, payload).subscribe({
      next: () => {
        this.vaccineSubmitting.set(false);
        this.showVaccineForm.set(false);
        this.toast.success(this.translate.instant('HEALTH.VACCINE_ADDED'));
        this.loadVaccines();
      },
      error: () => {
        this.vaccineSubmitting.set(false);
        this.toast.error(this.translate.instant('HEALTH.SAVE_FAILED'));
      },
    });
  }

  confirmDeleteVaccination(vaccineName: string): void {
    const vac = this.vaccinations().find(v => v.vaccineName === vaccineName);
    if (!vac || !this.pet) return;
    if (!confirm(this.translate.instant('HEALTH.CONFIRM_DELETE_VACCINE'))) return;
    this.healthService.deleteVaccination(this.pet.id, vac.id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('HEALTH.VACCINE_DELETED'));
        this.loadVaccines();
      },
      error: () => this.toast.error(this.translate.instant('HEALTH.DELETE_FAILED')),
    });
  }

  // ── Weight ──

  private loadWeight(): void {
    if (!this.pet) return;
    this.weightLoading.set(true);
    this.healthService.getWeightHistory(this.pet.id).subscribe({
      next: (logs) => {
        this.weightHistory.set(logs);
        this.weightLoading.set(false);
        setTimeout(() => this.renderChart());
      },
      error: () => {
        this.weightLoading.set(false);
        this.toast.error(this.translate.instant('HEALTH.LOAD_FAILED'));
      },
    });
  }

  openWeightForm(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.weightForm.reset({ weight: null, dateRecorded: today });
    this.showWeightForm.set(true);
  }

  submitWeight(): void {
    if (!this.pet || this.weightSubmitting() || this.weightForm.invalid) return;
    this.weightSubmitting.set(true);
    const v = this.weightForm.getRawValue();
    const payload: CreateWeightLogPayload = {
      weight: v.weight!,
      dateRecorded: new Date(v.dateRecorded!).toISOString(),
    };
    this.healthService.createWeightLog(this.pet.id, payload).subscribe({
      next: () => {
        this.weightSubmitting.set(false);
        this.showWeightForm.set(false);
        this.toast.success(this.translate.instant('HEALTH.WEIGHT_LOGGED'));
        this.loadWeight();
      },
      error: () => {
        this.weightSubmitting.set(false);
        this.toast.error(this.translate.instant('HEALTH.SAVE_FAILED'));
      },
    });
  }

  confirmDeleteWeight(w: WeightLog): void {
    if (!this.pet || !confirm(this.translate.instant('HEALTH.CONFIRM_DELETE_WEIGHT'))) return;
    this.healthService.deleteWeightLog(this.pet.id, w.id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('HEALTH.WEIGHT_DELETED'));
        this.loadWeight();
      },
      error: () => this.toast.error(this.translate.instant('HEALTH.DELETE_FAILED')),
    });
  }

  private renderChart(): void {
    const canvas = this.weightChartRef?.nativeElement;
    if (!canvas) return;

    this.chartInstance?.destroy();
    const data = this.weightHistory();
    if (data.length < 2) return;

    const labels = data.map(w => new Date(w.dateRecorded).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const weights = data.map(w => w.weight);

    this.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: this.translate.instant('PETS.KG'),
          data: weights,
          fill: true,
          backgroundColor: 'rgba(139, 92, 246, 0.08)',
          borderColor: 'rgb(139, 92, 246)',
          borderWidth: 2.5,
          tension: 0.4,
          pointBackgroundColor: 'rgb(139, 92, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(30, 30, 60, 0.9)',
            titleFont: { size: 12 },
            bodyFont: { size: 13, weight: 'bold' },
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: '#94a3b8' },
          },
          y: {
            grid: { color: 'rgba(148,163,184,0.1)' },
            ticks: { font: { size: 10 }, color: '#94a3b8' },
          },
        },
      },
    });
  }

  // ── Vault ──

  private loadVault(): void {
    if (!this.pet) return;
    this.vaultLoading.set(true);
    this.recordService.getAll(this.pet.id).subscribe({
      next: (records) => {
        this.vaultRecords.set(records);
        this.vaultLoading.set(false);
      },
      error: () => {
        this.vaultLoading.set(false);
        this.toast.error(this.translate.instant('HEALTH.LOAD_FAILED'));
      },
    });
  }

  isImage(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
  }

  exportPdfSummary(): void {
    if (!this.pet) return;
    const pet = this.pet;
    const vaccines = this.vaccineStatuses();
    const weights = this.weightHistory();

    const statusBadge = (s: string) => {
      if (s === 'Overdue') return '<span style="color:#dc2626;font-weight:700">OVERDUE</span>';
      if (s === 'Due Soon') return '<span style="color:#d97706;font-weight:700">DUE SOON</span>';
      return '<span style="color:#16a34a;font-weight:700">UP TO DATE</span>';
    };

    const vaccineRows = vaccines.map(v =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${v.vaccineName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${new Date(v.dateAdministered).toLocaleDateString()}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString() : '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${statusBadge(v.status)}</td>
      </tr>`
    ).join('');

    const weightRows = weights.slice(-10).map(w =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${new Date(w.dateRecorded).toLocaleDateString()}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${w.weight} kg</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><title>${pet.name} — Health Passport</title>
      <style>
        body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 700px; margin: 40px auto; color: #1e293b; }
        h1 { color: #7c3aed; margin-bottom: 4px; }
        h2 { color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 32px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th { text-align: left; padding: 8px 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; }
        .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; color: #991b1b; font-weight: 600; margin: 8px 0; }
        .meta { color: #64748b; font-size: 13px; }
        @media print { body { margin: 20px; } }
      </style>
    </head><body>
      <h1>${pet.name} — Health Passport</h1>
      <p class="meta">Generated ${new Date().toLocaleDateString()} · Species: ${pet.species} · Age: ${pet.age} · ${pet.breed || ''}</p>
      ${pet.allergies ? `<div class="alert">Allergies: ${pet.allergies}</div>` : ''}
      ${pet.medicalConditions ? `<div class="alert" style="background:#fefce8;border-color:#fde68a;color:#92400e">Conditions: ${pet.medicalConditions}</div>` : ''}
      <h2>Vaccination Record</h2>
      ${vaccines.length ? `<table><thead><tr><th>Vaccine</th><th>Administered</th><th>Next Due</th><th>Status</th></tr></thead><tbody>${vaccineRows}</tbody></table>` : '<p style="color:#94a3b8">No vaccination records.</p>'}
      <h2>Weight History</h2>
      ${weights.length ? `<table><thead><tr><th>Date</th><th>Weight</th></tr></thead><tbody>${weightRows}</tbody></table>` : '<p style="color:#94a3b8">No weight records.</p>'}
      ${pet.microchipNumber ? `<h2>Identification</h2><p><strong>Microchip:</strong> ${pet.microchipNumber}</p>` : ''}
      ${pet.vetName || pet.vetPhone ? `<h2>Veterinarian</h2><p>${pet.vetName || ''} ${pet.vetPhone ? '· ' + pet.vetPhone : ''}</p>` : ''}
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 400);
    }
  }

  // ── UI helpers ──

  vaccineStatusBg(status: string): string {
    switch (status) {
      case 'Up to Date': return 'bg-green-50';
      case 'Due Soon': return 'bg-amber-50';
      case 'Overdue': return 'bg-red-50';
      default: return 'bg-slate-50';
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

  vaccineStatusI18n(status: string): string {
    switch (status) {
      case 'Up to Date': return 'HEALTH.STATUS_VALID';
      case 'Due Soon': return 'HEALTH.STATUS_DUE_SOON';
      case 'Overdue': return 'HEALTH.STATUS_OVERDUE';
      default: return status;
    }
  }

  vaccineI18nKey(name: string): string {
    return `HEALTH.VACCINE_${name.toUpperCase()}`;
  }
}
