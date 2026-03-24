import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { OSM_TILE_URL, OSM_TILE_OPTIONS } from '../../shared/leaflet-defaults';
import { MapService, MapSearchFilters } from '../../services/map.service';
import { ProviderService } from '../../services/provider.service';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';
import { ReviewService, ProviderReview } from '../../services/review.service';
import { MapPin } from '../../models/map-pin.model';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FavoriteService } from '../../services/favorite.service';
import { BookingModalComponent, BookingModalInput } from '../../shared/booking-modal/booking-modal.component';

const FLORENTIN_LAT = 32.0563;
const FLORENTIN_LNG = 34.7668;
const DEFAULT_ZOOM = 15;

@Component({
  selector: 'app-map-dashboard',
  standalone: true,
  imports: [CommonModule, TranslatePipe, BookingModalComponent],
  templateUrl: './map-dashboard.component.html',
  styleUrl: './map-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chipsContainer') chipsContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('mapHost') mapHost!: ElementRef<HTMLElement>;

  private readonly mapService = inject(MapService);
  readonly providerService = inject(ProviderService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly reviewService = inject(ReviewService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  readonly favoriteService = inject(FavoriteService);
  private readonly translate = inject(TranslateService);

  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());
  readonly isAdmin = computed(() => this.auth.userRole() === 'Admin');

  private map!: L.Map;
  private markersLayer = L.layerGroup();
  private mapResizeObserver?: ResizeObserver;
  private userLat: number | null = null;
  private userLng: number | null = null;

  providers = signal<MapPin[]>([]);
  selectedPin = signal<MapPin | null>(null);
  isSheetOpen = signal(false);
  isLoadingPins = signal(false);
  contactLoading = signal(false);

  isApprovedProvider = signal(false);
  isPendingProvider = signal(false);
  isAvailable = signal(false);
  togglingAvailability = signal(false);

  isBookingModalOpen = signal(false);
  bookingModalData = signal<BookingModalInput | null>(null);
  bookingModalLoading = signal(false);

  providerReviews = signal<ProviderReview[]>([]);
  loadingReviews = signal(false);
  revokingProvider = signal(false);

  // Filters
  filterDate = signal('');
  filterTime = signal('');
  filterServiceType = signal('');
  filterMinRating = signal<number | null>(null);
  filterMaxRate = signal<number | null>(null);
  filterRadiusKm = signal<number | null>(null);
  showFilterPanel = signal(false);
  searchQuery = signal('');
  selectedCategory = signal('');
  readonly categories = [
    { labelKey: 'MAP.FILTER_WALKERS', icon: '🚶', value: 'Dog Walker' },
    { labelKey: 'MAP.FILTER_PROVIDERS', icon: '🏠', value: 'Pet Sitter' },
    { labelKey: 'MAP.FILTER_BOARDING', icon: '🛏️', value: 'Boarding' },
    { labelKey: 'MAP.FILTER_TRAINERS', icon: '🦮', value: 'Training' },
    { labelKey: 'MAP.FILTER_INSURANCE', icon: '🛡️', value: 'Insurance' },
    { labelKey: 'MAP.FILTER_VETS', icon: '🩺', value: 'Vet' },
    { labelKey: 'MAP.FILTER_GROOMERS', icon: '✂️', value: 'Groomer' },
    { labelKey: 'MAP.FILTER_SHOPS', icon: '🛒', value: 'Shop' },
    { labelKey: 'MAP.FILTER_PARKS', icon: '🌳', value: 'Park' },
  ];
  serviceTypes = signal<string[]>([]);
  isFilterActive = computed(() =>
    !!this.filterDate() || !!this.filterTime() ||
    !!this.filterServiceType() || this.filterMinRating() !== null ||
    this.filterMaxRate() !== null || this.filterRadiusKm() !== null
  );
  activeFilterCount = computed(() => {
    let count = 0;
    if (this.filterDate() && this.filterTime()) count++;
    if (this.filterServiceType()) count++;
    if (this.filterMinRating() !== null) count++;
    if (this.filterMaxRate() !== null) count++;
    if (this.filterRadiusKm() !== null) count++;
    return count;
  });

  ngOnInit(): void {
    this.initMap();
    this.locateUser();
    this.checkProviderStatus();
    this.mapService.getServiceTypes().subscribe({
      next: (types) => this.serviceTypes.set(types),
    });
  }

  ngAfterViewInit(): void {
    const host = this.mapHost?.nativeElement;
    if (host && this.map) {
      this.mapResizeObserver = new ResizeObserver(() => {
        this.map?.invalidateSize({ animate: false });
      });
      this.mapResizeObserver.observe(host);
    }
    queueMicrotask(() => this.map?.invalidateSize({ animate: false }));
  }

  ngOnDestroy(): void {
    this.mapResizeObserver?.disconnect();
    this.mapResizeObserver = undefined;
    this.map?.remove();
  }

  closeSheet(): void {
    this.isSheetOpen.set(false);
    this.selectedPin.set(null);
    this.providerReviews.set([]);
  }

  toggleAvailability(): void {
    const newValue = !this.isAvailable();
    this.togglingAvailability.set(true);

    this.providerService.updateAvailability(newValue).subscribe({
      next: (res) => {
        this.isAvailable.set(res.isAvailableNow);
        this.togglingAvailability.set(false);
        this.toast.success(res.isAvailableNow ? 'You are now visible on the map!' : 'You are now offline.');
      },
      error: () => {
        this.togglingAvailability.set(false);
      },
    });
  }

  openBookingModal(): void {
    const pin = this.selectedPin();
    if (!pin) return;

    if (!this.auth.isLoggedIn()) {
      this.toast.error(this.translate.instant('BOOKING.LOGIN_REQUIRED'));
      return;
    }

    this.bookingModalLoading.set(true);

    this.mapService.getProviderProfile(pin.providerId).subscribe({
      next: (profile) => {
        this.bookingModalData.set({
          providerId: profile.providerId,
          providerName: profile.name,
          serviceRates: profile.serviceRates,
        });
        this.bookingModalLoading.set(false);
        this.isBookingModalOpen.set(true);
      },
      error: () => {
        this.bookingModalLoading.set(false);
        this.toast.error(this.translate.instant('PROVIDER_PROFILE.NOT_FOUND'));
      },
    });
  }

  closeBookingModal(): void {
    this.isBookingModalOpen.set(false);
  }

  onBookingSuccess(): void {
    this.isBookingModalOpen.set(false);
    this.closeSheet();
    this.toast.success(this.translate.instant('BOOKING.SUCCESS'));
  }

  private checkProviderStatus(): void {
    if (!this.auth.isLoggedIn()) return;
    if (this.auth.userRole() !== 'Provider') return;

    this.providerService.getMe().subscribe({
      next: (profile) => {
        if (!profile) return;
        if (profile.status === 'Approved') {
          this.isApprovedProvider.set(true);
          this.isAvailable.set(profile.isAvailableNow);
        } else if (profile.status === 'Pending') {
          this.isPendingProvider.set(true);
        }
      },
      error: () => {
        this.isApprovedProvider.set(false);
      },
    });
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [FLORENTIN_LAT, FLORENTIN_LNG],
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });

    L.tileLayer(OSM_TILE_URL, OSM_TILE_OPTIONS).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    this.markersLayer.addTo(this.map);

    // Tile layer + controls size to the container; defer until layout/padding are applied.
    setTimeout(() => this.map.invalidateSize({ animate: false }), 0);
  }

  private locateUser(): void {
    if (!navigator.geolocation) {
      this.loadPins();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.userLat = latitude;
        this.userLng = longitude;
        this.map.setView([latitude, longitude], DEFAULT_ZOOM);
        this.loadPins();
      },
      () => {
        this.loadPins();
      }
    );
  }

  applyFilter(): void {
    this.loadPins();
    this.showFilterPanel.set(false);
  }

  clearFilter(): void {
    this.filterDate.set('');
    this.filterTime.set('');
    this.filterServiceType.set('');
    this.filterMinRating.set(null);
    this.filterMaxRate.set(null);
    this.filterRadiusKm.set(null);
    this.selectedCategory.set('');
    this.searchQuery.set('');
    this.loadPins();
  }

  toggleFilterPanel(): void {
    this.showFilterPanel.update(v => !v);
  }

  /** Scroll chip strip toward inline-start or inline-end (respects RTL). */
  scrollChips(towardStart: boolean): void {
    const container = this.chipsContainer?.nativeElement;
    if (!container) return;
    const scrollAmount = 200;
    const rtl = getComputedStyle(container).direction === 'rtl';
    const delta = towardStart
      ? (rtl ? scrollAmount : -scrollAmount)
      : (rtl ? -scrollAmount : scrollAmount);
    container.scrollBy({ left: delta, behavior: 'smooth' });
  }

  selectCategory(value: string): void {
    const next = this.selectedCategory() === value ? '' : value;
    this.selectedCategory.set(next);
    this.filterServiceType.set(next);
    this.loadPins();
  }

  onSearch(term: string): void {
    this.searchQuery.set(term);
    this.loadPins();
  }

  redirectToLogin(): void {
    this.router.navigate(['/login']);
  }

  setMinRating(val: string): void {
    this.filterMinRating.set(val ? parseFloat(val) : null);
  }

  setMinRatingAndApply(val: number | null): void {
    this.filterMinRating.set(val);
    this.loadPins();
  }

  setMaxRate(val: string): void {
    this.filterMaxRate.set(val ? parseFloat(val) : null);
  }

  setRadiusKm(val: string): void {
    this.filterRadiusKm.set(val ? parseFloat(val) : null);
  }

  toggleFavorite(providerId: string): void {
    if (!this.auth.isLoggedIn()) return;
    this.favoriteService.toggle(providerId).subscribe();
  }

  viewProviderProfile(providerId: string): void {
    this.router.navigate(['/provider', providerId]);
  }

  revokeSitter(providerId: string): void {
    if (!confirm('Are you sure you want to revoke this user\'s provider status? This action cannot be easily undone.')) {
      return;
    }

    this.revokingProvider.set(true);

    this.adminService.revokeSitterStatus(providerId).subscribe({
      next: (res) => {
        this.revokingProvider.set(false);
        this.toast.success(res.message);
        this.closeSheet();
        this.loadPins();
      },
      error: () => {
        this.revokingProvider.set(false);
        this.toast.error('Failed to revoke provider status.');
      },
    });
  }

  private loadPins(): void {
    this.isLoadingPins.set(true);

    const filters: MapSearchFilters = {};
    const date = this.filterDate();
    const time = this.filterTime();
    if (date && time) filters.requestedTime = `${date}T${time}:00`;
    if (this.filterServiceType()) filters.serviceType = this.filterServiceType();
    if (this.filterMinRating() !== null) filters.minRating = this.filterMinRating()!;
    if (this.filterMaxRate() !== null) filters.maxRate = this.filterMaxRate()!;
    if (this.filterRadiusKm() !== null && this.userLat !== null && this.userLng !== null) {
      filters.radiusKm = this.filterRadiusKm()!;
      filters.latitude = this.userLat;
      filters.longitude = this.userLng;
    }
    if (this.searchQuery()) filters.searchTerm = this.searchQuery();

    this.mapService.fetchPins(filters).subscribe({
      next: (pins) => {
        this.providers.set(pins);
        this.renderMarkers(pins);
        this.isLoadingPins.set(false);
      },
      error: () => {
        this.isLoadingPins.set(false);
      },
    });
  }

  private loadProviderReviews(providerId: string): void {
    this.loadingReviews.set(true);
    this.providerReviews.set([]);

    this.reviewService.getByProvider(providerId).subscribe({
      next: (reviews) => {
        this.providerReviews.set(reviews);
        this.loadingReviews.set(false);
      },
      error: () => {
        this.loadingReviews.set(false);
      },
    });
  }

  private renderMarkers(pins: MapPin[]): void {
    this.markersLayer.clearLayers();

    const pawIcon = L.divIcon({
      className: 'paw-marker',
      html: `<div class="paw-marker-inner">🐾</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

    pins.forEach((pin) => {
      const marker = L.marker([pin.latitude, pin.longitude], { icon: pawIcon });

      marker.on('click', () => {
        this.selectedPin.set(pin);
        this.isSheetOpen.set(true);
        this.loadProviderReviews(pin.providerId);
      });

      this.markersLayer.addLayer(marker);
    });
  }
}
