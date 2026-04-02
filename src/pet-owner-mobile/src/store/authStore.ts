import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { Language } from "../i18n";

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

interface AuthState {
  token: string | null;
  userId: string | null;
  isLoggedIn: boolean;
  language: Language;
  hydrated: boolean;
  setAuth: (token: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  userId: null,
  isLoggedIn: false,
  language: "he",
  hydrated: false,

  setAuth: async (token, userId) => {
    await storage.set("auth_token", token);
    await storage.set("user_id", userId);
    set({ token, userId, isLoggedIn: true });
  },

  logout: async () => {
    await storage.remove("auth_token");
    await storage.remove("user_id");
    set({ token: null, userId: null, isLoggedIn: false });
  },

  setLanguage: async (lang) => {
    if (lang === get().language) return;
    await storage.set("app_language", lang);
    set({ language: lang });
  },

  hydrate: async () => {
    const [token, userId, lang] = await Promise.all([
      storage.get("auth_token"),
      storage.get("user_id"),
      storage.get("app_language"),
    ]);
    set({
      token,
      userId,
      isLoggedIn: !!token,
      language: (lang as Language) ?? "he",
      hydrated: true,
    });
  },
}));
