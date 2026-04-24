/**
 * Google Places API configuration.
 *
 * The key is consumed by `src/api/googlePlaces.ts` and the
 * `<AddressAutocomplete />` component.
 *
 * Set `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` in `.env` (and EAS secrets for
 * production builds). Restrict the key in Google Cloud Console to:
 *   - APIs:     Places API (legacy) — Autocomplete + Place Details
 *   - Bundle:   com.petowner.app  (iOS) and com.petowner.app (Android)
 *   - HTTP referrers: your web origin (for Expo web)
 *
 * Because Expo bundles `EXPO_PUBLIC_*` vars into the client, the key MUST be
 * locked down server-side via the restrictions above — treat it as public.
 */
const KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ?? "";

export const GOOGLE_PLACES_API_KEY = KEY;

export const GOOGLE_PLACES_AVAILABLE = KEY.length > 0;

if (__DEV__ && !GOOGLE_PLACES_AVAILABLE) {
  // eslint-disable-next-line no-console
  console.warn(
    "[PetOwner] EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is unset — address autocomplete will return empty results. Add it to .env.",
  );
}

/**
 * Country code restriction for autocomplete + details requests.
 * The product is Israel-only, so this is hard-coded.
 */
export const GOOGLE_PLACES_COUNTRY = "il";

/** Default UI language for Places results. */
export const GOOGLE_PLACES_DEFAULT_LANGUAGE: "he" | "en" = "he";
