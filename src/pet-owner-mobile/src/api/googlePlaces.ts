/**
 * Thin wrapper around the Google Places Web Service API.
 *
 * Uses the legacy REST endpoints because:
 *   - they support the `components=country:il` + `language=he` parameters out
 *     of the box (matching our Israel-only, Hebrew-first product)
 *   - they're trivial to call from React Native via plain `fetch` — no SDK,
 *     no native modules, no Expo dev-client rebuild.
 *
 * Billing model: Autocomplete + Details requests sharing the same
 * `sessionToken` are billed as a single "Autocomplete (per session)" SKU
 * (much cheaper than per-request). Always pair them via
 * {@link createPlacesSession}.
 */
import {
  GOOGLE_PLACES_API_KEY,
  GOOGLE_PLACES_AVAILABLE,
  GOOGLE_PLACES_COUNTRY,
  GOOGLE_PLACES_DEFAULT_LANGUAGE,
} from "../config/googlePlaces";

const AUTOCOMPLETE_URL =
  "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

/* ────────────────────────── Public types ────────────────────────── */

export type PlaceAutocompleteType =
  /** Full street address — "שדרות רוטשילד 3, תל אביב יפו". */
  | "address"
  /** City / locality only — "תל אביב יפו". */
  | "(cities)"
  /** Cities + administrative regions. */
  | "(regions)"
  /** Geocoder hits — addresses, regions, POIs. */
  | "geocode"
  /** Businesses + POIs. */
  | "establishment";

export interface PlacePrediction {
  placeId: string;
  /** Full description, e.g. "שדרות רוטשילד 3, תל אביב יפו, ישראל". */
  description: string;
  /** Bold portion in the dropdown row, e.g. "שדרות רוטשילד 3". */
  mainText: string;
  /** Muted secondary line in the dropdown row, e.g. "תל אביב יפו". */
  secondaryText: string;
  /** Place type tags from Google (e.g. ["street_address", "geocode"]). */
  types: string[];
}

export interface PlaceAddressComponents {
  /** Locality (city). Falls back to administrative_area_level_2 / postal_town. */
  city?: string;
  /** Street name (route). */
  street?: string;
  /** Building / house number. */
  streetNumber?: string;
  postalCode?: string;
  /** Two-letter ISO country code, uppercase. */
  countryCode?: string;
  countryName?: string;
}

export interface PlaceDetails {
  placeId: string;
  /** Localised one-line address — safe to display directly. */
  formattedAddress: string;
  latitude: number;
  longitude: number;
  components: PlaceAddressComponents;
}

/** Opaque session handle that bundles billing for Autocomplete + Details. */
export interface PlacesSession {
  token: string;
}

/* ────────────────────────── Internal types ───────────────────────── */

interface GoogleAutocompleteResponse {
  status: string;
  predictions?: Array<{
    place_id: string;
    description: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
    types?: string[];
  }>;
  error_message?: string;
}

interface GoogleDetailsResponse {
  status: string;
  result?: {
    place_id: string;
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  };
  error_message?: string;
}

/* ────────────────────────── Session token ────────────────────────── */

/**
 * Create a fresh Places billing session. Call this once when the user starts
 * typing, reuse for every Autocomplete request, then pass to {@link fetchPlaceDetails}
 * when the user taps a result. Discard afterwards — sessions are single-use.
 */
export function createPlacesSession(): PlacesSession {
  // RFC4122-ish v4 (good enough for a billing session token; not security-sensitive).
  const rand = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  const token = `${rand()}${rand()}-${rand()}-${rand()}-${rand()}-${rand()}${rand()}${rand()}`;
  return { token };
}

/* ─────────────────────────── Autocomplete ────────────────────────── */

export interface AutocompleteOptions {
  input: string;
  session: PlacesSession;
  /** Defaults to `"address"`. */
  type?: PlaceAutocompleteType;
  /** Defaults to `"he"`. */
  language?: "he" | "en";
  /** ISO 3166-1 alpha-2 country code. Defaults to `"il"`. */
  country?: string;
  /** Optional bias coordinates ([lat, lng], radius metres). */
  locationBias?: { latitude: number; longitude: number; radiusMeters: number };
  signal?: AbortSignal;
}

/**
 * Returns up to 5 Google place predictions for the given input.
 *
 * Returns `[]` (and never throws) when:
 *   - the API key is missing
 *   - the input is shorter than 2 chars (Google rejects 1-char queries)
 *   - the network request fails
 *   - Google returns a non-OK status (logged in dev)
 */
