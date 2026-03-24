import {
  afterNextRender,
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
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { OSM_TILE_URL, OSM_TILE_OPTIONS } from '../../shared/leaflet-defaults';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { WizardStore } from './wizard.store';
import { AddressAutocompleteComponent } from '../../shared/address-autocomplete.component';
import { AddressSuggestion, GeocodingService } from '../../services/geocoding.service';

const DEFAULT_LAT = 32.0563;
const DEFAULT_LNG = 34.7668;
const DEFAULT_ZOOM = 13;
const PIN_ZOOM = 16;

@Component({
  selector: 'app-wizard-location-panel',
  standalone: true,
  imports: [FormsModule, AddressAutocompleteComponent, TranslatePipe],
  templateUrl: './wizard-location-panel.component.html',
  styleUrl: './wizard-location-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardLocationPanelComponent implements OnDestroy {
  readonly store = inject(WizardStore);
  private readonly geocoding = inject(GeocodingService);
  private readonly translate = inject(TranslateService);

  private map: L.Map | undefined;
  private readonly pinLayer = L.layerGroup();

  readonly mapHost = viewChild<ElementRef<HTMLElement>>('mapHost');

  readonly locationMode = signal<'auto' | 'manual'>('auto');
  readonly locating = signal(false);
  readonly locationError = signal('');

  /** When true, show city/street/building grid (edit mode — not shown until user opens it). */
  readonly addressFieldsExpanded = signal(false);

  readonly showAddressSummary = computed(
    () =>
      this.store.hasLocation() &&
      this.store.hasStructuredAddress() &&
      !this.addressFieldsExpanded(),
  );

  /** Pin set but city/street/building still missing — prompt only, no big inputs until user taps CTA. */
  readonly showAddressIncompletePrompt = computed(
    () =>
      this.store.hasLocation() &&
      !this.store.hasStructuredAddress() &&
      !this.addressFieldsExpanded(),
  );

  readonly showAddressGrid = computed(
    () => this.store.hasLocation() && this.addressFieldsExpanded(),
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
      const pt = this.store.locationPoint();
      if (!this.map) {
        return;
      }
      if (pt) {
        this.setPin(pt.lat, pt.lng);
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

  switchLocationMode(mode: 'auto' | 'manual'): void {
    this.locationMode.set(mode);
    this.locationError.set('');
    this.addressFieldsExpanded.set(false);
    if (mode === 'manual') {
      this.store.clearCoordinates();
      this.clearPin();
      this.store.patchStructuredAddress({ city: '', street: '', buildingNumber: '' });
    } else {
      this.store.setAddress('');
      this.store.patchStructuredAddress({ city: '', street: '', buildingNumber: '' });
    }
  }

  onAddressChange(value: string): void {
    this.store.setAddress(value);
  }

  onSuggestionSelected(suggestion: AddressSuggestion): void {
    this.store.setAddress(suggestion.displayName);
    this.store.setLocation(suggestion.lat, suggestion.lon);
    const structured = this.structuredFromSuggestion(suggestion);
    if (Object.keys(structured).length > 0) {
      this.store.patchStructuredAddress(structured);
    }
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
        this.store.setLocation(lat, lng);
        this.locating.set(false);
        this.geocoding.reverse(lat, lng).subscribe((sug) => {
          if (sug) {
            this.store.setAddress(sug.displayName);
            const structured = this.structuredFromSuggestion(sug);
            if (Object.keys(structured).length > 0) {
              this.store.patchStructuredAddress(structured);
            }
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
    this.map = L.map(el, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer(OSM_TILE_URL, OSM_TILE_OPTIONS).addTo(this.map);

    this.pinLayer.addTo(this.map);
    window.addEventListener('resize', this.onWinResize);

    queueMicrotask(() => {
      this.map?.invalidateSize();
      const pt = this.store.locationPoint();
      if (pt) {
        this.setPin(pt.lat, pt.lng);
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

  private structuredFromSuggestion(s: AddressSuggestion): Partial<{
    city: string;
    street: string;
    buildingNumber: string;
  }> {
    let city = s.city?.trim() ?? '';
    let street = s.street?.trim() ?? '';
    let buildingNumber = s.buildingNumber?.trim() ?? '';

    if (!city || !street || !buildingNumber) {
      const fb = this.parseDisplayNameForStructured(s.displayName);
      if (!city && fb.city) city = fb.city;
      if (!street && fb.street) street = fb.street;
      if (!buildingNumber && fb.buildingNumber) buildingNumber = fb.buildingNumber;
    }

    const out: Partial<{ city: string; street: string; buildingNumber: string }> = {};
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
