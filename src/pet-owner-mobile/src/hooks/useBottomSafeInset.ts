import { Platform } from "react-native";
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/**
 * System navigation bar / home-indicator inset only (not the app tab bar).
 * Use for full-screen modals and sheets drawn over the tab navigator.
 */
export function useBottomSafeInset(): number {
  const insets = useSafeAreaInsets();
  if (insets.bottom > 0) return insets.bottom;

  if (Platform.OS === "android") {
    return initialWindowMetrics?.insets.bottom ?? 0;
  }

  return 0;
}
