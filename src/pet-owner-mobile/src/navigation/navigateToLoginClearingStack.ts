import { DeviceEventEmitter } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { StackActions } from "@react-navigation/native";

/** ExploreScreen listens to clear map overlays before switching to the Login tab. */
export const EXPLORE_CLEAR_BEFORE_LOGIN_EVENT = "petowner/explore/clearBeforeLogin";

function stackRouteCount(nav: NavigationProp<ParamListBase>): number {
  const state = nav.getState();
  if (!state?.routes?.length) return 0;
  return state.routes.length;
}

/**
 * Switches to the Login tab after collapsing the active stack to its root when possible.
 * Emits {@link EXPLORE_CLEAR_BEFORE_LOGIN_EVENT} first so Explore can drop overlays (avoids stale
 * half-height chrome after returning from Login). Skips `POP_TO_TOP` when already at stack root.
 */
export function navigateToLoginClearingStack(navigation: NavigationProp<ParamListBase>): void {
  DeviceEventEmitter.emit(EXPLORE_CLEAR_BEFORE_LOGIN_EVENT);
  if (stackRouteCount(navigation) > 1) {
    navigation.dispatch(StackActions.popToTop());
  }
  navigation.navigate("Login" as never);
}
