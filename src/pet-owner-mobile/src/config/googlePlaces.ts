/**
 * Google Places API configuration.
 *
 * The key is consumed by `src/api/googlePlaces.ts` and the
 * `<AddressAutocomplete />` component.
 *
 * Set `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` in `.env` (and the same variable on EAS
 * for Preview/Production — cloud builds do not use local `.env`). Restrict the key
 * in Google Cloud Console to:
 *   - APIs:     Places (Autocomplete + Details), Maps SDK for Android, Maps SDK for iOS
 *   - Bundle:   com.petowner.app (iOS) and com.petowner.app (Android)
 *   - HTTP referrers: your web origin (for Expo web)
 *
 * Maps SDK entries are required so `react-native-maps` gets native keys via `app.config.js`;
 * without them, Android release APKs can crash when the Explore map mounts.
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
