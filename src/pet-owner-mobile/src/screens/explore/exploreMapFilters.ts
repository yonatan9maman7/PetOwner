import type { MapPinDto, MapSearchFilters } from "../../types/api";
import {
  isValidMapRegion,
  viewportPinsSearchParamsFromRegion,
} from "./exploreMapLayoutConstants";

/** Criteria for strict AND filtering of map pins (mirrors Explore filter UI state). */
export type ExploreMapFilterCriteria = {
  activeServices: ReadonlySet<string>;
  minRating: number | null;
  maxRate: number | null;
  /** User-selected max distance (km); applied only when user coordinates exist. */
  radiusKm: number | null;
  userLatitude: number | null;
  userLongitude: number | null;
};

const EARTH_RADIUS_KM = 6371;

/** Haversine distance in kilometers between two WGS84 points. */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function parseServicesCsv(services: string | null | undefined): string[] {
  const raw = services?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeServiceLabel(label: string): string {
  return label.trim().toLowerCase();
}

function pinOffersSelectedService(
  pin: MapPinDto,
  activeServices: ReadonlySet<string>,
): boolean {
  if (activeServices.size === 0) return true;

  const wanted = new Set(Array.from(activeServices).map(normalizeServiceLabel));
  const detailed = pin.serviceRates ?? [];
  if (detailed.length > 0) {
    return detailed.some((row) =>
      wanted.has(normalizeServiceLabel(row.service)),
    );
  }

  const labels = parseServicesCsv(pin.services).map(normalizeServiceLabel);
  return labels.some((label) => wanted.has(label));
}

/**
 * Price filter uses per-service rates when available.
 * With one or more services selected, at least one matching service must be within max price.
 * With no service selected, any offered rate may satisfy the max (or pin minRate fallback).
 */
function pinMatchesPrice(
  pin: MapPinDto,
  activeServices: ReadonlySet<string>,
  maxRate: number | null,
): boolean {
  if (maxRate == null || !Number.isFinite(maxRate) || maxRate <= 0) return true;

  const detailed = pin.serviceRates ?? [];
  if (detailed.length > 0) {
    const wanted = Array.from(activeServices).map(normalizeServiceLabel);
    const relevant =
      wanted.length > 0
        ? detailed.filter((row) =>
            wanted.includes(normalizeServiceLabel(row.service)),
          )
        : detailed;

    if (relevant.length === 0) return wanted.length === 0;

    return relevant.some((row) => row.rate <= maxRate);
  }

  const fallback = Number(pin.minRate);
  if (!Number.isFinite(fallback)) return false;
  return fallback <= maxRate;
}

function pinMatchesRating(pin: MapPinDto, minRating: number | null): boolean {
  if (minRating == null || minRating <= 0) return true;
  const rating = pin.averageRating;
  if (rating == null || !Number.isFinite(Number(rating))) return false;
  return Number(rating) >= minRating;
}

function pinMatchesDistance(
  pin: MapPinDto,
  criteria: ExploreMapFilterCriteria,
): boolean {
  const maxKm = criteria.radiusKm;
  if (maxKm == null || !Number.isFinite(maxKm) || maxKm <= 0) return true;

  const userLat = criteria.userLatitude;
  const userLng = criteria.userLongitude;
  if (
    userLat == null
    || userLng == null
    || !Number.isFinite(userLat)
    || !Number.isFinite(userLng)
  ) {
    return true;
  }

  const lat = Number(pin.latitude);
  const lng = Number(pin.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  return haversineDistanceKm(userLat, userLng, lat, lng) <= maxKm;
}

/**
 * Strict multi-category AND filter — each inactive category defaults to true.
 */
export function applyExploreMapPinFilters(
  pins: MapPinDto[],
  criteria: ExploreMapFilterCriteria,
): MapPinDto[] {
  return pins.filter((pin) => {
    const matchesService = pinOffersSelectedService(pin, criteria.activeServices);
    const matchesRating = pinMatchesRating(pin, criteria.minRating);
    const matchesDistance = pinMatchesDistance(pin, criteria);
    const matchesPrice = pinMatchesPrice(
      pin,
      criteria.activeServices,
      criteria.maxRate,
    );
    return matchesService && matchesRating && matchesDistance && matchesPrice;
  });
}

export function buildExploreMapFilterCriteria(input: {
  activeServices: Set<string>;
  filterMinRating: number | null;
  filterMaxRate: string;
  filterRadiusKm: number | null;
  userLat: number | null;
  userLng: number | null;
}): ExploreMapFilterCriteria {
  const maxRateRaw = input.filterMaxRate.trim();
  const maxRateParsed = maxRateRaw ? Number(maxRateRaw) : NaN;
  const maxRate =
    Number.isFinite(maxRateParsed) && maxRateParsed > 0 ? maxRateParsed : null;

  return {
    activeServices: input.activeServices,
    minRating: input.filterMinRating,
    maxRate,
    radiusKm: input.filterRadiusKm,
    userLatitude: input.userLat,
    userLongitude: input.userLng,
  };
}

/** Build GET /map/pins query params (server pre-filter + viewport bounds for fetch). */
export function buildMapSearchFiltersForApi(
  criteria: ExploreMapFilterCriteria,
  options: {
    searchText: string;
    filterDate: string;
    filterTime: string;
    mapRegion: {
      latitude?: unknown;
      longitude?: unknown;
      latitudeDelta?: unknown;
      longitudeDelta?: unknown;
    };
    fallbackRegion: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    };
  },
): MapSearchFilters | undefined {
  const f: MapSearchFilters = {};

  const term = options.searchText.trim();
  if (term) f.searchTerm = term;

  if (criteria.activeServices.size > 0) {
    f.serviceType = [...criteria.activeServices].join(",");
  }

  if (criteria.minRating != null && criteria.minRating > 0) {
    f.minRating = criteria.minRating;
  }

  if (criteria.maxRate != null) {
    f.maxRate = criteria.maxRate;
  }

  if (options.filterDate && options.filterTime) {
    f.requestedTime = `${options.filterDate}T${options.filterTime}:00`;
  }

  const hasUserLocation =
    criteria.userLatitude != null
    && criteria.userLongitude != null
    && Number.isFinite(criteria.userLatitude)
    && Number.isFinite(criteria.userLongitude);

  if (criteria.radiusKm != null && criteria.radiusKm > 0 && hasUserLocation) {
    f.latitude = criteria.userLatitude!;
    f.longitude = criteria.userLongitude!;
    f.radiusKm = criteria.radiusKm;
  } else {
    const raw = options.mapRegion;
    const region = isValidMapRegion(raw) ? raw : options.fallbackRegion;
    const geo = viewportPinsSearchParamsFromRegion(region);
    if (geo) {
      f.latitude = geo.latitude;
      f.longitude = geo.longitude;
      f.radiusKm = geo.radiusKm;
    }
  }

  return Object.keys(f).length > 0 ? f : undefined;
}
