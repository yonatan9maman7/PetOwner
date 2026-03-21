import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import {
  ProviderService,
  ProviderProfile,
  UpdateProfilePayload,
} from '../../services/provider.service';
import { ToastService } from '../../services/toast.service';
import { AddressAutocompleteComponent } from '../../shared/address-autocomplete.component';
import { AddressSuggestion } from '../../services/geocoding.service';
import { ScheduleManagerComponent } from './schedule-manager.component';

const SERVICE_OPTIONS = [
  { key: 'DogWalker', label: 'Dog Walker' },
  { key: 'PetSitter', label: 'Pet Provider' },
  { key: 'Boarding', label: 'Boarding' },
] as const;

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [FormsModule, AddressAutocompleteComponent, ScheduleManagerComponent],
  template: `
    @if (loading()) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading your profile...</p>
      </div>
    } @else if (error()) {
      <div class="error-state">
        <p>{{ error() }}</p>
        <button class="btn btn-primary" (click)="loadProfile()">Retry</button>
      </div>
    } @else {
      <div class="profile-header">
        <h1 class="text-2xl font-bold text-slate-900">
          Hello, {{ userName() }}! 👋
        </h1>
        <p class="mt-1 text-sm text-slate-500">Update your provider profile details.</p>
        <span [class]="statusBadgeClass()">
          {{ status() }}
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
          <p class="mt-2 text-xs text-slate-500">Click to upload photo</p>
          <input
            #fileInput
            type="file"
            accept="image/*"
            class="hidden"
            (change)="onImageSelected($event)"
          />
        </div>

        <fieldset class="checkbox-group">
          <legend class="field-label">Services</legend>
          @for (svc of serviceOptions; track svc.key) {
            <label class="checkbox">
              <input
                type="checkbox"
                [checked]="selectedServices().includes(svc.key)"
                (change)="toggleService(svc.key)"
              />
              {{ svc.label }}
            </label>
          }
        </fieldset>

        <div class="field">
          <label class="field-label" for="edit-rate">Hourly Rate (ILS)</label>
          <input
            id="edit-rate"
            type="number"
            min="1"
            required
            [(ngModel)]="hourlyRate"
            name="hourlyRate"
            placeholder="e.g. 60"
          />
        </div>

        <div class="ai-bio-section">
          <div class="field">
            <label class="field-label" for="edit-ai-notes">Tell the AI about your experience</label>
            <textarea
              id="edit-ai-notes"
              rows="2"
              [(ngModel)]="aiNotes"
              name="aiNotes"
              placeholder="e.g. 10 years with dogs, energetic, love cats, certified pet first-aid"
            ></textarea>
          </div>
          <button
            type="button"
            class="btn btn-magic"
            [disabled]="!aiNotes.trim() || generatingBio()"
            (click)="onGenerateBio()"
          >
            @if (generatingBio()) {
              <span class="magic-spinner"></span> Generating...
            } @else {
              ✨ Magic AI Bio
            }
          </button>
        </div>

        <div class="field">
          <label class="field-label" for="edit-bio">Bio</label>
          <textarea
            id="edit-bio"
            rows="4"
            required
            [(ngModel)]="bio"
            name="bio"
            placeholder="Tell pet owners about yourself..."
          ></textarea>
        </div>

        <div class="field">
          <label class="field-label">Search map location</label>
          <p class="text-xs text-slate-500 mb-1">Pick a suggestion to set your map pin (latitude / longitude).</p>
          <app-address-autocomplete
            [(ngModel)]="geoSearchQuery"
            name="geoSearchQuery"
            (suggestionSelected)="onSuggestionSelected($event)"
          />
          @if (latitude() !== null && longitude() !== null) {
            <p class="location-confirmation">Map pin set ✓</p>
          }
        </div>

        <div class="field">
          <label class="field-label" for="edit-city">City <span class="text-red-500">*</span></label>
          <input
            id="edit-city"
            type="text"
            required
            [(ngModel)]="city"
            name="city"
            placeholder="e.g. Tel Aviv"
          />
        </div>
        <div class="field">
          <label class="field-label" for="edit-street">Street <span class="text-red-500">*</span></label>
          <input
            id="edit-street"
            type="text"
            required
            [(ngModel)]="street"
            name="street"
          />
        </div>
        <div class="field">
          <label class="field-label" for="edit-building">Building number <span class="text-red-500">*</span></label>
          <input
            id="edit-building"
            type="text"
            required
            [(ngModel)]="buildingNumber"
            name="buildingNumber"
          />
        </div>
        <div class="field">
          <label class="field-label" for="edit-apt">Apartment (optional)</label>
          <input
            id="edit-apt"
            type="text"
            [(ngModel)]="apartmentNumber"
            name="apartmentNumber"
          />
        </div>

        <label class="off-hours-toggle">
          <input
            type="checkbox"
            [checked]="acceptsOffHoursRequests()"
            (change)="acceptsOffHoursRequests.set($any($event.target).checked)"
          />
          <div class="off-hours-content">
            <span class="off-hours-label">Accept off-hours requests</span>
            <span class="off-hours-hint">Pet owners can send you flexible requests outside your scheduled availability</span>
          </div>
        </label>

        <button
          type="submit"
          class="btn btn-primary btn-submit"
          [disabled]="submitting()"
        >
          {{ submitting() ? 'Saving...' : 'Save Changes' }}
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

  readonly serviceOptions = SERVICE_OPTIONS;

  private static readonly SERVICE_NAME_TO_KEY: Record<string, string> = {
    'Dog Walker': 'DogWalker',
    'Pet Sitter': 'PetSitter',
    'Boarding': 'Boarding',
  };

  readonly loading = signal(true);
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly selectedServices = signal<string[]>([]);
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);
  readonly userName = signal('');
  readonly status = signal('');
  readonly imagePreview = signal<string | null>(null);
  readonly acceptsOffHoursRequests = signal(true);

  selectedImageFile: File | null = null;

  readonly statusBadgeClass = computed(() => {
    const base = 'mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold';
    switch (this.status()) {
      case 'Approved':
        return `${base} bg-emerald-100 text-emerald-700`;
      case 'Rejected':
        return `${base} bg-red-100 text-red-700`;
      default:
        return `${base} bg-amber-100 text-amber-700`;
    }
  });

  bio = '';
  hourlyRate: number | null = null;
  geoSearchQuery = '';
  city = '';
  street = '';
  buildingNumber = '';
  apartmentNumber = '';
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
        if (!profile) { this.error.set('Provider profile not found.'); this.loading.set(false); return; }
        this.userName.set(profile.userName ?? '');
        this.status.set(profile.status ?? '');
        this.bio = profile.bio ?? '';
        this.hourlyRate = profile.hourlyRate;
        this.imagePreview.set(profile.profileImageUrl ?? null);

        const keys = (profile.services ?? [])
          .map((name) => EditProfileComponent.SERVICE_NAME_TO_KEY[name] ?? name)
          .filter(Boolean);
        this.selectedServices.set(keys);

        this.city = profile.city ?? '';
        this.street = profile.street ?? '';
        this.buildingNumber = profile.buildingNumber ?? '';
        this.apartmentNumber = profile.apartmentNumber ?? '';
        this.geoSearchQuery = '';
        this.latitude.set(profile.latitude ?? null);
        this.longitude.set(profile.longitude ?? null);
        this.acceptsOffHoursRequests.set(profile.acceptsOffHoursRequests);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load profile. Please try again.');
        this.loading.set(false);
      },
    });
  }

  toggleService(key: string): void {
    this.selectedServices.update((list) =>
      list.includes(key) ? list.filter((s) => s !== key) : [...list, key],
    );
  }

  onSuggestionSelected(suggestion: AddressSuggestion): void {
    this.geoSearchQuery = suggestion.displayName;
    this.latitude.set(suggestion.lat);
    this.longitude.set(suggestion.lon);
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
        this.toast.error('Failed to generate bio. Please try again.');
        this.generatingBio.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.submitting()) return;

    if (!this.city.trim() || !this.street.trim() || !this.buildingNumber.trim()) {
      this.toast.error('Please fill in city, street, and building number.');
      return;
    }
    if (this.latitude() == null || this.longitude() == null) {
      this.toast.error('Please set your location using the map search.');
      return;
    }

    this.submitting.set(true);

    const payload: UpdateProfilePayload = {
      bio: this.bio,
      hourlyRate: this.hourlyRate,
      services: this.selectedServices(),
      city: this.city.trim(),
      street: this.street.trim(),
      buildingNumber: this.buildingNumber.trim(),
      apartmentNumber: this.apartmentNumber.trim() || null,
      latitude: this.latitude(),
      longitude: this.longitude(),
      acceptsOffHoursRequests: this.acceptsOffHoursRequests(),
    };

    const upload$: Observable<unknown> = this.selectedImageFile
      ? this.providerService.uploadImage(this.selectedImageFile)
      : of(null);

    upload$.pipe(
      switchMap(() => this.providerService.updateProfile(payload)),
    ).subscribe({
      next: () => {
        this.toast.success('Profile updated successfully!');
        this.submitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.toast.error('Failed to update profile. Please try again.');
        this.submitting.set(false);
      },
    });
  }
}
