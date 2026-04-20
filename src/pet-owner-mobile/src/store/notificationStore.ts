import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
  HubConnectionState,
} from "@microsoft/signalr";
import axios from "axios";
import { Alert } from "react-native";
import { create } from "zustand";
import { notificationsApi } from "../api/client";
import { translate } from "../i18n";
import { NOTIFICATIONS_HUB_URL } from "../config/server";
import type { NotificationDto } from "../types/api";

function normalizeHubNotification(raw: unknown): NotificationDto {
  const r = raw as Record<string, unknown>;
  const pick = (a: string, b: string) => r[a] ?? r[b];
  const rel = pick("relatedEntityId", "RelatedEntityId");
  const uid = pick("userId", "UserId");
  return {
    id: String(pick("id", "Id") ?? ""),
    userId: uid != null && uid !== "" ? String(uid) : undefined,
    type: String(pick("type", "Type") ?? ""),
    title: String(pick("title", "Title") ?? ""),
    message: String(pick("message", "Message") ?? ""),
    relatedEntityId:
      rel != null && rel !== "" ? String(rel) : undefined,
    isRead: Boolean(pick("isRead", "IsRead")),
    createdAt: String(pick("createdAt", "CreatedAt") ?? ""),
  };
}

interface NotificationState {
  notifications: NotificationDto[];
  unreadCount: number;
  loading: boolean;

  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  pushLive: (n: NotificationDto) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const data = await notificationsApi.getAll();
      const unreadCount = data.filter((n) => !n.isRead).length;
      set({ notifications: data, unreadCount, loading: false });
    } catch (error) {
      set({ loading: false });
      if (axios.isAxiosError(error) && error.response?.status === 401) return;
      Alert.alert(translate("genericErrorTitle"), translate("genericErrorDesc"));
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { count } = await notificationsApi.getUnreadCount();
      set({ unreadCount: count });
    } catch {}
  },

  markRead: async (id) => {
    try {
      await notificationsApi.markRead(id);
      const notifications = get().notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      );
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      });
    } catch {}
  },

  markAllRead: async () => {
    try {
      await notificationsApi.markAllRead();
      set({
        notifications: get().notifications.map((n) => ({
          ...n,
          isRead: true,
        })),
        unreadCount: 0,
      });
    } catch {}
  },

  removeNotification: async (id) => {
    try {
      await notificationsApi.remove(id);
      const notifications = get().notifications.filter((n) => n.id !== id);
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      });
    } catch {}
  },

  pushLive: (n) => {
    set((s) => ({
      notifications: [n, ...s.notifications],
      unreadCount: s.unreadCount + (n.isRead ? 0 : 1),
    }));
  },

  reset: () => set({ notifications: [], unreadCount: 0, loading: false }),
}));

// ── SignalR notification hub connection ─────────────────────────────

let hubConnection: HubConnection | null = null;
let toastCallback: ((n: NotificationDto) => void) | null = null;

export function setToastCallback(cb: (n: NotificationDto) => void) {
  toastCallback = cb;
}

export async function startNotificationHub(
  tokenGetter: () => string,
): Promise<void> {
  const token = tokenGetter();
  if (!token) return;

  if (
    hubConnection &&
    hubConnection.state !== HubConnectionState.Disconnected
  ) {
    return;
  }

  hubConnection = new HubConnectionBuilder()
    .withUrl(NOTIFICATIONS_HUB_URL, {
      accessTokenFactory: tokenGetter,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.None)
    .build();

  hubConnection.on("NotificationReceived", (data: unknown) => {
    const n = normalizeHubNotification(data);
    useNotificationStore.getState().pushLive(n);
    toastCallback?.(n);
  });

  try {
    await hubConnection.start();
  } catch {
    hubConnection = null;
  }
}

export async function stopNotificationHub(): Promise<void> {
  if (!hubConnection) return;
  try {
    await hubConnection.stop();
  } catch {}
  hubConnection = null;
}
