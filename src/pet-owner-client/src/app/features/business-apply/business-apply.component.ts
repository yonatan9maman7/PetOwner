import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as L from 'leaflet';
import confetti from 'canvas-confetti';

import {
  applyMinimalMapAttribution,
  CARTO_VOYAGER_TILE_OPTIONS,
  CARTO_VOYAGER_TILE_URL,
} from '../../shared/leaflet-defaults';
import { AddressAutocompleteComponent } from '../../shared/address-autocomplete.component';
import { GeocodingService, AddressSuggestion } from '../../services/geocoding.service';
import { AuthService } from '../../services/auth.service';
import { ProviderService } from '../../services/provider.service';
import { ToastService } from '../../services/toast.service';
import {
  PRICING_UNIT_INT,
  SERVICE_TYPE_INT,
} from '../wizard/wizard.model';
import { BUSINESS_CATEGORY_CARDS, BusinessCategoryCard } from './business-apply.models';

interface BusinessApplicationPayload {
  type: number;
  businessName: string;
  serviceType: number;
  city: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string | null;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  whatsAppNumber: string | null;
  websiteUrl: string | null;
  openingHours: string | null;
  isEmergencyService: boolean;
  description: string;
  imageUrl: string | null;
  selectedServices: { serviceType: number; rate: number; pricingUnit: number }[];
  referenceName: string | null;
  referenceContact: string | null;
}

interface BusinessApplicationResponse {
  message: string;
  applicationId: string;
}

const DEFAULT_LAT = 32.0563;
const DEFAULT_LNG = 34.7668;
const DEFAULT_ZOOM = 13;
const PIN_ZOOM = 16;
const PHONE_PATTERN = /^[\d+\-\s]{9,22}$/;

const CATEGORY_TO_SERVICE: Record<string, keyof typeof SERVICE_TYPE_INT> = {
  vet: 'DropInVisit',
  shop: 'DropInVisit',
  insurance: 'Insurance',
  pension: 'Boarding',
};

const CATEGORY_TO_PRICING: Record<string, keyof typeof PRICING_UNIT_INT> = {
  vet: 'PerVisit',
  shop: 'PerVisit',
  insurance: 'PerPackage',
  pension: 'PerNight',
};

