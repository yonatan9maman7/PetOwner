/**
 * Public web profile path (kept in sync with API default ProviderShare:WebProfileUrlTemplate).
 * Deep link is best-effort until universal-link configuration points `petowner.app` into the app.
 */
export function publicProviderProfileUrl(providerId: string): string {
  return `https://petowner.app/p/${providerId}`;
}

export function appProviderProfileDeepLink(providerId: string): string {
  return `petowner://p/${encodeURIComponent(providerId)}`;
}
