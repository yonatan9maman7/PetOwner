/** Production API host (no trailing slash). Fallback when EXPO_PUBLIC_API_URL is unset. */
const REMOTE_URL = "http://jonathanmaman-001-site1.ltempurl.com";

const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
export const SERVER_ROOT_URL =
  fromEnv && fromEnv.length > 0 ? fromEnv.replace(/\/+$/, "") : REMOTE_URL;

export const API_BASE_URL = `${SERVER_ROOT_URL}/api`;

export const NOTIFICATIONS_HUB_URL = `${SERVER_ROOT_URL}/hubs/notifications`;
export const CHAT_HUB_URL = `${SERVER_ROOT_URL}/hubs/chat`;
