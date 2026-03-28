import { icon, Map, Marker } from 'leaflet';

const iconDefault = icon({
  iconRetinaUrl: 'assets/marker-icon-2x.png',
  iconUrl: 'assets/marker-icon.png',
  shadowUrl: 'assets/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

Marker.prototype.options.icon = iconDefault;

/** CartoDB Voyager — clean, colorful base map (replaces default OSM tiles). */
export const CARTO_VOYAGER_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export const CARTO_VOYAGER_TILE_OPTIONS = {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 20,
} as const;

/** Clears Leaflet’s default attribution prefix (wordmark and flag); OSM/CARTO text stays on the layer. */
export function applyMinimalMapAttribution(map: Map): void {
  map.attributionControl.setPrefix('');
}
