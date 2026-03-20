import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { WizardStore } from '../wizard.store';

@Component({
  selector: 'app-step-services-rates',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h2 class="step-title">Services &amp; Rates</h2>

    <form [formGroup]="form" class="step-form">
      <fieldset class="checkbox-group">
        <legend>Which services do you offer?</legend>

        <label class="checkbox">
          <input formControlName="dogWalker" type="checkbox" />
          <span>Dog Walker</span>
        </label>

        <label class="checkbox">
          <input formControlName="petSitter" type="checkbox" />
          <span>Pet Provider</span>
        </label>

        <label class="checkbox">
          <input formControlName="boarding" type="checkbox" />
          <span>Boarding</span>
        </label>
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
