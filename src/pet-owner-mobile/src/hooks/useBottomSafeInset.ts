import { Platform } from "react-native";
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export function useBottomSafeInset(): number {
  const insets = useSafeAreaInsets();
  if (insets.bottom > 0) return insets.bottom;
  if (Platform.OS === "android") {
    return initialWindowMetrics?.insets.bottom ?? 0;
  }
  return 0;
}
