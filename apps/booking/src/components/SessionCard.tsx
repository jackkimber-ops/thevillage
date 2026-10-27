import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { TimetableEntry } from "@/lib/data";
import { formatVnd } from "@/lib/money";
import { formatDayShort, formatTime, formatTimeRange, vnDateKey } from "@/lib/time";

/**
 * One session in a list: picture, title, time, places (classes) or price (open play), and Book.
 * When the customer is already booked in (bookingId), Book becomes "✓ Booked" and opens that booking.
 */
export async function SessionCard({ s, showDay = false, bookingId, from }: { s: TimetableEntry; showDay?: boolean; bookingId?: string; from?: string }) {
  const t = await getTranslations("session");
  const locale = await getLocale();
  const when = showDay
    ? `${formatDayShort(vnDateKey(s.startsAt), locale)} · ${formatTime(s.startsAt, locale)}`
    : formatTimeRange(s.startsAt, s.endsAt, locale);
  const line =
    s.kind === "open_play"
      ? s.priceVnd !== null ? t("perChild", { price: formatVnd(s.priceVnd, locale) }) : null
      : s.isFull ? null : s.placesLeft !== null && s.capacity !== null ? t("placesLeft", { left: s.placesLeft, capacity: s.capacity }) : null;
  return (
    <div className="session-card">
      {s.pictureUrl ? (
        <div className="session-pic has-badge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.pictureUrl} alt="" />
        </div>
      ) : (
        <div className={`session-pic kind-${s.kind}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-house-linen-badge.png" alt="" />
        </div>
      )}
      <div className="session-info">
        <div className="session-title">{s.title}</div>
        <div className="session-meta">{s.instructorName ? `${when} · ${s.instructorName}` : when}</div>
        {line && <div className="session-left">{line}</div>}
      </div>
      {bookingId ? (
        <Link className="booked-pill" href={`/bookings#booking-${bookingId}`} aria-label={`${t("booked")}: ${s.title}, ${when}. ${t("seeBooking")}`}>
          ✓ {t("booked")}
        </Link>
      ) : s.isFull ? (
        <span className="full-label">{t("full")}</span>
      ) : s.bookingClosed ? (
        <span className="full-label">{t("closed")}</span>
      ) : (
        <Link className="btn-small" href={sessionHref(s.id, from)} aria-label={`${t("book")}: ${s.title}, ${when}`}>
          {t("book")}
        </Link>
      )}
    </div>
  );
}

/** A class page link that remembers the timetable view it came from, so Back returns to the same week. */
export function sessionHref(id: string, from?: string) {
  return from ? `/classes/${id}?from=${encodeURIComponent(from)}` : `/classes/${id}`;
}
