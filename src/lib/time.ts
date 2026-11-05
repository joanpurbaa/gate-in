/**
 * Semua waktu disimpan UTC di database dan ditampilkan dalam WIB (Asia/Jakarta, UTC+7, tanpa DST).
 */
export const TIME_ZONE = "Asia/Jakarta";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDateFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

/** "19.00" */
export function formatTime(d: Date | string): string {
  return timeFmt.format(toDate(d)).replace(":", ".");
}

/** "Sabtu, 14 Nov 2026" */
export function formatDate(d: Date | string): string {
  return dateFmt.format(toDate(d));
}

/** "14 Nov 2026" */
export function formatShortDate(d: Date | string): string {
  return shortDateFmt.format(toDate(d));
}

/** "Sabtu, 14 Nov 2026 • 19.00 WIB" */
export function formatDateTime(d: Date | string): string {
  return `${formatDate(d)} • ${formatTime(d)} WIB`;
}

/** "14 Nov 2026, 19.00 WIB" */
export function formatShortDateTime(d: Date | string): string {
  return `${formatShortDate(d)}, ${formatTime(d)} WIB`;
}

/** "18.00 – 22.00 WIB" */
export function formatTimeRange(a: Date | string, b: Date | string): string {
  return `${formatTime(a)} – ${formatTime(b)} WIB`;
}

/** Date (UTC) → nilai `<input type="datetime-local">` dalam WIB, contoh "2026-11-14T19:00". */
export function toWibInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  const shifted = new Date(toDate(d).getTime() + WIB_OFFSET_MS);
  return shifted.toISOString().slice(0, 16);
}

/** Nilai `<input type="datetime-local">` (dianggap WIB) → Date UTC. */
export function fromWibInputValue(value: string): Date {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - WIB_OFFSET_MS);
}
