/**
 * API and SignalR base URL (no trailing slash).
 * Beta/release builds should always set `EXPO_PUBLIC_API_URL` in `.env` / EAS secrets.
 * Fallback exists only so local `expo start` runs without env; it is not localhost.
 */
const REMOTE_URL = "http://jonathanmaman-001-site1.ltempurl.com";

const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
export const SERVER_ROOT_URL =
  fromEnv && fromEnv.length > 0 ? fromEnv.replace(/\/+$/, "") : REMOTE_URL;

if (__DEV__ && (!fromEnv || fromEnv.length === 0)) {
  // eslint-disable-next-line no-console
  console.warn(
    "[PetOwner] EXPO_PUBLIC_API_URL is unset; using built-in API host. Set it in .env for a stable backend.",
  );
}

export const API_BASE_URL = `${SERVER_ROOT_URL}/api`;

export const NOTIFICATIONS_HUB_URL = `${SERVER_ROOT_URL}/hubs/notifications`;
export const CHAT_HUB_URL = `${SERVER_ROOT_URL}/hubs/chat`;
