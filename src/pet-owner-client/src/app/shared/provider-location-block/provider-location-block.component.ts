import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { OSM_TILE_URL, OSM_TILE_OPTIONS } from '../leaflet-defaults';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AddressAutocompleteComponent } from '../address-autocomplete.component';
import { AddressSuggestion, GeocodingService } from '../../services/geocoding.service';
import {
  emptyProviderLocationDraft,
  ProviderLocationDraft,
} from './provider-location-draft.model';

const DEFAULT_LAT = 32.0563;
const DEFAULT_LNG = 34.7668;
const DEFAULT_ZOOM = 13;
const PIN_ZOOM = 16;

@Component({
  selector: 'app-provider-location-block',
  standalone: true,
  imports: [FormsModule, AddressAutocompleteComponent, TranslatePipe],
  templateUrl: './provider-location-block.component.html',
  styleUrl: './provider-location-block.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderLocationBlockComponent implements OnDestroy {
  private readonly geocoding = inject(GeocodingService);
  private readonly translate = inject(TranslateService);

  /** Two-way binding for the full location draft (parent owns persistence). */
  readonly draft = model<ProviderLocationDraft>(emptyProviderLocationDraft());

  /** When true, show inline validation for missing map pin (e.g. after failed save). */
  readonly showValidationErrors = input(false);

  private map: L.Map | undefined;
  private readonly pinLayer = L.layerGroup();

  readonly mapHost = viewChild<ElementRef<HTMLElement>>('mapHost');

  readonly locationMode = signal<'auto' | 'manual'>('auto');
  readonly locating = signal(false);
  readonly locationError = signal('');
  readonly addressFieldsExpanded = signal(false);

  readonly hasPin = computed(() => {
    const d = this.draft();
    return d.latitude !== null && d.longitude !== null;
  });

  readonly hasStructuredAddress = computed(() => {
    const d = this.draft();
    return (
      d.city.trim().length > 0 &&
      d.street.trim().length > 0 &&
      d.buildingNumber.trim().length > 0
    );
  });

  readonly showAddressSummary = computed(
    () =>
      this.hasPin() &&
      this.hasStructuredAddress() &&
      !this.addressFieldsExpanded(),
  );

  readonly showAddressIncompletePrompt = computed(
    () =>
      this.hasPin() &&
      !this.hasStructuredAddress() &&
      !this.addressFieldsExpanded(),
  );

  readonly showAddressGrid = computed(
    () => this.hasPin() && this.addressFieldsExpanded(),
  );

  private readonly onWinResize = (): void => {
    this.map?.invalidateSize();
  };

  constructor() {
    afterNextRender(() => {
      const el = this.mapHost()?.nativeElement;
      if (!el || this.map) {
        return;
      }
      this.initMap(el);
    });

    effect(() => {
      const lat = this.draft().latitude;
      const lng = this.draft().longitude;
      if (!this.map) {
        return;
      }
      if (lat !== null && lng !== null) {
        this.setPin(lat, lng);
      } else {
        this.clearPin();
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWinResize);
    this.map?.remove();
    this.map = undefined;
  }

  patch(p: Partial<ProviderLocationDraft>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }

  switchLocationMode(mode: 'auto' | 'manual'): void {
    this.locationMode.set(mode);
    this.locationError.set('');
    this.addressFieldsExpanded.set(false);
    if (mode === 'manual') {
      this.patch({
        latitude: null,
        longitude: null,
        city: '',
        street: '',
        buildingNumber: '',
      });
    } else {
      this.patch({
        addressSearchText: '',
        city: '',
        street: '',
        buildingNumber: '',
      });
    }
  }

  onSuggestionSelected(suggestion: AddressSuggestion): void {
    const structured = this.structuredFromSuggestion(suggestion);
    this.patch({
      addressSearchText: suggestion.displayName,
      latitude: suggestion.lat,
      longitude: suggestion.lon,
      ...structured,
    });
    this.addressFieldsExpanded.set(false);
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.locationError.set(this.translate.instant('WIZARD.GEO_NOT_SUPPORTED'));
      return;
    }

    this.locating.set(true);
    this.locationError.set('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.patch({ latitude: lat, longitude: lng });
        this.locating.set(false);
        this.geocoding.reverse(lat, lng).subscribe((sug) => {
          if (sug) {
            const structured = this.structuredFromSuggestion(sug);
            this.patch({
              addressSearchText: sug.displayName,
              ...structured,
            });
          }
          this.addressFieldsExpanded.set(false);
        });
      },
      () => {
        this.locationError.set(this.translate.instant('WIZARD.GEO_DENIED'));
        this.locating.set(false);
      },
    );
  }

  private initMap(el: HTMLElement): void {
    const d = this.draft();
    const centerLat = d.latitude ?? DEFAULT_LAT;
    const centerLng = d.longitude ?? DEFAULT_LNG;
    const zoom =
      d.latitude !== null && d.longitude !== null ? PIN_ZOOM : DEFAULT_ZOOM;

    this.map = L.map(el, {
      center: [centerLat, centerLng],
      zoom,
      zoomControl: true,
    });

    L.tileLayer(OSM_TILE_URL, OSM_TILE_OPTIONS).addTo(this.map);

    this.pinLayer.addTo(this.map);
    window.addEventListener('resize', this.onWinResize);

    queueMicrotask(() => {
      this.map?.invalidateSize();
      const lat = this.draft().latitude;
      const lng = this.draft().longitude;
      if (lat !== null && lng !== null) {
        this.setPin(lat, lng);
      }
    });
  }

  private setPin(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }
    this.pinLayer.clearLayers();
    const icon = L.divIcon({
      className: 'wizard-loc-pin',
      html: '<div class="wizard-loc-pin__inner" aria-hidden="true"></div>',
      iconSize: [36, 44],
      iconAnchor: [18, 44],
    });
    L.marker([lat, lng], { icon }).addTo(this.pinLayer);
    this.map.setView([lat, lng], PIN_ZOOM, { animate: true });
  }

  private clearPin(): void {
    this.pinLayer.clearLayers();
  }

  private structuredFromSuggestion(s: AddressSuggestion): Partial<ProviderLocationDraft> {
    let city = s.city?.trim() ?? '';
    let street = s.street?.trim() ?? '';
    let buildingNumber = s.buildingNumber?.trim() ?? '';

    if (!city || !street || !buildingNumber) {
      const fb = this.parseDisplayNameForStructured(s.displayName);
      if (!city && fb.city) city = fb.city;
      if (!street && fb.street) street = fb.street;
      if (!buildingNumber && fb.buildingNumber) buildingNumber = fb.buildingNumber;
    }

    const out: Partial<ProviderLocationDraft> = {};
    if (city) out.city = city;
    if (street) out.street = street;
    if (buildingNumber) out.buildingNumber = buildingNumber;
    return out;
  }

  private parseDisplayNameForStructured(displayName: string): Partial<{
    city: string;
    street: string;
    buildingNumber: string;
  }> {
    const parts = displayName
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) {
      return {};
    }

    const countryHints = /israel|ישראל|palestine/i;
    const tail = parts[parts.length - 1] ?? '';
    const withoutCountry = countryHints.test(tail) ? parts.slice(0, -1) : parts;
    if (withoutCountry.length < 2) {
      return {};
    }

    const city = withoutCountry[withoutCountry.length - 1] ?? '';
    const first = withoutCountry[0] ?? '';

    const leadingNum = first.match(/^(\d+[\w\u0590-\u05FF\-\/]*)\s+(.+)$/u);
    if (leadingNum) {
      return {
        city,
        buildingNumber: leadingNum[1],
        street: leadingNum[2],
      };
    }

    return { city, street: first };
  }
}
