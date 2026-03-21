import { NgClass } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { WizardStore } from '../wizard.store';

@Component({
  selector: 'app-step-services-rates',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  template: `
    <h2 class="step-title">Services &amp; Rates</h2>

    <form [formGroup]="form" class="step-form">
      <fieldset class="border-0 p-0 m-0 min-w-0">
        <legend class="mb-4 text-base font-semibold text-slate-900">
          Which services do you offer?
        </legend>

        <input
          id="wizard-svc-petsitter"
          type="checkbox"
          formControlName="petSitter"
          class="sr-only"
        />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2" role="presentation">
          <label class="block cursor-pointer select-none">
            <input type="checkbox" formControlName="dogWalker" class="peer sr-only" />
            <div
              class="flex h-full flex-col rounded-2xl border-2 border-slate-200/90 bg-white p-5 shadow-md transition-all duration-200 hover:border-primary hover:shadow-lg peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-checked:border-primary peer-checked:bg-gradient-to-br peer-checked:from-indigo-50/90 peer-checked:to-violet-50/50 peer-checked:shadow-md peer-checked:ring-2 peer-checked:ring-primary/15"
            >
              <div
                class="icon-placeholder mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-400 ring-1 ring-slate-200/80"
              ></div>
              <span class="text-lg font-semibold tracking-tight text-slate-900">Dog Walker</span>
              <span class="mt-1.5 text-sm leading-relaxed text-slate-600"
                >Leashed walks and exercise for pups in your neighborhood.</span
              >
            </div>
          </label>

          <label class="block cursor-pointer select-none" for="wizard-svc-petsitter">
            <div
              class="flex h-full flex-col rounded-2xl border-2 bg-white p-5 shadow-md transition-all duration-200 hover:border-primary hover:shadow-lg"
              [ngClass]="
                form.controls.petSitter.value
                  ? 'border-primary bg-gradient-to-br from-indigo-50/90 to-violet-50/50 shadow-md ring-2 ring-primary/15'
                  : 'border-slate-200/90'
              "
            >
              <div
                class="icon-placeholder mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-400 ring-1 ring-slate-200/80"
              ></div>
              <span class="text-lg font-semibold tracking-tight text-slate-900">Pet Sitter</span>
              <span class="mt-1.5 text-sm leading-relaxed text-slate-600"
                >In-home care and companionship while owners are away.</span
              >
            </div>
          </label>

          <label class="block cursor-pointer select-none">
            <input type="checkbox" formControlName="boarding" class="peer sr-only" />
            <div
              class="flex h-full flex-col rounded-2xl border-2 border-slate-200/90 bg-white p-5 shadow-md transition-all duration-200 hover:border-primary hover:shadow-lg peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-checked:border-primary peer-checked:bg-gradient-to-br peer-checked:from-indigo-50/90 peer-checked:to-violet-50/50 peer-checked:shadow-md peer-checked:ring-2 peer-checked:ring-primary/15"
            >
              <div
                class="icon-placeholder mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-400 ring-1 ring-slate-200/80"
              ></div>
              <span class="text-lg font-semibold tracking-tight text-slate-900">Boarding</span>
              <span class="mt-1.5 text-sm leading-relaxed text-slate-600"
                >Overnight stays in a trusted, comfortable environment.</span
              >
            </div>
          </label>

          <label class="block cursor-pointer select-none" for="wizard-svc-petsitter">
            <div
              class="flex h-full flex-col rounded-2xl border-2 bg-white p-5 shadow-md transition-all duration-200 hover:border-primary hover:shadow-lg"
              [ngClass]="
                form.controls.petSitter.value
                  ? 'border-primary bg-gradient-to-br from-indigo-50/90 to-violet-50/50 shadow-md ring-2 ring-primary/15'
                  : 'border-slate-200/90'
              "
            >
              <div
                class="icon-placeholder mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-400 ring-1 ring-slate-200/80"
              ></div>
              <span class="text-lg font-semibold tracking-tight text-slate-900">Drop-in Visit</span>
              <span class="mt-1.5 text-sm leading-relaxed text-slate-600"
                >Short pop-in visits for feeding, potty breaks, and peace of mind.</span
              >
            </div>
          </label>
        </div>
      </fieldset>

      <label class="field">
        <span class="field-label">Hourly Rate</span>
        <input formControlName="hourlyRate" type="number" min="0" placeholder="50" inputmode="decimal" />
        @if (form.controls.hourlyRate.touched && form.controls.hourlyRate.hasError('required')) {
          <span class="field-error">Hourly rate is required</span>
        }
        @if (form.controls.hourlyRate.touched && form.controls.hourlyRate.hasError('min')) {
          <span class="field-error">Rate must be positive</span>
        }
      </label>
    </form>
  `,
})
export class ServicesRatesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(WizardStore);

  readonly form = this.fb.nonNullable.group({
    dogWalker: [false],
    petSitter: [false],
    boarding: [false],
    hourlyRate: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    const saved = this.store.formSnapshot().services;
    this.form.patchValue(saved);

    this.form.valueChanges.subscribe((val) => {
      this.store.patchServices({
        dogWalker: val.dogWalker ?? false,
        petSitter: val.petSitter ?? false,
        boarding: val.boarding ?? false,
        hourlyRate: val.hourlyRate ?? null,
      });
    });
  }
}
