import type { Region } from "react-native-maps";

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
