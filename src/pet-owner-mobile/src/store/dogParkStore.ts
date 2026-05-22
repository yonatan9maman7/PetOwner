import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const KEY_CHECK_IN_EXPIRATION = "dog_park_check_in_expiration";

interface DogParkState {
  /** Unix ms timestamp when the current check-in expires, or null if not active. */
  lastCheckInExpiration: number | null;
  /** Persist and set a new expiration timestamp. Pass null to clear. */
  setCheckInExpiration: (ts: number | null) => Promise<void>;
  /** Load persisted expiration on app start; drops stale values. */
  hydrate: () => Promise<void>;
}

export const useDogParkStore = create<DogParkState>((set) => ({
  lastCheckInExpiration: null,

  setCheckInExpiration: async (ts) => {
    if (ts === null) {
      await storage.remove(KEY_CHECK_IN_EXPIRATION);
    } else {
      await storage.set(KEY_CHECK_IN_EXPIRATION, String(ts));
    }
    set({ lastCheckInExpiration: ts });
  },

  hydrate: async () => {
    const raw = await storage.get(KEY_CHECK_IN_EXPIRATION);
    if (!raw) {
      set({ lastCheckInExpiration: null });
      return;
    }
    const ts = Number(raw);
    if (isNaN(ts) || ts <= Date.now()) {
      await storage.remove(KEY_CHECK_IN_EXPIRATION);
      set({ lastCheckInExpiration: null });
    } else {
      set({ lastCheckInExpiration: ts });
    }
  },
}));
