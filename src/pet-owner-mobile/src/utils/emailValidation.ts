/**
 * Client-side email format check, aligned with common server-side
 * `[EmailAddress]` expectations (ASCII local part + domain with TLD).
 */
export function isValidEmailFormat(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;

  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  if (!localPart || localPart.length > 64 || !domain || domain.length > 253) return false;
  if (!domain.includes(".")) return false;

  const labels = domain.split(".");
  const tld = labels[labels.length - 1] ?? "";
  if (tld.length < 2) return false;

  const localOk = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart);
  const domainOk = /^[a-zA-Z0-9.-]+$/.test(domain) && !labels.some((l) => !l || l.startsWith("-") || l.endsWith("-"));

  return localOk && domainOk;
}
