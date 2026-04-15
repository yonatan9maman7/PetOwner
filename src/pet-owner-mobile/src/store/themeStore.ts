import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "app_theme";

const storage = {
  async get(): Promise<ThemePreference> {
    try {
      const val =
        Platform.OS === "web"
          ? localStorage.getItem(STORAGE_KEY)
          : await SecureStore.getItemAsync(STORAGE_KEY);
      if (val === "light" || val === "dark" || val === "system") return val;
    } catch {}
    return "system";
  },
  async set(value: ThemePreference): Promise<void> {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(STORAGE_KEY, value);
      } else {
        await SecureStore.setItemAsync(STORAGE_KEY, value);
      }
    } catch {}
  },
};

interface ThemeState {
  preference: ThemePreference;
  hydrated: boolean;
  setPreference: (pref: ThemePreference) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "system",
  hydrated: false,

  setPreference: async (pref) => {
    await storage.set(pref);
    set({ preference: pref });
  },

  hydrate: async () => {
    const pref = await storage.get();
    set({ preference: pref, hydrated: true });
  },
}));