export async function fetchPlaceAutocomplete(
  options: AutocompleteOptions,
): Promise<PlacePrediction[]> {
  const trimmed = options.input.trim();
  if (!GOOGLE_PLACES_AVAILABLE || trimmed.length < 2) return [];

  const params = new URLSearchParams({
    input: trimmed,
    key: GOOGLE_PLACES_API_KEY,
    language: options.language ?? GOOGLE_PLACES_DEFAULT_LANGUAGE,
    components: `country:${(options.country ?? GOOGLE_PLACES_COUNTRY).toLowerCase()}`,
    sessiontoken: options.session.token,
    types: options.type ?? "address",
  });

  if (options.locationBias) {
    params.set(
      "location",
      `${options.locationBias.latitude},${options.locationBias.longitude}`,
    );
    params.set("radius", String(options.locationBias.radiusMeters));
  }

  try {
    const res = await fetch(`${AUTOCOMPLETE_URL}?${params.toString()}`, {
      signal: options.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as GoogleAutocompleteResponse;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          "[GooglePlaces] autocomplete failed",
          data.status,
          data.error_message,
        );
      }
      return [];
    }

    return (data.predictions ?? []).map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? "",
      types: p.types ?? [],
    }));
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return [];
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[GooglePlaces] autocomplete error", err);
    }
    return [];
  }
}

/* ───────────────────────── Place Details ────────────────────────── */

export interface PlaceDetailsOptions {
  placeId: string;
  session: PlacesSession;
  /** Defaults to `"he"`. */
  language?: "he" | "en";
  signal?: AbortSignal;
}

/**
 * Fetches lat/lng + parsed address components for a Place ID returned by
 * {@link fetchPlaceAutocomplete}.
 *
 * Returns `null` when the API key is missing, the network fails, or Google
 * returns no result.
 */
export async function fetchPlaceDetails(
  options: PlaceDetailsOptions,
): Promise<PlaceDetails | null> {
  if (!GOOGLE_PLACES_AVAILABLE) return null;

  const params = new URLSearchParams({
    place_id: options.placeId,
    key: GOOGLE_PLACES_API_KEY,
    language: options.language ?? GOOGLE_PLACES_DEFAULT_LANGUAGE,
    sessiontoken: options.session.token,
    fields: "place_id,formatted_address,geometry/location,address_components",
  });

  try {
    const res = await fetch(`${DETAILS_URL}?${params.toString()}`, {
      signal: options.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GoogleDetailsResponse;
    if (data.status !== "OK" || !data.result?.geometry?.location) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          "[GooglePlaces] details failed",
          data.status,
          data.error_message,
        );
      }
      return null;
    }
    const r = data.result;
    return {
      placeId: r.place_id,
      formattedAddress: r.formatted_address ?? "",
      latitude: r.geometry!.location!.lat,
      longitude: r.geometry!.location!.lng,
      components: parseAddressComponents(r.address_components ?? []),
    };
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return null;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[GooglePlaces] details error", err);
    }
    return null;
  }
}

/* ─────────────────────── Reverse Geocoding ──────────────────────── */

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

interface GoogleGeocodeResponse {
  status: string;
  results?: Array<{
    place_id: string;
    formatted_address: string;
    geometry?: { location?: { lat: number; lng: number } };
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
  error_message?: string;
}

export interface ReverseGeocodeOptions {
  latitude: number;
  longitude: number;
  language?: "he" | "en";
  signal?: AbortSignal;
}

/**
 * Reverse-geocode a lat/lng to the most relevant address using Google.
 * Used when the user taps the map to drop a pin and we want to backfill the
 * address fields.
 */
export async function fetchReverseGeocode(
  options: ReverseGeocodeOptions,
): Promise<PlaceDetails | null> {
  if (!GOOGLE_PLACES_AVAILABLE) return null;
  const params = new URLSearchParams({
    latlng: `${options.latitude},${options.longitude}`,
    key: GOOGLE_PLACES_API_KEY,
    language: options.language ?? GOOGLE_PLACES_DEFAULT_LANGUAGE,
    result_type: "street_address|route|premise|locality",
  });

  try {
    const res = await fetch(`${GEOCODE_URL}?${params.toString()}`, {
      signal: options.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GoogleGeocodeResponse;
    if (data.status !== "OK" || !data.results?.length) return null;
    const r = data.results[0];
    return {
      placeId: r.place_id,
      formattedAddress: r.formatted_address ?? "",
      latitude: r.geometry?.location?.lat ?? options.latitude,
      longitude: r.geometry?.location?.lng ?? options.longitude,
      components: parseAddressComponents(r.address_components ?? []),
    };
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return null;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[GooglePlaces] reverse geocode error", err);
    }
    return null;
  }
}

/* ─────────────────────────── Helpers ────────────────────────────── */

function parseAddressComponents(
  components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>,
): PlaceAddressComponents {
  const find = (...wanted: string[]): string | undefined => {
    for (const t of wanted) {
      const hit = components.find((c) => c.types.includes(t));
      if (hit) return hit.long_name;
    }
    return undefined;
  };
  const findShort = (...wanted: string[]): string | undefined => {
    for (const t of wanted) {
      const hit = components.find((c) => c.types.includes(t));
      if (hit) return hit.short_name;
    }
    return undefined;
  };

  return {
    city: find(
      "locality",
      "postal_town",
      "administrative_area_level_2",
      "administrative_area_level_3",
    ),
    street: find("route"),
    streetNumber: find("street_number", "premise"),
    postalCode: find("postal_code"),
    countryCode: findShort("country")?.toUpperCase(),
    countryName: find("country"),
  };
}
