import { Platform } from "react-native";
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/** Typical 3-button navigation bar height when WindowInsets are not yet available. */
const ANDROID_NAV_BAR_FALLBACK = 48;

/**
 * Bottom safe inset for layouts that must sit above the system navigation bar.
 * On Android edge-to-edge, `useSafeAreaInsets().bottom` can be 0 until insets sync;
 * falls back to `initialWindowMetrics` then a conservative default.
 */
export function useBottomSafeInset(): number {
  const insets = useSafeAreaInsets();
  if (insets.bottom > 0) return insets.bottom;

  if (Platform.OS === "android") {
    const initial = initialWindowMetrics?.insets.bottom ?? 0;
    if (initial > 0) return initial;
    return ANDROID_NAV_BAR_FALLBACK;
  }

  return 0;
}
