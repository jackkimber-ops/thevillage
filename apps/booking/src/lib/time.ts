// Studio time: every date the customer sees is a Saigon date (Asia/Ho_Chi_Minh, UTC+7, no daylight saving).
export const STUDIO_TZ = "Asia/Ho_Chi_Minh";
const OFFSET_MS = 7 * 60 * 60 * 1000;

/** "YYYY-MM-DD" for the Saigon calendar day of an instant. */
export function vnDateKey(instant: Date | string): string {
  const d = new Date(new Date(instant).getTime() + OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

/** The instant a Saigon calendar day starts (00:00 +07:00). */
export function vnDayStart(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+07:00`);
}

export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing the date. */
export function weekStart(dateKey: string): string {
  const day = new Date(`${dateKey}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(dateKey, -((day + 6) % 7));
}

export function monthStart(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

export function addMonths(dateKey: string, months: number): string {
  const d = new Date(`${monthStart(dateKey)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function intlLocale(locale: string) {
  return locale === "vi" ? "vi-VN" : "en-GB";
}

/** "9:00" style time in Saigon. */
export function formatTime(instant: Date | string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: STUDIO_TZ, hour: "numeric", minute: "2-digit", hour12: false })
    .format(new Date(instant))
    .replace(/^0(\d):/, "$1:");
}

export function formatTimeRange(start: Date | string, end: Date | string, locale: string): string {
  return `${formatTime(start, locale)}–${formatTime(end, locale)}`;
}

/** e.g. "Mon 2 Nov" (en) / "T2, 2 thg 11" (vi) for a Saigon date key. */
export function formatDayShort(dateKey: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })
    .format(new Date(`${dateKey}T00:00:00Z`));
}

/** e.g. "Monday 2 Nov". */
export function formatDayLong(dateKey: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", weekday: "long", day: "numeric", month: "short" })
    .format(new Date(`${dateKey}T00:00:00Z`));
}

/** e.g. "November 2026". */
export function formatMonth(dateKey: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", month: "long", year: "numeric" })
    .format(new Date(`${dateKey}T00:00:00Z`));
}

/** e.g. "2 – 8 November" for a week starting Monday. */
export function formatWeekRange(mondayKey: string, locale: string): string {
  return formatRange(mondayKey, addDays(mondayKey, 6), locale);
}

/** e.g. "25 – 31 October", or "30 Nov – 6 Dec" across months. */
export function formatRange(fromKey: string, toKey: string, locale: string): string {
  const mondayKey = fromKey;
  const sunday = toKey;
  const f = (key: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", ...opts }).format(new Date(`${key}T00:00:00Z`));
  if (mondayKey.slice(0, 7) === sunday.slice(0, 7)) {
    return `${f(mondayKey, { day: "numeric" })} – ${f(sunday, { day: "numeric", month: "long" })}`;
  }
  return `${f(mondayKey, { day: "numeric", month: "short" })} – ${f(sunday, { day: "numeric", month: "short" })}`;
}

export function minutesBetween(start: Date | string, end: Date | string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

/** The current time (server components read it once per request). */
export function nowMs(): number {
  return Date.now();
}
