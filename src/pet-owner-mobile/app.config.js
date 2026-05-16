/**
 * Dynamic Expo config: injects native Google Maps API keys for `react-native-maps`.
 * Without `android.config.googleMaps.apiKey`, Android release builds often crash as soon
 * as Explore mounts (MapView). Keys are baked in at prebuild from `process.env`.
 *
 * Local: set `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` (or dedicated Maps keys) in `.env`.
 * EAS: set the same variables for the Preview / Production environment (Expo dashboard
 * or `eas env:create`) — `.env` is not sent to cloud builds by default.
 *
 * In Google Cloud Console, enable "Maps SDK for Android" and "Maps SDK for iOS" for the key.
 */
module.exports = ({ config }) => {
  const mapsAndroid =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ||
    "";
  const mapsIos =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ||
    "";

  const sentryOrg = process.env.SENTRY_ORG?.trim() || "YOUR_SENTRY_ORG";
  const sentryProject = process.env.SENTRY_PROJECT?.trim() || "YOUR_SENTRY_PROJECT";
  const plugins = [
    ...(config.plugins ?? []),
    [
      "@sentry/react-native/expo",
      {
        organization: sentryOrg,
        project: sentryProject,
        url: "https://sentry.io/",
      },
    ],
  ];

  return {
    ...config,
    plugins,
    android: {
      ...config.android,
      config: {
        ...(config.android?.config ?? {}),
        ...(mapsAndroid ? { googleMaps: { apiKey: mapsAndroid } } : {}),
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...(config.ios?.config ?? {}),
        ...(mapsIos ? { googleMapsApiKey: mapsIos } : {}),
      },
    },
  };
};
