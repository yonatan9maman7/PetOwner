import { Alert } from "react-native";
import axios from "axios";
import { create } from "zustand";
import { notificationsApi } from "../api/client";
import { translate } from "../i18n";

export type NotifPrefKey =
  | "push"
  | "messages"
  | "bookings"
  | "community"
  | "triage"
  | "marketing";

export const ALL_NOTIF_PREF_KEYS: NotifPrefKey[] = [
  "push",
  "messages",
  "bookings",
  "community",
  "triage",
  "marketing",
];

const DEFAULT_PREFS: Record<NotifPrefKey, boolean> = {
  push: true,
  messages: true,
  bookings: true,
  community: true,
  triage: true,
  marketing: true,
};

interface NotifPrefsState {
  prefs: Record<NotifPrefKey, boolean>;
  loading: boolean;
  dirty: boolean;
  fetch: () => Promise<void>;
  setPref: (key: NotifPrefKey, value: boolean) => void;
  save: () => Promise<void>;
  reset: () => void;
}

export const useNotificationPrefsStore = create<NotifPrefsState>((set, get) => ({
  prefs: { ...DEFAULT_PREFS },
  loading: false,
  dirty: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const data = await notificationsApi.getPrefs();
      const prefs: Record<NotifPrefKey, boolean> = { ...DEFAULT_PREFS };
      for (const key of ALL_NOTIF_PREF_KEYS) {
        if (typeof data[key] === "boolean") {
          prefs[key] = data[key];
        }
      }
      set({ prefs, dirty: false });
    } catch (error) {
      if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
        Alert.alert(
          translate("genericErrorTitle"),
          translate("genericErrorDesc"),
        );
      }
    } finally {
      set({ loading: false });
    }
  },

  setPref: (key, value) => {
    set((s) => ({ prefs: { ...s.prefs, [key]: value }, dirty: true }));
  },

  save: async () => {
    set({ loading: true });
    try {
      await notificationsApi.updatePrefs(get().prefs);
      set({ dirty: false });
    } catch (error) {
      if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
        Alert.alert(
          translate("genericErrorTitle"),
          translate("genericErrorDesc"),
        );
      }
    } finally {
      set({ loading: false });
    }
  },

  reset: () =>
    set({ prefs: { ...DEFAULT_PREFS }, dirty: false, loading: false }),
}));
