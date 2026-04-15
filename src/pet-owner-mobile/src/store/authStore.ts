import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
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

const CLAIM_USER_ID =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const CLAIM_NAME =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
const CLAIM_EMAIL =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
const CLAIM_ROLE =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

interface JwtPayload {
  [key: string]: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

function decodeUser(token: string): UserInfo | null {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return {
      id: decoded[CLAIM_USER_ID] ?? "",
      name: decoded[CLAIM_NAME] ?? "",
      email: decoded[CLAIM_EMAIL] ?? "",
      role: decoded[CLAIM_ROLE] ?? "",
    };
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

interface AuthState {
  token: string | null;
  userId: string | null;
  user: UserInfo | null;
  isLoggedIn: boolean;
  language: Language;
  hydrated: boolean;
  setAuth: (token: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  hydrate: () => Promise<void>;
}

function getToken(): string {
  return useAuthStore.getState().token ?? "";
}

function startHubs() {
  const token = getToken();
  if (!token) return;

  import("../services/signalr").then((m) => m.startConnection().catch(() => {}));
  import("./notificationStore").then((m) => {
    m.startNotificationHub(getToken).catch(() => {});
    m.useNotificationStore.getState().fetchUnreadCount().catch(() => {});
  });
  import("./favoritesStore").then((m) => {
    m.useFavoritesStore.getState().fetchIds().catch(() => {});
  });
  import("./chatStore").then((m) => {
    m.useChatStore.getState().fetchConversations().catch(() => {});
  });
}

function stopHubs() {
  import("../services/signalr").then((m) => m.stopConnection().catch(() => {}));
  import("./notificationStore").then((m) => {
    m.stopNotificationHub().catch(() => {});
    m.useNotificationStore.getState().reset();
  });
  import("./favoritesStore").then((m) => {
    m.useFavoritesStore.getState().reset();
  });
  import("./chatStore").then((m) => {
    m.useChatStore.getState().reset();
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  userId: null,
  user: null,
  isLoggedIn: false,
  language: "he",
  hydrated: false,

  setAuth: async (token, userId) => {
    await storage.set("auth_token", token);
    await storage.set("user_id", userId);
    const user = decodeUser(token);
    set({ token, userId, user, isLoggedIn: true });
    startHubs();
  },

  logout: async () => {
    stopHubs();
    await storage.remove("auth_token");
    await storage.remove("user_id");
    set({ token: null, userId: null, user: null, isLoggedIn: false });
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

    const expired = token ? isTokenExpired(token) : false;
    if (expired) {
      await storage.remove("auth_token");
      await storage.remove("user_id");
      set({
        token: null,
        userId: null,
        user: null,
        isLoggedIn: false,
        language: (lang as Language) ?? "he",
        hydrated: true,
      });
      return;
    }

    const user = token ? decodeUser(token) : null;
    const loggedIn = !!token;
    set({
      token,
      userId,
      user,
      isLoggedIn: loggedIn,
      language: (lang as Language) ?? "he",
      hydrated: true,
    });

    if (loggedIn) startHubs();
  },
}));
