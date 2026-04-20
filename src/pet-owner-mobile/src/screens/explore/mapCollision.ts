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

/** ~1 m precision so providers in the same building usually share one group. */
export function groupPinsForMapMarkers(pins: MapPinDto[]): ExploreMapMarkerItem[] {
  const buckets = new Map<string, MapPinDto[]>();
  for (const p of pins) {
    if (!isFiniteCoord(p.latitude, p.longitude)) continue;
    const key = `${Number(p.latitude).toFixed(5)},${Number(p.longitude).toFixed(5)}`;
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
