import type { NavigationContainerRef } from "@react-navigation/native";
import { useNotificationStore } from "../store/notificationStore";
import type { TapPayload } from "./pushService";

type Nav = NavigationContainerRef<ReactNavigation.RootParamList>;

/**
 * Routes the app to the correct screen when a push notification is tapped.
 * Works for both background taps (via addNotificationResponseReceivedListener)
 * and cold-start taps (via getLastNotificationResponseAsync).
 */
export function routeForNotification(nav: Nav, payload: TapPayload): void {
  if (!nav.isReady()) return;

  // Use the untyped dispatch path so this router is decoupled from the exact
  // RootParamList type, which varies across navigation stack versions.
  const navigate = (name: string, params?: object) => {
    nav.dispatch({
      type: "NAVIGATE",
      payload: { name, params },
    });
  };

  switch (payload.type) {
    case "BOOKING_CREATED":
    case "BOOKING_CONFIRMED":
    case "BOOKING_CANCELLED":
    case "PAYMENT_RECEIVED":
      navigate("Profile", {
        screen: "MyBookings",
        params: payload.relatedEntityId
          ? { bookingId: payload.relatedEntityId }
          : undefined,
      });
      break;

    case "CHAT_MESSAGE":
    case "NEW_MESSAGE":
      if (payload.relatedEntityId) {
        navigate("Messages", {
          screen: "ChatRoom",
          params: { otherUserId: payload.relatedEntityId },
        });
      } else {
        navigate("Messages");
      }
      break;

    case "TRIAGE_RESULT":
      navigate("MyPets", {
        screen: "Triage",
        params: payload.relatedEntityId
          ? { historyId: payload.relatedEntityId }
          : undefined,
      });
      break;

    case "GROUP_POST":
    case "POST_COMMENT":
      if (payload.relatedEntityId) {
        navigate("Community", {
          screen: "GroupDetail",
          params: { groupId: payload.relatedEntityId },
        });
      } else {
        navigate("Community");
      }
      break;

    case "SOS_ALERT":
    case "VACCINE_DUE":
      navigate("MyPets");
      break;

    default:
      navigate("Profile", { screen: "Notifications" });
      break;
  }

  // Mark the originating notification as read after navigating.
  if (payload.notificationId) {
    useNotificationStore
      .getState()
      .markRead(payload.notificationId)
      .catch(() => {});
  }
}