@Component({
  selector: 'app-business-apply',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, AddressAutocompleteComponent],
  templateUrl: './business-apply.component.html',
  styleUrl: './business-apply.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessApplyComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly geocoding = inject(GeocodingService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly providerService = inject(ProviderService);

  readonly cards = BUSINESS_CATEGORY_CARDS;
  readonly totalSteps = 3;

  readonly step = signal(1);
  readonly submitting = signal(false);
  readonly showSuccessOverlay = signal(false);
  readonly errorMessage = signal('');
  readonly shakingField = signal<string | null>(null);
  readonly addressFieldsExpanded = signal(false);
  readonly logoPreview = signal<string | null>(null);

  private map: L.Map | undefined;
  private readonly pinLayer = L.layerGroup();
  private logoFile: File | null = null;

  readonly mapHost = viewChild<ElementRef<HTMLElement>>('mapHost');

  readonly form = this.fb.nonNullable.group({
    businessName: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', Validators.required],
    addressLine: [''],
    city: ['', Validators.required],
    street: ['', Validators.required],
    buildingNumber: ['', Validators.required],
    apartmentNumber: [''],
    whatsapp: [''],
    website: [''],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    openingHours: [''],
  });

  readonly lat = signal<number | null>(null);
  readonly lng = signal<number | null>(null);

  readonly businessNameDisplay = signal('');

  readonly selectedCard = computed((): BusinessCategoryCard | undefined => {
    const id = this.form.controls.categoryId.value;
    return this.cards.find((c) => c.id === id);
  });

  readonly hasPin = computed(() => this.lat() !== null && this.lng() !== null);

  readonly hasStructuredAddress = computed(() => {
    const v = this.form.getRawValue();
    return (
      v.city.trim().length > 0 &&
      v.street.trim().length > 0 &&
      v.buildingNumber.trim().length > 0
    );
  });

  readonly step1Valid = computed(() => {
    const c = this.form.controls;
    return c.businessName.valid && c.categoryId.valid;
  });

  readonly step2Valid = computed(() => this.hasPin() && this.hasStructuredAddress());

  readonly step3Valid = computed(() => this.form.controls.phone.valid);

  readonly allStepsValid = computed(
    () => this.step1Valid() && this.step2Valid() && this.step3Valid(),
  );

  private readonly onWinResize = (): void => {
    this.map?.invalidateSize();
  };

  constructor() {
    this.form.controls.businessName.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.businessNameDisplay.set((v ?? '').trim()));

    this.form.controls.addressLine.valueChanges
      .pipe(debounceTime(450), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => {
        const query = (q ?? '').trim();
        if (query.length < 3) return;
        this.geocoding.search(query).subscribe((results) => {
          const first = results[0];
          if (!first) return;
          this.lat.set(first.lat);
          this.lng.set(first.lon);
          this.applyStructuredFromSuggestion(first);
          this.refreshPin();
        });
      });

    effect(() => {
      if (this.step() !== 2) return;
      setTimeout(() => {
        const el = this.mapHost()?.nativeElement;
        if (el && !this.map) {
          this.initMap(el);
        } else {
          this.map?.invalidateSize();
          this.refreshPin();
        }
      }, 0);
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWinResize);
    this.map?.remove();
    this.map = undefined;
  }

  selectCategory(card: BusinessCategoryCard): void {
    this.form.controls.categoryId.setValue(card.id);
    this.form.controls.categoryId.markAsTouched();
  }

  onAddressSuggestion(s: AddressSuggestion): void {
    this.form.controls.addressLine.setValue(s.displayName);
    this.lat.set(s.lat);
    this.lng.set(s.lon);
    this.applyStructuredFromSuggestion(s);
    this.addressFieldsExpanded.set(false);
    this.refreshPin();
  }

  onFieldBlur(field: string): void {
    const control = this.form.get(field);
    if (control?.invalid && control.touched) {
      this.shakingField.set(field);
      setTimeout(() => this.shakingField.set(null), 500);
    }
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = () => this.logoPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  goNext(): void {
    this.errorMessage.set('');
    this.markCurrentStepTouched();
    if (this.step() === 1 && !this.step1Valid()) {
      this.errorMessage.set(this.translate.instant('BUSINESS_APPLY.ERROR_STEP'));
      return;
    }
    if (this.step() === 2 && !this.step2Valid()) {
      this.errorMessage.set(this.translate.instant('BUSINESS_APPLY.ERROR_LOCATION'));
      return;
    }
    if (this.step() < this.totalSteps) {
      this.step.update((s) => s + 1);
    }
  }

  goBack(): void {
    this.errorMessage.set('');
    if (this.step() > 1) {
      this.step.update((s) => s - 1);
    }
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    if (this.step() !== this.totalSteps) return;
    this.submit();
  }

  goToStep(n: number): void {
    if (n < 1 || n > this.totalSteps || n > this.step()) return;
    this.errorMessage.set('');
    this.step.set(n);
  }

  submit(): void {
    this.errorMessage.set('');
    this.form.markAllAsTouched();
    if (!this.allStepsValid() || !this.hasPin()) {
      this.errorMessage.set(this.translate.instant('BUSINESS_APPLY.ERROR_SUBMIT'));
      return;
    }

    const card = this.selectedCard();
    if (!card) return;

    const raw = this.form.getRawValue();
    const serviceType = CATEGORY_TO_SERVICE[card.id] ?? 'DropInVisit';
    const pricingUnit = CATEGORY_TO_PRICING[card.id] ?? 'PerVisit';

    const payload: BusinessApplicationPayload = {
      type: 1,
      businessName: raw.businessName.trim(),
      serviceType: SERVICE_TYPE_INT[serviceType],
      city: raw.city.trim(),
      street: raw.street.trim(),
      buildingNumber: raw.buildingNumber.trim(),
      apartmentNumber: raw.apartmentNumber.trim() || null,
      latitude: this.lat()!,
      longitude: this.lng()!,
      phoneNumber: raw.phone.trim(),
      whatsAppNumber: raw.whatsapp?.trim() || null,
      websiteUrl: raw.website?.trim() || null,
      openingHours: raw.openingHours?.trim() || null,
      isEmergencyService: false,
      description: raw.businessName.trim(),
      imageUrl: null,
      selectedServices: [
        {
          serviceType: SERVICE_TYPE_INT[serviceType],
          rate: 0,
          pricingUnit: PRICING_UNIT_INT[pricingUnit],
        },
      ],
      referenceName: raw.businessName.trim(),
      referenceContact: raw.phone.trim(),
    };

    this.submitting.set(true);

    this.http
      .post<BusinessApplicationResponse>('/api/providers/apply', payload)
      .pipe(
        switchMap(() => {
          if (!this.logoFile) return of(null);
          return this.providerService.uploadImage(this.logoFile).pipe(
            catchError(() => of(null)),
          );
        }),
        catchError(() => {
          this.submitting.set(false);
          this.errorMessage.set(this.translate.instant('BUSINESS_APPLY.ERROR_SUBMIT_FAILED'));
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.submitting.set(false);
        this.providerService.providerStatus.set('Pending');
        this.celebrate();
        this.showSuccessOverlay.set(true);
        this.toast.success(this.translate.instant('BUSINESS_APPLY.TOAST_SUBMITTED'));
        setTimeout(() => {
          this.showSuccessOverlay.set(false);
          void this.router.navigateByUrl('/provider-dashboard');
        }, 2000);
      });
  }

  toggleAddressDetails(): void {
    this.addressFieldsExpanded.update((v) => !v);
  }

  private markCurrentStepTouched(): void {
    if (this.step() === 1) {
      this.form.controls.businessName.markAsTouched();
      this.form.controls.categoryId.markAsTouched();
    }
    if (this.step() === 2) {
      this.form.controls.addressLine.markAsTouched();
      this.form.controls.city.markAsTouched();
      this.form.controls.street.markAsTouched();
      this.form.controls.buildingNumber.markAsTouched();
    }
    if (this.step() === 3) {
      this.form.controls.phone.markAsTouched();
    }
  }

  private celebrate(): void {
    confetti({
      particleCount: 140,
      spread: 85,
      origin: { y: 0.55 },
      colors: ['#10b981', '#34d399', '#6ee7b7', '#7c3aed', '#fbbf24'],
    });
  }

  private initMap(el: HTMLElement): void {
    this.map = L.map(el, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });
    applyMinimalMapAttribution(this.map);
    L.tileLayer(CARTO_VOYAGER_TILE_URL, CARTO_VOYAGER_TILE_OPTIONS).addTo(this.map);
    this.pinLayer.addTo(this.map);
    window.addEventListener('resize', this.onWinResize);
    queueMicrotask(() => {
      this.map?.invalidateSize();
      this.refreshPin();
    });
  }

  private refreshPin(): void {
    const lat = this.lat();
    const lng = this.lng();
    if (!this.map) return;
    this.pinLayer.clearLayers();
    if (lat === null || lng === null) return;
    const icon = L.divIcon({
      className: 'business-apply-pin',
      html: '<div class="business-apply-pin__inner" aria-hidden="true"></div>',
      iconSize: [36, 44],
      iconAnchor: [18, 44],
    });
    L.marker([lat, lng], { icon }).addTo(this.pinLayer);
    this.map.setView([lat, lng], PIN_ZOOM, { animate: true });
  }

  private applyStructuredFromSuggestion(s: AddressSuggestion): void {
    let city = s.city?.trim() ?? '';
    let street = s.street?.trim() ?? '';
    let buildingNumber = s.buildingNumber?.trim() ?? '';

    if (!city || !street || !buildingNumber) {
      const fb = this.parseDisplayNameForStructured(s.displayName);
      if (!city && fb.city) city = fb.city;
      if (!street && fb.street) street = fb.street;
      if (!buildingNumber && fb.buildingNumber) buildingNumber = fb.buildingNumber;
    }

    this.form.patchValue(
      {
        city: city || this.form.controls.city.value,
        street: street || this.form.controls.street.value,
        buildingNumber: buildingNumber || this.form.controls.buildingNumber.value,
      },
      { emitEvent: false },
    );
  }

  private parseDisplayNameForStructured(displayName: string): Partial<{
    city: string;
    street: string;
    buildingNumber: string;
  }> {
    const parts = displayName.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return {};

    const countryHints = /israel|ישראל|palestine/i;
    const tail = parts[parts.length - 1] ?? '';
    const withoutCountry = countryHints.test(tail) ? parts.slice(0, -1) : parts;
    if (withoutCountry.length < 2) return {};

    const city = withoutCountry[withoutCountry.length - 1] ?? '';
    const first = withoutCountry[0] ?? '';

    const leadingNum = first.match(/^(\d+[\w\u0590-\u05FF\-\/]*)\s+(.+)$/u);
    if (leadingNum) {
      return { city, buildingNumber: leadingNum[1], street: leadingNum[2] };
    }
    return { city, street: first };
  }
}
