export type DogSizeKey = "SMALL" | "MEDIUM" | "LARGE" | "GIANT";
export type SubTab = "nearby" | "live" | "events";

export function formatDistance(km: number, isRTL: boolean): string {
  const rounded = Math.round(km * 2) / 2;
  const dist = rounded < 1 ? `${Math.round(rounded * 1000)}m` : `${rounded} km`;
  return dist;
}

export function formatRemaining(expiresAt: string): { minutes: number; label: string; urgent: boolean } {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const urgent = minutes <= 15;
  const label = minutes <= 0 ? "Expired" : `${minutes}m left`;
  return { minutes, label, urgent };
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
