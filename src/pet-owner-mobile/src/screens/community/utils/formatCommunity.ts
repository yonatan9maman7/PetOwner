import type { Language } from "../../../i18n";

/** Relative time for community cards (Hebrew / English). */
export function formatCommunityRelativeTime(iso: string, language: Language): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return language === "he" ? "עכשיו" : "Just now";
  if (mins < 60) return language === "he" ? `לפני ${mins} דק׳` : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return language === "he"
      ? `לפני ${hrs} ${hrs === 1 ? "שעה" : "שעות"}`
      : `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hrs / 24);
  return language === "he"
    ? `לפני ${days} ${days === 1 ? "יום" : "ימים"}`
    : `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Distance label (km / ק״מ). */
export function formatCommunityDistanceKm(km: number, language: Language): string {
  const v = km < 1 ? km.toFixed(1) : km.toFixed(1);
  return language === "he" ? `${v} ק״מ` : `${v} km`;
}
