import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { MapService, MapSearchFilters } from '../../services/map.service';
import { ProviderService } from '../../services/provider.service';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';
import { PetService, Pet } from '../../services/pet.service';
import { RequestService } from '../../services/request.service';
import { ReviewService, ProviderReview } from '../../services/review.service';
import { MapPin } from '../../models/map-pin.model';

const FLORENTIN_LAT = 32.0563;
const FLORENTIN_LNG = 34.7668;
const DEFAULT_ZOOM = 15;

@Component({
  selector: 'app-map-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-dashboard.component.html',
  styleUrl: './map-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('chipsContainer') chipsContainer!: ElementRef<HTMLDivElement>;

  private readonly mapService = inject(MapService);
  readonly providerService = inject(ProviderService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly petService = inject(PetService);
  private readonly requestService = inject(RequestService);
  private readonly reviewService = inject(ReviewService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);

  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());
  readonly isAdmin = computed(() => this.auth.userRole() === 'Admin');

  private map!: L.Map;
  private markersLayer = L.layerGroup();
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

  isRequestModalOpen = signal(false);
  pets = signal<Pet[]>([]);
  selectedPetId = signal<string | null>(null);
  loadingPets = signal(false);
  sendingRequest = signal(false);

  bookingDate = signal('');
  bookingStartTime = signal('09:00');
  bookingEndTime = signal('11:00');
  bookingNotes = signal('');
  shareMedicalRecords = signal(false);

  providerSlots = signal<{ dayOfWeek: number; startTime: string; endTime: string }[]>([]);

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
    { label: 'Walkers', icon: '🚶', value: 'Dog Walker' },
    { label: 'Sitters', icon: '🏠', value: 'Pet Sitter' },
    { label: 'Boarding', icon: '🛏️', value: 'Boarding' },
    { label: 'Vets', icon: '🩺', value: 'Vet' },
    { label: 'Groomers', icon: '✂️', value: 'Groomer' },
    { label: 'Shops', icon: '🛒', value: 'Shop' },
    { label: 'Parks', icon: '🌳', value: 'Park' },
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

  estimatedPrice = computed(() => {
    const pin = this.selectedPin();
    const start = this.bookingStartTime();
    const end = this.bookingEndTime();
    if (!pin || !start || !end) return null;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const hours = (eh * 60 + em - sh * 60 - sm) / 60;
    if (hours <= 0) return null;

    return {
      hours: Math.round(hours * 10) / 10,
      rate: pin.hourlyRate,
      total: Math.round(pin.hourlyRate * hours * 100) / 100,
    };
  });

  canBook = computed(() => {
    return !!this.selectedPetId()
      && !!this.bookingDate()
      && !!this.bookingStartTime()
      && !!this.bookingEndTime()
      && this.estimatedPrice() !== null
      && !this.sendingRequest();
  });

  isOutsideWorkingHours = computed(() => {
    const date = this.bookingDate();
    const startTime = this.bookingStartTime();
    const endTime = this.bookingEndTime();
    const slots = this.providerSlots();
    if (!date || !startTime || !endTime || slots.length === 0) return false;

    const [y, m, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const startMin = this.timeToMinutes(startTime);
    const endMin = this.timeToMinutes(endTime);

    return !slots.some(s =>
      s.dayOfWeek === dayOfWeek
      && this.timeToMinutes(s.startTime) <= startMin
      && this.timeToMinutes(s.endTime) >= endMin
    );
  });

  private timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  ngOnInit(): void {
    this.initMap();
    this.locateUser();
    this.checkProviderStatus();
    this.mapService.getServiceTypes().subscribe({
      next: (types) => this.serviceTypes.set(types),
    });
  }

  ngOnDestroy(): void {
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

  openRequestModal(): void {
    const pin = this.selectedPin();
    if (!pin) return;

    if (!this.auth.isLoggedIn()) {
      this.toast.error('You must be logged in to request a service.');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.bookingDate.set(tomorrow.toISOString().split('T')[0]);
    this.bookingStartTime.set('09:00');
    this.bookingEndTime.set('11:00');
    this.bookingNotes.set('');

    this.loadingPets.set(true);
    this.providerSlots.set([]);
    this.isRequestModalOpen.set(true);

    this.petService.getAll().subscribe({
      next: (pets) => {
        this.pets.set(pets);
        if (pets.length === 1) {
          this.selectedPetId.set(pets[0].id);
        }
        this.loadingPets.set(false);
      },
      error: () => {
        this.loadingPets.set(false);
        this.toast.error('Failed to load your pets.');
      },
    });

    this.mapService.getProviderProfile(pin.providerId).subscribe({
      next: (profile) => this.providerSlots.set(profile.availabilitySlots),
    });
  }

  closeRequestModal(): void {
    this.isRequestModalOpen.set(false);
    this.selectedPetId.set(null);
    this.shareMedicalRecords.set(false);
  }

  sendRequest(): void {
    const pin = this.selectedPin();
    const petId = this.selectedPetId();
    const date = this.bookingDate();
    const start = this.bookingStartTime();
    const end = this.bookingEndTime();
    if (!pin || !petId || !date || !start || !end) return;

    this.sendingRequest.set(true);

    const scheduledStart = `${date}T${start}:00`;
    const scheduledEnd = `${date}T${end}:00`;

    this.requestService.create({
      providerId: pin.providerId,
      petId,
      scheduledStart,
      scheduledEnd,
      notes: this.bookingNotes().trim() || null,
      shareMedicalRecords: this.shareMedicalRecords(),
    }).subscribe({
      next: () => {
        this.sendingRequest.set(false);
        this.closeRequestModal();
        this.closeSheet();
        this.toast.success('Request sent successfully! Waiting for the sitter\'s approval.');
      },
      error: () => {
        this.sendingRequest.set(false);
      },
    });
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    this.markersLayer.addTo(this.map);
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

  scrollChips(direction: 'left' | 'right'): void {
    const container = this.chipsContainer?.nativeElement;
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
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

  setMaxRate(val: string): void {
    this.filterMaxRate.set(val ? parseFloat(val) : null);
  }

  setRadiusKm(val: string): void {
    this.filterRadiusKm.set(val ? parseFloat(val) : null);
  }

  viewProviderProfile(providerId: string): void {
    this.router.navigate(['/provider', providerId]);
  }

  revokeSitter(providerId: string): void {
    if (!confirm('Are you sure you want to revoke this provider\'s sitter status? This action cannot be easily undone.')) {
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
        this.toast.error('Failed to revoke sitter status.');
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
