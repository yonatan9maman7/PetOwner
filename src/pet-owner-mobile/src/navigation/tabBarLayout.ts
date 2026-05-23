import { Platform } from "react-native";
import { initialWindowMetrics } from "react-native-safe-area-context";

/** Must stay in sync with GLASS_BAR_CONTENT_HEIGHT in AppNavigator. */

/** Icon + label area height — unified across platforms for the glass bar. */
export const TAB_BAR_CONTENT_HEIGHT_ANDROID = 68;
export const TAB_BAR_CONTENT_HEIGHT_IOS = 68;
/** No separate top-padding hack needed; the glass bar is self-contained. */
export const TAB_BAR_PADDING_TOP_ANDROID = 0;
export const TAB_BAR_PADDING_TOP_IOS = 0;

export function getTabBarBottomInset(insets: { bottom: number }): number {
  if (Platform.OS === "android") {
    if (insets.bottom > 0) return insets.bottom;
    const initialBottom = initialWindowMetrics?.insets.bottom ?? 0;
    if (initialBottom > 0) return initialBottom;
    return 10;
  }
  return insets.bottom;
}

/** Tab bar row height from AppNavigator `tabBarStyle.height` (excludes safe-area padding). */
export function tabBarStructuralHeight(): number {
  if (Platform.OS === "android") {
    return TAB_BAR_CONTENT_HEIGHT_ANDROID + TAB_BAR_PADDING_TOP_ANDROID;
  }
  return TAB_BAR_CONTENT_HEIGHT_IOS + TAB_BAR_PADDING_TOP_IOS;
}

/** Total height of the touchable tab row (content + top padding). */
export function tabBarRowHeight(): number {
  if (Platform.OS === "android") {
    return TAB_BAR_CONTENT_HEIGHT_ANDROID + TAB_BAR_PADDING_TOP_ANDROID;
  }
  return TAB_BAR_CONTENT_HEIGHT_IOS + TAB_BAR_PADDING_TOP_IOS;
}

/**
 * Total vertical space the bottom tab bar occupies on screen.
 *
 * `useBottomTabBarHeight()` may return either the inner bar height only (~56 iOS)
 * or the full custom wrapper height (bar + safe-area padding). We detect which
 * case applies and never add the safe-area inset twice.
 */
export function resolveTabBarOccupiedHeight(options: {
  tabBarHeightFromHook: number;
  bottomSafeInset: number;
}): number {
  const contentHeight = tabBarStructuralHeight();
  const withInset = contentHeight + options.bottomSafeInset;
  const hook = options.tabBarHeightFromHook;

  if (hook > 0.5) {
    // Hook already includes safe-area padding (custom TabBarWithSos wrapper measured).
    if (hook >= withInset - 4) return hook;
    // Hook is inner bar height only — add safe area once.
    if (hook <= contentHeight + 4) return hook + options.bottomSafeInset;
    // Partial value — trust the hook as-is.
    return hook;
  }

  return withInset;
}
