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

const dayNumberFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  day: "numeric",
});

const shortMonthFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  month: "short",
});

const shortWeekdayFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  weekday: "short",
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

/** Hari (angka saja), contoh "16" */
export function formatDayNumber(d: Date | string): string {
  return dayNumberFmt.format(toDate(d));
}

/** Bulan singkat kapital, contoh "NOV" */
export function formatShortMonth(d: Date | string): string {
  return shortMonthFmt.format(toDate(d)).toUpperCase();
}

/** Hari singkat, contoh "Sen" */
export function formatShortWeekday(d: Date | string): string {
  return shortWeekdayFmt.format(toDate(d));
}

/** Format hero: "Sen, 16 Nov, 19.30 WIB" */
export function formatHeroDate(d: Date | string): string {
  const dt = toDate(d);
  return `${formatShortWeekday(dt)}, ${formatDayNumber(dt)} ${shortMonthFmt.format(dt)}, ${formatTime(dt)} WIB`;
}

/** Cek apakah suatu tanggal jatuh pada akhir pekan terdekat (Jumat s/d Minggu terdekat) dalam WIB */
export function isUpcomingWeekend(d: Date | string, refDate: Date = new Date()): boolean {
  const dt = toDate(d);
  const wibRef = new Date(refDate.getTime() + WIB_OFFSET_MS);
  const dayOfWeek = wibRef.getUTCDay(); // 0 = Minggu, 1 = Senin, ..., 5 = Jumat, 6 = Sabtu

  // Tentukan tanggal Jumat dari akhir pekan terdekat:
  // Jika hari ini Minggu (0), akhir pekan terdekat masih Jumat s/d hari ini Minggu (offset -2 hari)
  // Jika hari ini Senin (1), Jumat adalah +4 hari
  // Jika hari ini Selasa (2), Jumat adalah +3 hari
  // Jika hari ini Rabu (3), Jumat adalah +2 hari
  // Jika hari ini Kamis (4), Jumat adalah +1 hari
  // Jika hari ini Jumat (5), Jumat adalah hari ini (offset 0)
  // Jika hari ini Sabtu (6), Jumat adalah kemarin (offset -1)
  let daysToFriday = 5 - dayOfWeek;
  if (dayOfWeek === 0) {
    daysToFriday = -2;
  }

  const friYear = wibRef.getUTCFullYear();
  const friMonth = wibRef.getUTCMonth();
  const friDate = wibRef.getUTCDate() + daysToFriday;

  const startWeekendUtc = new Date(Date.UTC(friYear, friMonth, friDate, -7, 0, 0, 0)); // Jumat 00.00 WIB
  const endWeekendUtc = new Date(Date.UTC(friYear, friMonth, friDate + 2, 16, 59, 59, 999)); // Minggu 23.59.59 WIB (23-7 = 16 UTC)

  return dt.getTime() >= startWeekendUtc.getTime() && dt.getTime() <= endWeekendUtc.getTime();
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
