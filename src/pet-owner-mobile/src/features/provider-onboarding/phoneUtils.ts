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

export function isPhoneInputEmpty(raw: string): boolean {
  return toDomesticMobileDigits(raw).length === 0;
}
