import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { MagicBio, OnboardingApiPayload, OnboardingPayload, ServicesAndRates } from './wizard.model';

export const TOTAL_STEPS = 2;

const SERVICE_KEY_MAP: Record<string, string> = {
  dogWalker: 'DogWalker',
  petSitter: 'PetSitter',
  boarding: 'Boarding',
};

@Injectable({ providedIn: 'root' })
export class WizardStore {
  private readonly currentStep = signal(1);
  private readonly services = signal<ServicesAndRates>({ dogWalker: false, petSitter: false, boarding: false, hourlyRate: null });
  private readonly bio = signal<MagicBio>({ userNotes: '', generatedBio: '' });
  private readonly latitude = signal<number | null>(null);
  private readonly longitude = signal<number | null>(null);
  private readonly address_ = signal('');
  private readonly submitting = signal(false);
  private readonly generatingBio = signal(false);

  readonly step = this.currentStep.asReadonly();
  readonly isSubmitting = this.submitting.asReadonly();
  readonly isGeneratingBio = this.generatingBio.asReadonly();
  readonly progressPercent = computed(() => (this.currentStep() / TOTAL_STEPS) * 100);
  readonly hasLocation = computed(() =>
    (this.latitude() !== null && this.longitude() !== null) || this.address_().trim().length > 0
  );
  readonly address = this.address_.asReadonly();

  readonly formSnapshot = computed<OnboardingPayload>(() => ({
    services: this.services(),
    bio: this.bio(),
    latitude: this.latitude(),
    longitude: this.longitude(),
    address: this.address_(),
  }));

  constructor(private readonly http: HttpClient) {}

  goTo(step: number): void {
    if (step >= 1 && step <= TOTAL_STEPS) {
      this.currentStep.set(step);
    }
  }

  next(): void {
    this.goTo(this.currentStep() + 1);
  }

  previous(): void {
    this.goTo(this.currentStep() - 1);
  }

  patchServices(value: ServicesAndRates): void {
    this.services.set(value);
  }

  patchBio(value: MagicBio): void {
    this.bio.set(value);
  }

  setLocation(lat: number, lng: number): void {
    this.latitude.set(lat);
    this.longitude.set(lng);
  }

  setAddress(value: string): void {
    this.address_.set(value);
  }

  clearCoordinates(): void {
    this.latitude.set(null);
    this.longitude.set(null);
  }

  generateBio(userNotes: string) {
    this.generatingBio.set(true);
    this.http
      .post<{ bio: string }>('/api/providers/generate-bio', { userNotes })
      .subscribe({
        next: (res) => {
          this.bio.update((prev) => ({ ...prev, generatedBio: res.bio }));
          this.generatingBio.set(false);
        },
        error: () => this.generatingBio.set(false),
      });
  }

  submit() {
    this.submitting.set(true);
    const snap = this.formSnapshot();

    const payload: OnboardingApiPayload = {
      services: Object.entries(SERVICE_KEY_MAP)
        .filter(([key]) => snap.services[key as keyof ServicesAndRates] === true)
        .map(([, value]) => value),
      hourlyRate: snap.services.hourlyRate,
      bio: snap.bio.generatedBio || snap.bio.userNotes,
      latitude: snap.latitude,
      longitude: snap.longitude,
      address: snap.address.trim() || null,
    };

    return this.http
      .post<{ message: string }>('/api/providers/onboarding', payload)
      .pipe(tap({ next: () => this.submitting.set(false), error: () => this.submitting.set(false) }));
  }
}
