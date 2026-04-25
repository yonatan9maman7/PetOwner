import type { Region } from "react-native-maps";

/** Same guards as Explore map math — invalid regions must not reach SQL / Haversine. */
export function isValidMapRegion(region: {
  latitude?: unknown;
  longitude?: unknown;
  latitudeDelta?: unknown;
  longitudeDelta?: unknown;
}): boolean {
  const lat = Number(region.latitude);
  const lng = Number(region.longitude);
  const dLat = Number(region.latitudeDelta);
  const dLng = Number(region.longitudeDelta);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) return false;
  if (dLat <= 0 || dLng <= 0) return false;
  return true;
}

/**
 * Center + search radius for GET /map/pins (matches ExploreScreen viewport logic).
 * Returns null if the region is not safe for geo queries.
 */
export function viewportPinsSearchParamsFromRegion(region: {
  latitude?: unknown;
  longitude?: unknown;
  latitudeDelta?: unknown;
  longitudeDelta?: unknown;
}): { latitude: number; longitude: number; radiusKm: number } | null {
  if (!isValidMapRegion(region)) return null;
  const lat = Number(region.latitude);
  const lng = Number(region.longitude);
  const latDelta = Number(region.latitudeDelta) / 2;
  const lngDelta = Number(region.longitudeDelta) / 2;
  const diagKm =
    Math.sqrt(
      Math.pow(latDelta * 111, 2) +
        Math.pow(lngDelta * 111 * Math.cos((lat * Math.PI) / 180), 2),
    ) * 1.38;
  const radiusKm = Math.max(1.75, Math.min(diagKm, 80));
  return { latitude: lat, longitude: lng, radiusKm };
}

/**
 * Module-level object references only — new literals on every render have been a common cause
 * of native MapView churn on iOS (annotations rebuilt while panning).
 */
export const EXPLORE_MAP_INITIAL_REGION: Region = {
  latitude: 32.0853,
  longitude: 34.7818,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

export const EXPLORE_MAP_PADDING = {
  top: 0,
  right: 0,
  bottom: 110,
  left: 0,
} as const;

export const EXPLORE_USER_MARKER_ANCHOR = { x: 0.5, y: 0.5 } as const;
