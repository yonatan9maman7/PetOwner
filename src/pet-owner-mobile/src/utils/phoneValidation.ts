/**
 * Client-side phone check: optional leading '+', digits only, 9–15 digits total
 * (common range for national / international mobiles without strict E.164 parsing).
 */
export function isValidPhoneFormat(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return false;
  return /^\+?[0-9]{9,15}$/.test(trimmed);
}
