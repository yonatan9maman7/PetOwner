import { useContext } from "react";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useBottomSafeInset } from "../hooks/useBottomSafeInset";

/** Icon + label row — must match `solidStyles.contentRow.height` in AppNavigator. */
export const TAB_BAR_CONTENT_HEIGHT = 70;

/** Small gap between floating map controls and the tab bar. */
export const TAB_BAR_FLOATING_GAP = 8;

/**
 * Total bottom chrome: tab row + system navigation bar / home indicator.
 * Used when `useBottomTabBarHeight()` is unavailable (0 outside tab navigator).
 */
export function tabBarOccupiedHeightFromInset(bottomInset: number): number {
  return TAB_BAR_CONTENT_HEIGHT + Math.max(bottomInset, 0);
}

/**
 * Height of the bottom tab bar including the system safe-area padding.
 * Prefer this over manual constants + `useBottomSafeInset`.
 */
/**
 * Height of the bottom tab bar including the system safe-area padding.
 * Safe to call from anywhere — returns fallback when outside a tab navigator.
 */
export function useTabBarOccupiedHeight(): number {
  const measured = useContext(BottomTabBarHeightContext);
  const bottomInset = useBottomSafeInset();
  const fallback = tabBarOccupiedHeightFromInset(bottomInset);
  if (measured !== undefined && measured > TAB_BAR_CONTENT_HEIGHT * 0.5) {
    return Math.max(measured, fallback);
  }
  return fallback;
}
