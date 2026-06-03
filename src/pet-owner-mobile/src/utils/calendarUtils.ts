import * as Calendar from "expo-calendar";
import { Alert, Platform } from "react-native";
import type { BookingDto } from "../types/api";
import { translate } from "../i18n";

export async function addBookingToDeviceCalendar(
  booking: BookingDto,
  role: "owner" | "provider",
): Promise<void> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        translate("calendarPermissionDeniedTitle"),
        translate("calendarPermissionDeniedDesc"),
      );
      return;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = calendars.find(
      (c) =>
        c.allowsModifications &&
        (Platform.OS === "ios"
          ? c.source?.type === Calendar.SourceType.LOCAL ||
            c.source?.type === Calendar.SourceType.CALDAV
          : c.accessLevel === Calendar.CalendarAccessLevel.OWNER),
    );

    if (!writable) {
      Alert.alert(
        translate("calendarPermissionDeniedTitle"),
        translate("calendarNoWritableCalendar"),
      );
      return;
    }

    const contactPhone =
      role === "owner" ? booking.providerPhone : booking.ownerPhone;
    const notesLines = [
      booking.notes,
      contactPhone
        ? `${translate("calendarPhone")}: ${contactPhone}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const counterpartyName =
      role === "owner" ? booking.providerName : booking.ownerName;

    await Calendar.createEventAsync(writable.id, {
      title: `${booking.service} ${translate("calendarWith")} ${counterpartyName}`,
      startDate: new Date(booking.startDate),
      endDate: new Date(booking.endDate),
      location: booking.location ?? undefined,
      notes: notesLines || undefined,
      alarms: [{ relativeOffset: -60 }],
    });

    Alert.alert(
      translate("calendarAddedTitle"),
      translate("calendarAddedDesc"),
    );
  } catch {
    Alert.alert(
      translate("calendarAddFailedTitle"),
      translate("calendarAddFailedDesc"),
    );
  }
}
