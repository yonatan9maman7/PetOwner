import { Component, inject, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { WizardStore, TOTAL_STEPS } from './wizard.store';
import { ServicesRatesComponent } from './steps/services-rates.component';
import { MagicBioComponent } from './steps/magic-bio.component';
import { ToastService } from '../../services/toast.service';
import { ProviderService } from '../../services/provider.service';
import { AddressAutocompleteComponent } from '../../shared/address-autocomplete.component';
import { AddressSuggestion } from '../../services/geocoding.service';

@Component({
  selector: 'app-wizard',
  standalone: true,
  imports: [NgClass, FormsModule, ServicesRatesComponent, MagicBioComponent, AddressAutocompleteComponent],
  template: `
    @if (submitted()) {
      <div class="wizard-done">
        <div class="wizard-done__icon">&#10003;</div>
        <h2>Application Submitted!</h2>
        <p>We'll review your application and get back to you soon.</p>
      </div>
    } @else {
      <div class="wizard-progress" role="progressbar"
           [attr.aria-valuenow]="store.step()"
           [attr.aria-valuemin]="1"
           [attr.aria-valuemax]="totalSteps">
        <div class="wizard-progress__track">
          <div class="wizard-progress__fill"
               [style.width.%]="store.progressPercent()">
          </div>
        </div>
        <span class="wizard-progress__label">Step {{ store.step() }} of {{ totalSteps }}</span>
      </div>

      <nav class="step-indicators" aria-label="Wizard steps">
        @for (s of steps; track s.num) {
          <button
            class="step-dot"
            [ngClass]="{
              'step-dot--active':    s.num === store.step(),
              'step-dot--completed': s.num < store.step()
            }"
            [attr.aria-current]="s.num === store.step() ? 'step' : null"
            [disabled]="s.num > store.step()"
            (click)="store.goTo(s.num)"
          >
            <span class="step-dot__number">{{ s.num }}</span>
            <span class="step-dot__label">{{ s.label }}</span>
          </button>
        }
      </nav>

      <div class="wizard-body">
        @switch (store.step()) {
          @case (1) { <app-step-services-rates /> }
          @case (2) {
            <div class="flex flex-col items-center mb-6">
              <button
                type="button"
                class="avatar-ring"
                (click)="avatarInput.click()"
              >
                @if (imagePreview()) {
                  <img [src]="imagePreview()" alt="Profile" class="w-full h-full object-cover" />
                } @else {
                  <svg class="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                }
                <span class="avatar-overlay">
                  <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                  </svg>
                </span>
              </button>
              <p class="mt-2 text-xs text-slate-500">Upload a profile photo</p>
              <input
                #avatarInput
                type="file"
                accept="image/*"
                class="hidden"
                (change)="onImageSelected($event)"
              />
            </div>

            <app-step-magic-bio />

            <div class="location-section">
              <div class="location-toggle">
                <button
                  type="button"
                  class="location-toggle__btn"
                  [class.location-toggle__btn--active]="locationMode() === 'auto'"
                  (click)="switchLocationMode('auto')"
                >
                  📍 Use My Location
                </button>
                <button
                  type="button"
                  class="location-toggle__btn"
                  [class.location-toggle__btn--active]="locationMode() === 'manual'"
                  (click)="switchLocationMode('manual')"
                >
                  ✏️ Enter Address
                </button>
              </div>

              @if (locationMode() === 'auto') {
                <button
                  type="button"
                  class="btn btn-location"
                  [disabled]="locating()"
                  (click)="useMyLocation()"
                >
                  {{ locating() ? 'Locating...' : 'Detect My Location' }}
                </button>
                @if (store.hasLocation()) {
                  <p class="location-confirmation">Location captured ✓</p>
                }
              }

              @if (locationMode() === 'manual') {
                <div class="field">
                  <label class="field-label">Address</label>
                  <app-address-autocomplete
                    [ngModel]="store.address()"
                    (ngModelChange)="onAddressChange($event)"
                    (suggestionSelected)="onSuggestionSelected($event)"
                  />
                </div>
                @if (store.address().trim()) {
                  <p class="location-confirmation">Address set ✓</p>
                }
              }

              @if (locationError()) {
                <p class="location-error">{{ locationError() }}</p>
              }
            </div>
          }
        }
      </div>

      <footer class="wizard-nav">
        @if (store.step() > 1) {
          <button class="btn btn-outline" (click)="store.previous()">
            ← Back
          </button>
        } @else {
          <span></span>
        }

        @if (store.step() < totalSteps) {
          <button class="btn btn-primary" (click)="onNext()">
            Next →
          </button>
        } @else {
          <button
            class="btn btn-primary btn-submit"
            [disabled]="uploading() || store.isSubmitting()"
            (click)="onSubmit()"
          >
            {{ uploading() ? 'Uploading image...' : store.isSubmitting() ? 'Submitting...' : 'Submit Application' }}
          </button>
        }
      </footer>

      @if (errorMessage()) {
        <div class="wizard-error" role="alert">
          {{ errorMessage() }}
        </div>
      }
    }
  `,
  styleUrl: './wizard.component.scss',
})
export class WizardComponent {
  readonly store = inject(WizardStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly providerService = inject(ProviderService);

  readonly totalSteps = TOTAL_STEPS;
  readonly submitted = signal(false);
  readonly errorMessage = signal('');
  readonly locating = signal(false);
  readonly locationError = signal('');
  readonly locationMode = signal<'auto' | 'manual'>('auto');
  readonly imagePreview = signal<string | null>(null);
  readonly uploading = signal(false);

  selectedImageFile: File | null = null;

  readonly servicesStep = viewChild(ServicesRatesComponent);
  readonly bioStep = viewChild(MagicBioComponent);

  readonly steps = [
    { num: 1, label: 'Services' },
    { num: 2, label: 'Bio' },
  ];

  isCurrentStepValid(): boolean {
    switch (this.store.step()) {
      case 1: return this.servicesStep()?.form.valid ?? false;
      case 2: return true;
      default: return false;
    }
  }

  onNext(): void {
    this.errorMessage.set('');
    this.markCurrentStepTouched();
    if (this.isCurrentStepValid()) {
      this.store.next();
    } else {
      this.errorMessage.set('Please fill in all required fields correctly before continuing.');
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedImageFile = file;

    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    this.errorMessage.set('');
    this.markCurrentStepTouched();
    if (!this.isCurrentStepValid()) {
      this.errorMessage.set('Please fill in all required fields correctly before submitting.');
      return;
    }

    const upload$: Observable<unknown> = this.selectedImageFile
      ? this.providerService.uploadImage(this.selectedImageFile)
      : of(null);

    this.uploading.set(true);

    upload$.pipe(
      switchMap(() => {
        this.uploading.set(false);
        return this.store.submit();
      }),
    ).subscribe({
      next: () => {
        this.toast.success('Profile submitted! We\'ll review it shortly.');
        this.providerService.providerStatus.set('Pending');
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.uploading.set(false);
        this.errorMessage.set('Submission failed. Please try again.');
      },
    });
  }

  switchLocationMode(mode: 'auto' | 'manual'): void {
    this.locationMode.set(mode);
    this.locationError.set('');
    if (mode === 'manual') {
      this.store.clearCoordinates();
    } else {
      this.store.setAddress('');
    }
  }

  onAddressChange(value: string): void {
    this.store.setAddress(value);
  }

  onSuggestionSelected(suggestion: AddressSuggestion): void {
    this.store.setAddress(suggestion.displayName);
    this.store.setLocation(suggestion.lat, suggestion.lon);
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.locationError.set('Geolocation is not supported by your browser.');
      return;
    }

    this.locating.set(true);
    this.locationError.set('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.store.setLocation(pos.coords.latitude, pos.coords.longitude);
        this.locating.set(false);
      },
      () => {
        this.locationError.set('Unable to get your location. Please allow location access.');
        this.locating.set(false);
      },
    );
  }

  private markCurrentStepTouched(): void {
    const formMap: Record<number, { markAllAsTouched(): void } | undefined> = {
      1: this.servicesStep()?.form,
    };
    formMap[this.store.step()]?.markAllAsTouched();
  }
}
