import { DeviceEventEmitter } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { CommonActions, StackActions } from "@react-navigation/native";
import { useAuthStore } from "../store/authStore";
import { navigationRef } from "./navigationRef";
import { rootNavigate, whenNavigationReady } from "./rootNavigation";

/** ExploreScreen listens to clear map overlays before switching to the Login tab. */
export const EXPLORE_CLEAR_BEFORE_LOGIN_EVENT = "petowner/explore/clearBeforeLogin";

const LOGIN_TAB_PARAMS = { screen: "LoginScreen" } as const;

function stackRouteCount(nav: NavigationProp<ParamListBase>): number {
  const state = nav.getState();
  if (!state?.routes?.length) return 0;
  return state.routes.length;
}

/** Walk up to the tab navigator that owns the guest "Login" tab. */
function navigateViaParentChain(navigation: NavigationProp<ParamListBase>): boolean {
  let nav: NavigationProp<ParamListBase> | undefined = navigation;
  while (nav) {
    const routeNames = nav.getState()?.routeNames;
    if (routeNames?.includes("Login")) {
      if (stackRouteCount(nav) > 1) {
        nav.dispatch(StackActions.popToTop());
      }
      nav.dispatch(CommonActions.navigate({ name: "Login", params: LOGIN_TAB_PARAMS }));
      return true;
    }
    nav = nav.getParent() as NavigationProp<ParamListBase> | undefined;
  }
  return false;
}

function goToLoginTab(): boolean {
  if (!navigationRef.isReady()) return false;
  if (useAuthStore.getState().isLoggedIn) return false;
  return rootNavigate("Login", LOGIN_TAB_PARAMS);
}

/**
 * Switches to the Login tab after collapsing the active stack to its root when possible.
 * Emits {@link EXPLORE_CLEAR_BEFORE_LOGIN_EVENT} first so Explore can drop overlays (avoids stale
 * half-height chrome after returning from Login). Skips `POP_TO_TOP` when already at stack root.
 */
export function navigateToLoginClearingStack(navigation: NavigationProp<ParamListBase>): void {
  DeviceEventEmitter.emit(EXPLORE_CLEAR_BEFORE_LOGIN_EVENT);

  if (useAuthStore.getState().isLoggedIn) return;

  if (goToLoginTab()) return;

  whenNavigationReady(() => {
    if (goToLoginTab()) return;
    try {
      if (stackRouteCount(navigation) > 1) {
        navigation.dispatch(StackActions.popToTop());
      }
    } catch {
      // Nested stack may not support popToTop yet.
    }
    navigateViaParentChain(navigation);
  });
}
