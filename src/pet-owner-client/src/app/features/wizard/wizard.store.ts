import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ProviderOnboardingResponse } from '../../services/provider.service';
import {
  MagicBio,
  OnboardingApiPayload,
  OnboardingPayload,
  ServiceRateDto,
  StructuredAddress,
  TrustVerification,
} from './wizard.model';

export const TOTAL_STEPS = 3;

@Injectable({ providedIn: 'root' })
export class WizardStore {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly currentStep = signal(1);
  private readonly selectedServices = signal<ServiceRateDto[]>([]);
  private readonly bio = signal<MagicBio>({ userNotes: '', generatedBio: '' });
  private readonly latitude = signal<number | null>(null);
  private readonly longitude = signal<number | null>(null);
  private readonly address_ = signal('');
  private readonly structuredAddress_ = signal<StructuredAddress>({
    city: '',
    street: '',
    buildingNumber: '',
    apartmentNumber: '',
  });
  private readonly submitting = signal(false);
  private readonly generatingBio = signal(false);
  private readonly verification_ = signal<TrustVerification>({ referenceName: '', referenceContact: '' });

  readonly step = this.currentStep.asReadonly();
  readonly isSubmitting = this.submitting.asReadonly();
  readonly isGeneratingBio = this.generatingBio.asReadonly();
  readonly progressPercent = computed(() => (this.currentStep() / TOTAL_STEPS) * 100);

  readonly hasLocation = computed(
    () => this.latitude() !== null && this.longitude() !== null,
  );

  /** Map pin coordinates, or null if not set. */
  readonly locationPoint = computed(() => {
    const lat = this.latitude();
    const lng = this.longitude();
    if (lat === null || lng === null) return null;
    return { lat, lng };
  });

  private readonly locationStepTouched_ = signal(false);
  readonly locationStepTouched = this.locationStepTouched_.asReadonly();

  readonly address = this.address_.asReadonly();
  readonly structuredAddress = this.structuredAddress_.asReadonly();
  readonly verification = this.verification_.asReadonly();
  readonly services = this.selectedServices.asReadonly();

  readonly hasStructuredAddress = computed(() => {
    const a = this.structuredAddress_();
    return (
      a.city.trim().length > 0 &&
      a.street.trim().length > 0 &&
      a.buildingNumber.trim().length > 0
    );
  });

  readonly isVerificationValid = computed(() => {
    const v = this.verification_();
    return v.referenceName.trim().length > 0 && v.referenceContact.trim().length > 0;
  });

  readonly canSubmit = computed(
    () => this.hasLocation() && this.hasStructuredAddress() && this.isVerificationValid(),
  );

  readonly formSnapshot = computed<OnboardingPayload>(() => ({
    selectedServices: this.selectedServices(),
    bio: this.bio(),
    latitude: this.latitude(),
    longitude: this.longitude(),
    structuredAddress: this.structuredAddress_(),
    verification: this.verification_(),
  }));

  touchLocationStep(): void {
    this.locationStepTouched_.set(true);
  }

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

  patchServices(value: ServiceRateDto[]): void {
    this.selectedServices.set(value);
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

  patchStructuredAddress(value: Partial<StructuredAddress>): void {
    this.structuredAddress_.update((prev) => ({ ...prev, ...value }));
  }

  clearCoordinates(): void {
    this.latitude.set(null);
    this.longitude.set(null);
  }

  patchVerification(value: Partial<TrustVerification>): void {
    this.verification_.update((prev) => ({ ...prev, ...value }));
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
    const a = snap.structuredAddress;

    const payload: OnboardingApiPayload = {
      selectedServices: snap.selectedServices,
      bio: snap.bio.generatedBio || snap.bio.userNotes,
      latitude: snap.latitude,
      longitude: snap.longitude,
      city: a.city.trim(),
      street: a.street.trim(),
      buildingNumber: a.buildingNumber.trim(),
      apartmentNumber: a.apartmentNumber.trim() || null,
      referenceName: snap.verification.referenceName.trim(),
      referenceContact: snap.verification.referenceContact.trim(),
    };

    return this.http.post<ProviderOnboardingResponse>('/api/providers/onboarding', payload).pipe(
      tap((res) => {
        if (res.newAccessToken) {
          this.auth.updateToken(res.newAccessToken);
        }
      }),
      tap({ next: () => this.submitting.set(false), error: () => this.submitting.set(false) }),
    );
  }
}
