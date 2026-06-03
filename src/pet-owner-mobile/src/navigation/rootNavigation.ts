import { navigationRef } from "./navigationRef";

const ROOT_TAB_NAMES = new Set([
  "Explore",
  "Community",
  "MyPets",
  "Messages",
  "Profile",
  "Login",
]);

const AUTH_SCREEN_NAMES = new Set([
  "LoginScreen",
  "RegisterScreen",
  "ForgotPasswordScreen",
]);

/** Maps nested stack screen names to their parent tab (for RTL reload restore). */
const NESTED_SCREEN_TO_TAB: Record<string, string> = {
  ExploreMain: "Explore",
  Discover: "Explore",
  ProviderProfile: "Explore",
  Booking: "Explore",
  AllReviews: "Explore",
  WriteReview: "Explore",
  PaymentCheckout: "Explore",
  CommunityMain: "Community",
  GroupDetail: "Community",
  PalProfile: "Community",
  PlaydatePrefs: "Community",
  LiveBeaconDetail: "Community",
  PlaydateEventDetail: "Community",
  CreatePlaydateEvent: "Community",
  MyPetsMain: "MyPets",
  AddPet: "MyPets",
  ReportLost: "MyPets",
  ReportFound: "MyPets",
  EmergencyVets: "MyPets",
  Triage: "MyPets",
  ActivityLog: "MyPets",
  MessagesMain: "Messages",
  ChatRoom: "Messages",
  ProfileMain: "Profile",
  ProviderEdit: "Profile",
  ProviderDashboard: "Profile",
  AdminDashboard: "Profile",
  MyBookings: "Profile",
  BookingPetCare: "Profile",
  MyStats: "Profile",
  Notifications: "Profile",
  NotificationSettings: "Profile",
  AccountSettings: "Profile",
  AccountEdit: "Profile",
  Security: "Profile",
  ChangePassword: "Profile",
  LanguageSelect: "Profile",
  Privacy: "Profile",
  HelpCenter: "Profile",
  ContactUs: "Profile",
  Terms: "Profile",
  ProviderOnboarding: "Profile",
  Favorites: "Profile",
};

/** Active tab route from root state (not the focused leaf screen). */
export function getActiveTabRouteName(): string | null {
  if (!navigationRef.isReady()) return null;
  const state = navigationRef.getRootState();
  if (!state?.routes?.length) return null;
  return state.routes[state.index]?.name ?? null;
}

/**
 * Navigate from outside screen components (toast, reload restore, post-login).
 * Returns false when the container is not ready or the target is unknown.
 */
export function rootNavigate(name: string, params?: object): boolean {
  if (!navigationRef.isReady()) return false;

  const dispatchNavigate = (target: string, targetParams?: object) => {
    navigationRef.dispatch({
      type: "NAVIGATE",
      payload: { name: target, params: targetParams },
    });
  };

  try {
    if (AUTH_SCREEN_NAMES.has(name)) {
      dispatchNavigate("Login", { screen: name });
      return true;
    }

    if (ROOT_TAB_NAMES.has(name)) {
      if (name === "Login") {
        dispatchNavigate("Login", {
          screen: "LoginScreen",
          ...params,
        });
        return true;
      }
      dispatchNavigate(name, params);
      return true;
    }

    const tab = NESTED_SCREEN_TO_TAB[name];
    if (tab) {
      dispatchNavigate(tab, { screen: name, params });
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/** Poll until the root navigator is ready, then run `action` once. */
export function whenNavigationReady(action: () => void, maxAttempts = 100): () => void {
  if (navigationRef.isReady()) {
    action();
    return () => {};
  }

  let attempts = 0;
  const pollId = setInterval(() => {
    if (navigationRef.isReady()) {
      clearInterval(pollId);
      action();
      return;
    }
    attempts += 1;
    if (attempts >= maxAttempts) clearInterval(pollId);
  }, 50);

  return () => clearInterval(pollId);
}
