import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { TabBar } from "@/components/TabBar";
import { TopBar } from "@/components/TopBar";
import { account, data, type MyBooking } from "@/lib/data";
import { cancelCutoff } from "@/lib/cutoff";
import { requireCustomer } from "@/lib/guard";
import { formatVnd } from "@/lib/money";
import { formatTime, vnDateKey, nowMs } from "@/lib/time";

// C10 My bookings.
export default async function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  const sp = await searchParams;
  await requireCustomer("/bookings");
  const t = await getTranslations("bookings");
  const locale = await getLocale();
  const [all, settings] = await Promise.all([account().myBookings(), data().settings()]);
  const now = nowMs();
  const upcoming = all
    .filter((b) => b.status === "booked" && new Date(b.session.endsAt).getTime() > now)
    .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt));
  const past = all
    .filter((b) => !upcoming.includes(b) && b.status !== "cancelled")
    .sort((a, b) => b.session.startsAt.localeCompare(a.session.startsAt))
    .slice(0, 10);

  const fmt = (key: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { timeZone: "UTC", ...opts }).format(new Date(`${key}T00:00:00Z`));

  const Row = ({ b, upcomingRow }: { b: MyBooking; upcomingRow: boolean }) => {
    const day = vnDateKey(b.session.startsAt);
    const canCancel = upcomingRow && now < cancelCutoff(b.session.startsAt, settings.cancelCutoffTime).getTime();
    const who = [t("you"), ...b.childNames].join(" + ");
    return (
      <div className="booking-row">
        <div className={`date-box kind-${b.session.kind}`} aria-hidden="true">
          <span>{fmt(day, { weekday: "short" })}</span>
          <strong>{Number(day.slice(8))}</strong>
          <span>{fmt(day, { month: "short" })}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{b.session.title}</div>
          <div className="muted small">{formatTime(b.session.startsAt, locale)} · {who}</div>
          {b.unpaid ? (
            <div className="row" style={{ marginTop: 4 }}><span className="tag tag-pay">{t("payOnTheDay")}</span><strong className="small">{formatVnd(b.amountDueVnd, locale)}</strong></div>
          ) : !upcomingRow ? (
            <div className="muted small">{t(`status.${b.status}`)}</div>
          ) : null}
        </div>
        {upcomingRow && (canCancel
          ? <Link className="small-link" href={`/bookings/${b.id}/cancel`}>{t("cancel")}</Link>
          : <Link className="small-link" href="/menu#message-us">{t("messageUs")}</Link>)}
      </div>
    );
  };

  return (
    <div className="page">
      <TopBar />
      <main className="page-body">
        <h1 className="heading" style={{ fontSize: 28 }}>{t("title")}</h1>
        {sp.cancelled && <p className="ok-box" role="status">{t("cancelledNote")}</p>}
        {upcoming.length === 0 ? (
          <div className="empty">
            <p>{t("none")}</p>
            <Link className="btn" href="/classes">{t("findClass")}</Link>
          </div>
        ) : upcoming.map((b) => <Row key={b.id} b={b} upcomingRow />)}
        {past.length > 0 && <h2 className="day-label">{t("past")}</h2>}
        {past.map((b) => <Row key={b.id} b={b} upcomingRow={false} />)}
      </main>
      <TabBar current="bookings" />
    </div>
  );
}
