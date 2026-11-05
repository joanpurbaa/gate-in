/**
 * Normalisasi nomor WhatsApp Indonesia ke format `628xxxxxxxxxx`.
 * Mengembalikan `null` bila format tidak valid (minimal 10 digit, maksimal 15 digit).
 */
export function normalizePhoneTo62(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith("0")) {
    normalized = "62" + normalized.slice(1);
  } else if (normalized.startsWith("8")) {
    normalized = "62" + normalized;
  }

  if (!normalized.startsWith("628")) return null;
  if (normalized.length < 10 || normalized.length > 15) return null;
  return normalized;
}
