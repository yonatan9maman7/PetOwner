import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ServiceRateDto, ServiceType } from '../../features/wizard/wizard.model';
import { BookingService } from '../../services/booking.service';
import { ToastService } from '../../services/toast.service';
import { PetService, Pet } from '../../services/pet.service';
import { petSpeciesEmoji } from '../../models/pet-species.model';
import {
  normalizeServiceType,
  normalizePricingUnit,
  ServiceTypePipe,
  PricingUnitPipe,
} from '../service-type.utils';

export interface BookingModalInput {
  providerId: string;
  providerName: string;
  serviceRates: ServiceRateDto[];
}

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, ServiceTypePipe, PricingUnitPipe],
  template: `
    <div
      class="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center transition-opacity duration-200"
      [class.pointer-events-none]="!open"
      [class.opacity-0]="!open">

      <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" (click)="close()"></div>

      <div class="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[calc(100%-2rem)] sm:max-w-md z-10
                  max-h-[90vh] overflow-y-auto transition-all duration-200 flex flex-col"
           [class.translate-y-full]="!open"
           [class.translate-y-0]="open"
           dir="auto">

        <!-- Header -->
        <div class="p-6 pb-0">
          <h3 class="text-lg font-bold text-gray-900 mb-1 text-start">{{ 'BOOKING.TITLE' | translate }}</h3>
          @if (data) {
            <p class="text-sm text-gray-500 mb-4 text-start">
              {{ 'BOOKING.WITH_NAME' | translate: { name: data.providerName } }}
            </p>
          }
        </div>

        <!-- Form -->
        <form [formGroup]="form" class="p-6 pt-2 space-y-4 flex-1 overflow-y-auto">

          <!-- Service selector -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-start">
              {{ 'BOOKING.SERVICE' | translate }}
            </label>
            <select
              formControlName="serviceType"
              dir="auto"
              class="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-start text-gray-900
                     focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition bg-white">
              <option value="" disabled>{{ 'BOOKING.SELECT_SERVICE' | translate }}</option>
              @for (rate of data?.serviceRates ?? []; track $index) {
                <option [value]="toNormalizedType(rate.serviceType)">
                  {{ rate.serviceType | serviceType | translate }} — ₪{{ rate.rate }}/{{ rate.pricingUnit | pricingUnit | translate }}
                </option>
              }
            </select>
          </div>

          <!-- Select Pets -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-start">
              {{ 'BOOKING.SELECT_PETS' | translate }}
            </label>
            @if (loadingPets()) {
              <p class="text-sm text-gray-400 py-2">{{ 'BOOKING.LOADING_PETS' | translate }}</p>
            } @else if (pets().length === 0) {
              <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 text-start">
                {{ 'BOOKING.NO_PETS_YET' | translate }}
              </div>
            } @else {
              <div class="flex flex-wrap gap-2">
                @for (pet of pets(); track pet.id) {
                  <button
                    type="button"
                    (click)="togglePet(pet.id)"
                    class="px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-150
                           flex items-center gap-1.5 select-none"
                    [class.bg-indigo-100]="isPetSelected(pet.id)"
                    [class.border-indigo-400]="isPetSelected(pet.id)"
                    [class.text-indigo-700]="isPetSelected(pet.id)"
                    [class.ring-2]="isPetSelected(pet.id)"
                    [class.ring-indigo-200]="isPetSelected(pet.id)"
                    [class.bg-gray-50]="!isPetSelected(pet.id)"
                    [class.border-gray-200]="!isPetSelected(pet.id)"
                    [class.text-gray-600]="!isPetSelected(pet.id)"
                    [class.hover:bg-gray-100]="!isPetSelected(pet.id)">
                    <span>{{ speciesEmoji(pet.species) }}</span>
                    <span>{{ pet.name }}</span>
                    @if (isPetSelected(pet.id)) {
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                    }
                  </button>
                }
              </div>
              @if (submitted() && selectedPetIds().length === 0) {
                <p class="text-xs text-red-500 mt-1.5 text-start">{{ 'BOOKING.SELECT_AT_LEAST_ONE_PET' | translate }}</p>
              }
            }
          </div>

          <!-- Start Date -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-start">
              {{ 'BOOKING.START_DATE' | translate }}
            </label>
            <input
              type="datetime-local"
              formControlName="startDate"
              dir="auto"
              class="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-start text-gray-900
                     focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
          </div>

          <!-- End Date -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-start">
              {{ 'BOOKING.END_DATE' | translate }}
            </label>
            <input
              type="datetime-local"
              formControlName="endDate"
              dir="auto"
              class="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-start text-gray-900
                     focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {{ 'BOOKING.NOTES' | translate }}
            </label>
            <textarea
              rows="2"
              formControlName="notes"
              dir="auto"
              [placeholder]="'BOOKING.NOTES_PLACEHOLDER' | translate"
              class="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-start placeholder:text-start text-gray-900 placeholder-gray-400
                     focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none">
            </textarea>
          </div>
        </form>

        <!-- Sticky bottom bar -->
        <div class="sticky bottom-0 bg-white border-t border-gray-100 p-4 space-y-3">
          <!-- Price summary -->
          @if (estimatedTotal() !== null) {
            <div class="bg-indigo-50 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div class="text-sm text-gray-600 text-start min-w-0" dir="auto">
                {{ priceBreakdown() }}
              </div>
              <div class="text-lg font-bold text-indigo-700 shrink-0" dir="auto">
                ₪{{ estimatedTotal()!.toFixed(2) }}
              </div>
            </div>
          }

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              (click)="submit()"
              [disabled]="!canSubmit()"
              class="flex-1 flex items-center justify-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-white font-semibold rounded-xl py-3 px-4
                     transition-colors duration-150 text-sm"
              [class.bg-indigo-600]="!isTrainingSelected()"
              [class.hover:bg-indigo-700]="!isTrainingSelected()"
              [class.active:bg-indigo-800]="!isTrainingSelected()"
              [class.bg-amber-600]="isTrainingSelected()"
              [class.hover:bg-amber-700]="isTrainingSelected()"
              [class.active:bg-amber-800]="isTrainingSelected()">
              @if (submitting()) {
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {{ (isTrainingSelected() ? 'BOOKING.CONSULTATION_SUBMITTING' : 'BOOKING.SUBMITTING') | translate }}
              } @else if (isTrainingSelected()) {
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {{ 'BOOKING.REQUEST_CONSULTATION' | translate }}
              } @else {
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ 'BOOKING.BOOK_NOW' | translate }}
              }
            </button>
            <button
              (click)="close()"
              class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-3 px-5
                     transition-colors duration-150 text-sm">
              {{ 'BOOKING.CANCEL' | translate }}
            </button>
          </div>
          @if (isTrainingSelected()) {
            <p class="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 text-start" dir="auto">
              {{ 'BOOKING.TRAINING_INFO' | translate }}
            </p>
          }
        </div>
      </div>
    </div>
  `,
})
export class BookingModalComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() data: BookingModalInput | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() booked = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly bookingService = inject(BookingService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly petService = inject(PetService);
  private readonly destroy$ = new Subject<void>();

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly pets = signal<Pet[]>([]);
  readonly loadingPets = signal(false);
  readonly selectedPetIds = signal<string[]>([]);

  readonly speciesEmoji = petSpeciesEmoji;

  form: FormGroup = this.fb.group({
    serviceType: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    notes: [''],
  });

  private readonly formValues = signal<{
    serviceType: string;
    startDate: string;
    endDate: string;
  }>({ serviceType: '', startDate: '', endDate: '' });

  readonly estimatedTotal = computed(() => {
    const v = this.formValues();
    if (!v.serviceType || !v.startDate || !v.endDate || !this.data) return null;

    const rate = this.data.serviceRates.find(
      r => normalizeServiceType(r.serviceType) === v.serviceType,
    );
    if (!rate) return null;

    const start = new Date(v.startDate);
    const end = new Date(v.endDate);
    if (end <= start) return null;

    const petCount = this.selectedPetIds().length;
    if (petCount === 0) return null;

    return this.calculatePrice(rate, start, end) * petCount;
  });

  readonly priceBreakdown = computed(() => {
    const v = this.formValues();
    if (!v.serviceType || !v.startDate || !v.endDate || !this.data) return '';

    const rate = this.data.serviceRates.find(
      r => normalizeServiceType(r.serviceType) === v.serviceType,
    );
    if (!rate) return '';

    const start = new Date(v.startDate);
    const end = new Date(v.endDate);
    if (end <= start) return '';

    const petCount = this.selectedPetIds().length;
    if (petCount === 0) return '';

    const tr = this.translate;
    let base = '';
    switch (normalizePricingUnit(rate.pricingUnit)) {
      case 'PerHour': {
        const hours = Math.round(((end.getTime() - start.getTime()) / 3_600_000) * 10) / 10;
        base = tr.instant('BOOKING.PRICE_BREAKDOWN', { hours, rate: rate.rate });
        break;
      }
      case 'PerNight': {
        const nights = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
        base = tr.instant('BOOKING.PRICE_NIGHT_BREAKDOWN', { nights, rate: rate.rate });
        break;
      }
      case 'PerVisit':
        base = tr.instant('BOOKING.PRICE_VISIT_BREAKDOWN', { rate: rate.rate });
        break;
      case 'PerSession':
        base = tr.instant('BOOKING.PRICE_SESSION_BREAKDOWN', { rate: rate.rate });
        break;
      case 'PerPackage':
        base = tr.instant('BOOKING.PRICE_PACKAGE_BREAKDOWN', { rate: rate.rate });
        break;
      default:
        return '';
    }

    if (petCount > 1) {
      base += ` × ${petCount} ${tr.instant('BOOKING.PETS_LABEL')}`;
    }

    return base;
  });

  readonly isTrainingSelected = computed(() => {
    return this.formValues().serviceType === 'Training';
  });

  readonly canSubmit = computed(() => {
    return (
      this.estimatedTotal() !== null &&
      this.estimatedTotal()! > 0 &&
      !this.submitting() &&
      this.selectedPetIds().length > 0
    );
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.formValues.set({
        serviceType: v.serviceType ?? '',
        startDate: v.startDate ?? '',
        endDate: v.endDate ?? '',
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resetForm();
      this.loadPets();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  close(): void {
    this.closed.emit();
  }

  toNormalizedType(type: ServiceType | number | string): string {
    return normalizeServiceType(type);
  }

  togglePet(petId: string): void {
    const current = this.selectedPetIds();
    if (current.includes(petId)) {
      this.selectedPetIds.set(current.filter(id => id !== petId));
    } else {
      this.selectedPetIds.set([...current, petId]);
    }
  }

  isPetSelected(petId: string): boolean {
    return this.selectedPetIds().includes(petId);
  }

  submit(): void {
    this.submitted.set(true);
    if (!this.canSubmit() || !this.data) return;

    const v = this.form.value;
    const matchedRate = this.data.serviceRates.find(
      r => normalizeServiceType(r.serviceType) === v.serviceType,
    );
    if (!matchedRate) return;

    this.submitting.set(true);

    this.bookingService.create({
      providerId: this.data.providerId,
      serviceType: matchedRate.serviceType,
      startDate: new Date(v.startDate).toISOString(),
      endDate: new Date(v.endDate).toISOString(),
      notes: v.notes?.trim() || null,
      petIds: this.selectedPetIds(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.booked.emit();
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }

  private calculatePrice(rate: ServiceRateDto, start: Date, end: Date): number {
    switch (normalizePricingUnit(rate.pricingUnit)) {
      case 'PerNight': {
        const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
        return rate.rate * Math.max(1, days);
      }
      case 'PerHour': {
        const hours = (end.getTime() - start.getTime()) / 3_600_000;
        return Math.round(rate.rate * hours * 100) / 100;
      }
      case 'PerVisit':
        return rate.rate;
      case 'PerSession':
        return rate.rate;
      case 'PerPackage':
        return rate.rate;
      default:
        return 0;
    }
  }

  private resetForm(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const endDefault = new Date(tomorrow);
    endDefault.setHours(11, 0, 0, 0);

    const toLocal = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const firstRate = this.data?.serviceRates[0];
    const defaultService = firstRate
      ? normalizeServiceType(firstRate.serviceType)
      : '';

    this.form.reset({
      serviceType: defaultService,
      startDate: toLocal(tomorrow),
      endDate: toLocal(endDefault),
      notes: '',
    });
    this.selectedPetIds.set([]);
    this.submitted.set(false);
    this.submitting.set(false);
  }

  private loadPets(): void {
    this.loadingPets.set(true);
    this.petService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: pets => {
          this.pets.set(pets);
          this.loadingPets.set(false);
        },
        error: () => {
          this.pets.set([]);
          this.loadingPets.set(false);
        },
      });
  }
}
