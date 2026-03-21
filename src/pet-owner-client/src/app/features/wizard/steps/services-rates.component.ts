import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { WizardStore } from '../wizard.store';
import {
  ServiceRateDto,
  ServiceType,
  PricingUnit,
  SERVICE_CARDS,
} from '../wizard.model';

@Component({
  selector: 'app-step-services-rates',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <h2 class="step-title">{{ 'WIZARD.SERVICES_RATES' | translate }}</h2>

    <fieldset class="border-0 p-0 m-0 min-w-0">
      <legend class="mb-4 block text-start text-base font-semibold text-slate-900">
        {{ 'WIZARD.WHICH_SERVICES' | translate }}
      </legend>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        @for (card of cards; track card.type) {
          <div
            class="cursor-pointer select-none rounded-2xl border-2 p-5 shadow-md transition-all duration-200"
            [class]="isSelected(card.type)
              ? 'border-primary bg-gradient-to-br from-indigo-50/90 to-violet-50/50 shadow-md ring-2 ring-primary/15'
              : 'border-slate-200/90 bg-white hover:border-primary hover:shadow-lg'"
            (click)="toggle(card.type)">

            <div
              class="icon-placeholder mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-2xl"
              [class]="isSelected(card.type)
                ? 'from-indigo-100 to-violet-100 ring-1 ring-primary/20'
                : 'from-slate-100 to-slate-50 ring-1 ring-slate-200/80 text-slate-400'">
              {{ iconFor(card.type) }}
            </div>
            <span class="block text-start text-lg font-semibold tracking-tight text-slate-900" dir="auto">
              {{ serviceTitleKey(card.type) | translate }}
            </span>
            <div dir="auto" class="text-start mt-1.5 text-sm leading-relaxed text-slate-600">
              {{ serviceDescKey(card.type) | translate }}
            </div>

            @if (isSelected(card.type)) {
              <div class="mt-4 pt-3 border-t border-slate-200/70" (click)="$event.stopPropagation()">
                <label class="mb-1.5 block text-start text-xs font-medium text-indigo-700">
                  {{ serviceRateKey(card.type) | translate }} (ILS)
                </label>
                <input
                  type="number"
                  min="1"
                  dir="auto"
                  inputmode="decimal"
                  class="w-full text-start placeholder:text-start rounded-xl border-2 border-indigo-200 bg-white px-4 py-2.5 text-sm text-slate-900
                         placeholder-slate-400 outline-none transition
                         focus:border-primary focus:ring-2 focus:ring-primary/20"
                  [value]="rateFor(card.type)"
                  (input)="updateRate(card.type, $any($event.target).value, card.pricingUnit)"
                  [attr.placeholder]="'WIZARD.RATE_PLACEHOLDER' | translate"
                />
              </div>
            }
          </div>
        }
      </div>
    </fieldset>
  `,
})
export class ServicesRatesComponent implements OnInit {
  private readonly store = inject(WizardStore);

  readonly cards = SERVICE_CARDS;
  readonly selected = signal<ServiceRateDto[]>([]);

  /** Exposes a form-like interface so the parent wizard can check validity. */
  get form() {
    const sel = this.selected();
    return {
      valid: sel.length > 0 && sel.every((r) => r.rate > 0),
      markAllAsTouched(): void {},
    };
  }

  private readonly icons: Record<ServiceType, string> = {
    DogWalking: '🐕',
    PetSitting: '🏠',
    Boarding: '🛏️',
    DropInVisit: '👋',
  };

  private readonly titleKeys: Record<ServiceType, string> = {
    DogWalking: 'WIZARD.SERVICE_DOG_WALKING_TITLE',
    PetSitting: 'WIZARD.SERVICE_PET_SITTING_TITLE',
    Boarding: 'WIZARD.SERVICE_BOARDING_TITLE',
    DropInVisit: 'WIZARD.SERVICE_DROP_IN_TITLE',
  };

  private readonly descKeys: Record<ServiceType, string> = {
    DogWalking: 'WIZARD.SERVICE_DOG_WALKING_DESC',
    PetSitting: 'WIZARD.SERVICE_PET_SITTING_DESC',
    Boarding: 'WIZARD.SERVICE_BOARDING_DESC',
    DropInVisit: 'WIZARD.SERVICE_DROP_IN_DESC',
  };

  private readonly rateKeys: Record<ServiceType, string> = {
    DogWalking: 'WIZARD.RATE_PER_HOUR',
    PetSitting: 'WIZARD.RATE_PER_HOUR',
    Boarding: 'WIZARD.RATE_PER_NIGHT',
    DropInVisit: 'WIZARD.RATE_PER_VISIT',
  };

  serviceTitleKey(type: ServiceType): string {
    return this.titleKeys[type];
  }

  serviceDescKey(type: ServiceType): string {
    return this.descKeys[type];
  }

  serviceRateKey(type: ServiceType): string {
    return this.rateKeys[type];
  }

  ngOnInit(): void {
    const saved = this.store.formSnapshot().selectedServices;
    if (saved.length > 0) {
      this.selected.set([...saved]);
    }
  }

  isSelected(type: ServiceType): boolean {
    return this.selected().some((r) => r.serviceType === type);
  }

  rateFor(type: ServiceType): number | null {
    return this.selected().find((r) => r.serviceType === type)?.rate ?? null;
  }

  iconFor(type: ServiceType): string {
    return this.icons[type] ?? '🐾';
  }

  toggle(type: ServiceType): void {
    if (this.isSelected(type)) {
      this.selected.update((list) => list.filter((r) => r.serviceType !== type));
    } else {
      const card = this.cards.find((c) => c.type === type)!;
      this.selected.update((list) => [
        ...list,
        { serviceType: type, rate: 0, pricingUnit: card.pricingUnit },
      ]);
    }
    this.sync();
  }

  updateRate(type: ServiceType, value: string, unit: PricingUnit): void {
    const rate = parseFloat(value) || 0;
    this.selected.update((list) =>
      list.map((r) =>
        r.serviceType === type ? { ...r, rate, pricingUnit: unit } : r,
      ),
    );
    this.sync();
  }

  private sync(): void {
    this.store.patchServices(this.selected());
  }
}
