import { Component, computed, inject, model, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable, of, switchMap } from 'rxjs';
import { ProviderService, UpdateProfilePayload } from '../../services/provider.service';
import {
  ServiceRateDto,
  ServiceType,
  PricingUnit,
  SERVICE_CARDS,
} from '../wizard/wizard.model';
import { ToastService } from '../../services/toast.service';
import { ProviderLocationBlockComponent } from '../../shared/provider-location-block/provider-location-block.component';
import {
  emptyProviderLocationDraft,
  ProviderLocationDraft,
} from '../../shared/provider-location-block/provider-location-draft.model';
import { ScheduleManagerComponent } from './schedule-manager.component';

const SERVICE_CARD_I18N: Record<
  ServiceType,
  { titleKey: string; descKey: string; rateKey: string }
> = {
  DogWalking: {
    titleKey: 'WIZARD.SERVICE_DOG_WALKING_TITLE',
    descKey: 'WIZARD.SERVICE_DOG_WALKING_DESC',
    rateKey: 'WIZARD.RATE_PER_HOUR',
  },
  PetSitting: {
    titleKey: 'WIZARD.SERVICE_PET_SITTING_TITLE',
    descKey: 'WIZARD.SERVICE_PET_SITTING_DESC',
    rateKey: 'WIZARD.RATE_PER_HOUR',
  },
  Boarding: {
    titleKey: 'WIZARD.SERVICE_BOARDING_TITLE',
    descKey: 'WIZARD.SERVICE_BOARDING_DESC',
    rateKey: 'WIZARD.RATE_PER_NIGHT',
  },
  DropInVisit: {
    titleKey: 'WIZARD.SERVICE_DROP_IN_TITLE',
    descKey: 'WIZARD.SERVICE_DROP_IN_DESC',
    rateKey: 'WIZARD.RATE_PER_VISIT',
  },
};

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [FormsModule, ProviderLocationBlockComponent, ScheduleManagerComponent, TranslatePipe],
  template: `
    @if (loading()) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>{{ 'PROFILE.LOADING_EDIT_PROFILE' | translate }}</p>
      </div>
    } @else if (error()) {
      <div class="error-state">
        <p class="text-start" dir="auto">{{ error() }}</p>
        <button type="button" class="btn btn-primary" (click)="loadProfile()">{{ 'PROFILE.RETRY' | translate }}</button>
      </div>
    } @else {
      <div class="profile-header">
        <h1 class="text-2xl font-bold text-slate-900 text-start w-full" dir="auto">
          {{ 'PROFILE.HELLO' | translate: { name: userName() } }}
          <span class="ms-1" aria-hidden="true">👋</span>
        </h1>
        <p class="mt-1 text-sm text-slate-500 text-start" dir="auto">{{ 'PROFILE.UPDATE_DETAILS' | translate }}</p>
        <span [class]="statusBadgeClass()" dir="auto">
          {{ statusTranslationKey() | translate }}
        </span>
      </div>

      <form class="edit-form" (ngSubmit)="onSubmit()" #profileForm="ngForm">

        <div class="flex flex-col items-center mb-2">
          <button
            type="button"
            class="avatar-ring"
            (click)="fileInput.click()"
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
          <p class="mt-2 text-xs text-start text-slate-500" dir="auto">{{ 'PROFILE.UPLOAD_PHOTO' | translate }}</p>
          <input
            #fileInput
            type="file"
            accept="image/*"
            class="hidden"
            (change)="onImageSelected($event)"
          />
        </div>

        <fieldset class="border-0 p-0 m-0 min-w-0">
          <legend class="field-label mb-1 text-start" dir="auto">{{ 'WIZARD.SERVICES_RATES' | translate }}</legend>
          <p class="mb-3 text-start text-xs text-slate-500" dir="auto">{{ 'WIZARD.WHICH_SERVICES' | translate }}</p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            @for (card of serviceCards; track card.type) {
              <div
                class="cursor-pointer select-none rounded-xl border-2 p-4 transition-all duration-200"
                [class]="isServiceSelected(card.type)
                  ? 'border-primary bg-indigo-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'"
                (click)="toggleServiceCard(card.type)">
                <span class="block text-start text-sm font-semibold text-slate-900" dir="auto">{{ serviceCardKeys(card.type).titleKey | translate }}</span>
                <p class="mt-0.5 text-start text-xs text-slate-500" dir="auto">{{ serviceCardKeys(card.type).descKey | translate }}</p>
                @if (isServiceSelected(card.type)) {
                  <div class="mt-2" (click)="$event.stopPropagation()">
                    <label class="block text-start text-xs font-medium text-slate-600" dir="auto">{{ serviceCardKeys(card.type).rateKey | translate }} (ILS)</label>
                    <input
                      type="number"
                      min="1"
                      dir="auto"
                      class="mt-1 w-full text-start placeholder:text-start rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      [value]="getServiceRate(card.type)"
                      (input)="setServiceRate(card.type, $any($event.target).value, card.pricingUnit)"
                      [attr.placeholder]="'WIZARD.RATE_PLACEHOLDER' | translate"
                    />
                  </div>
                }
              </div>
            }
          </div>
        </fieldset>

        <div class="ai-bio-section">
          <div class="field">
            <label class="field-label text-start block w-full" dir="auto" for="edit-ai-notes">{{ 'PROFILE.TELL_AI' | translate }}</label>
            <textarea
              id="edit-ai-notes"
              rows="2"
              dir="auto"
              class="text-start placeholder:text-start w-full"
              [(ngModel)]="aiNotes"
              name="aiNotes"
              [attr.placeholder]="'PROFILE.AI_PLACEHOLDER' | translate"
            ></textarea>
          </div>
          <button
            type="button"
            class="btn btn-magic"
            [disabled]="!aiNotes.trim() || generatingBio()"
            (click)="onGenerateBio()"
          >
            @if (generatingBio()) {
              <span class="magic-spinner"></span> {{ 'WIZARD.GENERATING' | translate }}
            } @else {
              {{ 'WIZARD.MAGIC_BUTTON' | translate }}
            }
          </button>
        </div>

        <div class="field">
          <label class="field-label text-start block w-full" dir="auto" for="edit-bio">{{ 'WIZARD.YOUR_BIO_LABEL' | translate }}</label>
          <textarea
            id="edit-bio"
            rows="4"
            dir="auto"
            class="text-start placeholder:text-start w-full"
            required
            [(ngModel)]="bio"
            name="bio"
            [attr.placeholder]="'WIZARD.BIO_PLACEHOLDER' | translate"
          ></textarea>
        </div>

        <app-provider-location-block
          [(draft)]="locationDraft"
          [showValidationErrors]="locationValidationTouched()"
        />

        <label class="off-hours-toggle">
          <input
            type="checkbox"
            [checked]="acceptsOffHoursRequests()"
            (change)="acceptsOffHoursRequests.set($any($event.target).checked)"
          />
          <div class="off-hours-content text-start" dir="auto">
            <span class="off-hours-label">{{ 'PROFILE.OFF_HOURS_LABEL' | translate }}</span>
            <span class="off-hours-hint">{{ 'PROFILE.OFF_HOURS_HINT' | translate }}</span>
          </div>
        </label>

        <button
          type="submit"
          class="btn btn-primary btn-submit"
          [disabled]="submitting()"
        >
          {{ submitting() ? ('PROFILE.SAVING' | translate) : ('PROFILE.SAVE_CHANGES' | translate) }}
        </button>
      </form>

      <app-schedule-manager />
    }
  `,
  styleUrl: './edit-profile.component.scss',
})
export class EditProfileComponent implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly serviceCards = SERVICE_CARDS;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly selectedServiceRates = signal<ServiceRateDto[]>([]);
  readonly locationDraft = model<ProviderLocationDraft>(emptyProviderLocationDraft());
  readonly locationValidationTouched = signal(false);
  readonly userName = signal('');
  readonly status = signal('');
  readonly imagePreview = signal<string | null>(null);
  readonly acceptsOffHoursRequests = signal(true);

  selectedImageFile: File | null = null;

  readonly statusBadgeClass = computed(() => {
    const base =
      'mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-start';
    switch (this.status()) {
      case 'Approved':
        return `${base} bg-emerald-100 text-emerald-700`;
      case 'Rejected':
        return `${base} bg-red-100 text-red-700`;
      default:
        return `${base} bg-amber-100 text-amber-700`;
    }
  });

  readonly statusTranslationKey = computed(() => {
    switch (this.status()) {
      case 'Approved':
        return 'PROFILE.STATUS_APPROVED';
      case 'Rejected':
        return 'PROFILE.STATUS_REJECTED';
      default:
        return 'PROFILE.STATUS_PENDING';
    }
  });

  bio = '';
  aiNotes = '';
  readonly generatingBio = signal(false);

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.error.set('');

    this.providerService.getMe().subscribe({
      next: (profile) => {
        if (!profile) {
          this.error.set(this.translate.instant('PROFILE.ERROR_PROVIDER_NOT_FOUND'));
          this.loading.set(false);
          return;
        }
        this.userName.set(profile.userName ?? '');
        this.status.set(profile.status ?? '');
        this.bio = profile.bio ?? '';
        this.imagePreview.set(profile.profileImageUrl ?? null);

        this.selectedServiceRates.set(profile.serviceRates ?? []);

        this.locationDraft.set({
          latitude: profile.latitude ?? null,
          longitude: profile.longitude ?? null,
          addressSearchText: '',
          city: profile.city ?? '',
          street: profile.street ?? '',
          buildingNumber: profile.buildingNumber ?? '',
          apartmentNumber: profile.apartmentNumber ?? '',
        });
        this.locationValidationTouched.set(false);
        this.acceptsOffHoursRequests.set(profile.acceptsOffHoursRequests);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translate.instant('PROFILE.ERROR_LOAD_PROFILE'));
        this.loading.set(false);
      },
    });
  }

  isServiceSelected(type: ServiceType): boolean {
    return this.selectedServiceRates().some(r => r.serviceType === type);
  }

  getServiceRate(type: ServiceType): number | null {
    return this.selectedServiceRates().find(r => r.serviceType === type)?.rate ?? null;
  }

  toggleServiceCard(type: ServiceType): void {
    if (this.isServiceSelected(type)) {
      this.selectedServiceRates.update(list => list.filter(r => r.serviceType !== type));
    } else {
      const card = this.serviceCards.find(c => c.type === type);
      this.selectedServiceRates.update(list => [...list, {
        serviceType: type,
        rate: 0,
        pricingUnit: card?.pricingUnit ?? 'PerHour',
      }]);
    }
  }

  serviceCardKeys(type: ServiceType): { titleKey: string; descKey: string; rateKey: string } {
    return SERVICE_CARD_I18N[type];
  }

  setServiceRate(type: ServiceType, value: string, unit: PricingUnit): void {
    const rate = parseFloat(value) || 0;
    this.selectedServiceRates.update(list =>
      list.map(r => r.serviceType === type ? { ...r, rate, pricingUnit: unit } : r),
    );
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

  onGenerateBio(): void {
    const notes = this.aiNotes.trim();
    if (!notes || this.generatingBio()) return;

    this.generatingBio.set(true);
    this.providerService.generateBio(notes).subscribe({
      next: (res) => {
        this.bio = res.bio;
        this.generatingBio.set(false);
      },
      error: () => {
        this.toast.error(this.translate.instant('PROFILE.TOAST_BIO_FAIL'));
        this.generatingBio.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.submitting()) return;

    const loc = this.locationDraft();
    this.locationValidationTouched.set(true);

    if (!loc.city.trim() || !loc.street.trim() || !loc.buildingNumber.trim()) {
      this.toast.error('Please fill in city, street, and building number.');
      return;
    }
    if (loc.latitude == null || loc.longitude == null) {
      this.toast.error('Please set your location using the map search.');
      return;
    }

    this.submitting.set(true);

    const payload: UpdateProfilePayload = {
      bio: this.bio,
      selectedServices: this.selectedServiceRates(),
      city: loc.city.trim(),
      street: loc.street.trim(),
      buildingNumber: loc.buildingNumber.trim(),
      apartmentNumber: loc.apartmentNumber.trim() || null,
      latitude: loc.latitude,
      longitude: loc.longitude,
      acceptsOffHoursRequests: this.acceptsOffHoursRequests(),
    };

    const upload$: Observable<unknown> = this.selectedImageFile
      ? this.providerService.uploadImage(this.selectedImageFile)
      : of(null);

    upload$.pipe(
      switchMap(() => this.providerService.updateProfile(payload)),
    ).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('PROFILE.TOAST_UPDATE_OK'));
        this.locationValidationTouched.set(false);
        this.submitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.toast.error(this.translate.instant('PROFILE.TOAST_UPDATE_FAIL'));
        this.submitting.set(false);
      },
    });
  }
}
