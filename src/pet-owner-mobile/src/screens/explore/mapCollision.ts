import type { MapPinDto } from "../../types/api";

export type ExploreMapMarkerItem =
  | { kind: "single"; pin: MapPinDto }
  | {
      kind: "cluster";
      key: string;
      pins: MapPinDto[];
      latitude: number;
      longitude: number;
    };

function isFiniteCoord(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const lo = Number(lng);
  return Number.isFinite(la) && Number.isFinite(lo);
}

function bucketPrecisionForDelta(latitudeDelta: number): number {
  if (latitudeDelta > 2) return 1;
  if (latitudeDelta > 0.5) return 2;
  if (latitudeDelta > 0.1) return 3;
  return 4;
}

/**
 * Groups pins into "same-location" clusters using a coordinate bucket whose
 * precision adapts to the current map zoom (via `latitudeDelta`).
 *
 * | latitudeDelta | precision | bucket size |
 * |---------------|-----------|-------------|
 * | > 2           | 1         | ~11 km      |
 * | > 0.5         | 2         | ~1.1 km     |
 * | > 0.1         | 3         | ~110 m      |
 * | <= 0.1        | 4 (default)| ~11 m      |
 *
 * When `latitudeDelta` is omitted the function defaults to precision 4
 * (same-address only), preserving the previous behaviour.
 */
export function groupPinsForMapMarkers(
  pins: MapPinDto[],
  latitudeDelta?: number,
): ExploreMapMarkerItem[] {
  const precision = latitudeDelta != null ? bucketPrecisionForDelta(latitudeDelta) : 4;
  const buckets = new Map<string, MapPinDto[]>();
  for (const p of pins) {
    if (!isFiniteCoord(p.latitude, p.longitude)) continue;
    const key = `${Number(p.latitude).toFixed(precision)},${Number(p.longitude).toFixed(precision)}`;
    const list = buckets.get(key);
    if (list) list.push(p);
    else buckets.set(key, [p]);
  }
  const out: ExploreMapMarkerItem[] = [];
  for (const [key, group] of buckets) {
    if (group.length === 1) {
      out.push({ kind: "single", pin: group[0] });
      continue;
    }
    const latitude = group.reduce((s, x) => s + Number(x.latitude), 0) / group.length;
    const longitude = group.reduce((s, x) => s + Number(x.longitude), 0) / group.length;
    out.push({ kind: "cluster", key, pins: group, latitude, longitude });
  }
  return out;
}

export function markerItemHasSelectedProvider(
  item: ExploreMapMarkerItem,
  selectedId: string | null | undefined,
): boolean {
  if (!selectedId) return false;
  if (item.kind === "single") return item.pin.providerId === selectedId;
  return item.pins.some((p) => p.providerId === selectedId);
}

/**
 * Stable sibling order for MapView markers. Selection must not reorder children
 * (avoids react-native-maps native churn on rapid taps); use zIndex for stacking.
 */
export function sortMarkerItemsStable(items: ExploreMapMarkerItem[]): ExploreMapMarkerItem[] {
  return [...items].sort((a, b) => {
    const latA = a.kind === "single" ? Number(a.pin.latitude) : a.latitude;
    const lngA = a.kind === "single" ? Number(a.pin.longitude) : a.longitude;
    const latB = b.kind === "single" ? Number(b.pin.latitude) : b.latitude;
    const lngB = b.kind === "single" ? Number(b.pin.longitude) : b.longitude;
    if (latA !== latB) return latA - latB;
    if (lngA !== lngB) return lngA - lngB;
    const idA = a.kind === "single" ? a.pin.providerId : a.key;
    const idB = b.kind === "single" ? b.pin.providerId : b.key;
    return idA.localeCompare(idB);
  });
}
