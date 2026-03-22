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
import { ServiceRateDto, PricingUnit, ServiceType } from '../../features/wizard/wizard.model';
import { BookingService } from '../../services/booking.service';
import { ToastService } from '../../services/toast.service';

export interface BookingModalInput {
  providerId: string;
  providerName: string;
  serviceRates: ServiceRateDto[];
}

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
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
              @for (rate of data?.serviceRates ?? []; track rate.serviceType) {
                <option [value]="rate.serviceType">
                  {{ serviceTypeI18nKey(rate.serviceType) | translate }} — ₪{{ rate.rate }}/{{ pricingUnitKey(rate.pricingUnit) | translate }}
                </option>
              }
            </select>
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
                     bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-white font-semibold rounded-xl py-3 px-4
                     transition-colors duration-150 text-sm">
              @if (submitting()) {
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {{ 'BOOKING.SUBMITTING' | translate }}
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
  private readonly destroy$ = new Subject<void>();

  readonly submitting = signal(false);

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

    const rate = this.data.serviceRates.find(r => r.serviceType === v.serviceType);
    if (!rate) return null;

    const start = new Date(v.startDate);
    const end = new Date(v.endDate);
    if (end <= start) return null;

    return this.calculatePrice(rate, start, end);
  });

  readonly priceBreakdown = computed(() => {
    const v = this.formValues();
    if (!v.serviceType || !v.startDate || !v.endDate || !this.data) return '';

    const rate = this.data.serviceRates.find((r) => r.serviceType === v.serviceType);
    if (!rate) return '';

    const start = new Date(v.startDate);
    const end = new Date(v.endDate);
    if (end <= start) return '';

    const tr = this.translate;
    switch (rate.pricingUnit) {
      case 'PerHour': {
        const hours = Math.round(((end.getTime() - start.getTime()) / 3_600_000) * 10) / 10;
        return tr.instant('BOOKING.PRICE_BREAKDOWN', { hours, rate: rate.rate });
      }
      case 'PerNight': {
        const nights = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
        return tr.instant('BOOKING.PRICE_NIGHT_BREAKDOWN', { nights, rate: rate.rate });
      }
      case 'PerVisit':
        return tr.instant('BOOKING.PRICE_VISIT_BREAKDOWN', { rate: rate.rate });
      default:
        return '';
    }
  });

  readonly canSubmit = computed(() => {
    return this.estimatedTotal() !== null && this.estimatedTotal()! > 0 && !this.submitting();
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
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (!this.canSubmit() || !this.data) return;

    const v = this.form.value;
    this.submitting.set(true);

    this.bookingService.create({
      providerId: this.data.providerId,
      serviceType: v.serviceType as ServiceType,
      startDate: new Date(v.startDate).toISOString(),
      endDate: new Date(v.endDate).toISOString(),
      notes: v.notes?.trim() || null,
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

  serviceTypeI18nKey(type: ServiceType): string {
    const map: Record<string, string> = {
      DogWalking: 'WIZARD.SERVICE_DOG_WALKING_TITLE',
      PetSitting: 'WIZARD.SERVICE_PET_SITTING_TITLE',
      Boarding: 'WIZARD.SERVICE_BOARDING_TITLE',
      DropInVisit: 'WIZARD.SERVICE_DROP_IN_TITLE',
    };
    return map[type] ?? type;
  }

  pricingUnitKey(unit: PricingUnit): string {
    const map: Record<string, string> = {
      PerHour: 'BOOKING.UNIT_HR',
      PerNight: 'BOOKING.UNIT_NIGHT',
      PerVisit: 'BOOKING.UNIT_VISIT',
    };
    return map[unit] ?? unit;
  }

  private calculatePrice(rate: ServiceRateDto, start: Date, end: Date): number {
    switch (rate.pricingUnit) {
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

    const defaultService = this.data?.serviceRates[0]?.serviceType ?? '';

    this.form.reset({
      serviceType: defaultService,
      startDate: toLocal(tomorrow),
      endDate: toLocal(endDefault),
      notes: '',
    });
    this.submitting.set(false);
  }
}
