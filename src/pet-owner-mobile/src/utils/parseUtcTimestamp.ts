/**
 * Server stores UTC instants but often serializes without a timezone (Unspecified).
 * ECMAScript parses those as *local* wall time, shifting the instant by the user's offset.
 * Treat bare ISO 8601 datetimes from the API as UTC.
 */
export function parseUtcTimestamp(
  iso: string | undefined | null,
): Date | null {
  if (iso == null) return null;
  const s = String(iso).trim();
  if (!s) return null;

  if (
    /Z$/i.test(s) ||
    /[+-]\d{2}:\d{2}$/.test(s) ||
    /[+-]\d{4}$/.test(s)
  ) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    const d = new Date(`${s}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
