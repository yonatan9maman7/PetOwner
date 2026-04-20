/**
 * Normalizes an Israeli phone number for equality comparison.
 * Strips non-digits, removes +972 country code and leading 0
 * so that +972-50-123-4567, 050-123-4567, and 0501234567 all
 * resolve to the same string "501234567".
 *
 * Returns empty string when the input has no meaningful digits.
 */
export function normalizePhoneForCompare(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";

  let trimmed = digits;
  if (trimmed.startsWith("972")) trimmed = trimmed.slice(3);
  if (trimmed.startsWith("0")) trimmed = trimmed.slice(1);

  return trimmed;
}

/** Digits-only domestic mobile: 05 + 8 digits (allows +972… input). */
export function toDomesticMobileDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  return d;
}

export function isIsraeliMobileValid(raw: string): boolean {
  return /^05\d{8}$/.test(toDomesticMobileDigits(raw));
}

/**
 * Mobile (05…) or Israeli geographic / VoIP landline (e.g. 03-, 09-, 072-).
 * For businesses that list a main office or Bezeq line instead of a mobile.
 */
export function isIsraeliBusinessPhoneValid(raw: string): boolean {
  const d = toDomesticMobileDigits(raw);
  if (/^05\d{8}$/.test(d)) return true;
  // Geographic: 02 / 03 / 04 / 08 / 09 + 7 digits (9 total)
  if (/^0[23489]\d{7}$/.test(d)) return true;
  // 10-digit numbers starting with 072–079 (VoIP / some business lines)
  if (/^07[2-9]\d{7}$/.test(d)) return true;
  return false;
}

export function isPhoneInputEmpty(raw: string): boolean {
  return toDomesticMobileDigits(raw).length === 0;
}
