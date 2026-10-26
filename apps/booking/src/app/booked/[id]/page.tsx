import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { account, data } from "@/lib/data";
import { cancelCutoff } from "@/lib/cutoff";
import { requireCustomer } from "@/lib/guard";
import { formatVnd } from "@/lib/money";
import { formatDayLong, formatTime, formatTimeRange, vnDateKey, formatDayShort, nowMs } from "@/lib/time";

// C9 Booked.
export default async function BookedPage({ params }: PageProps<"/booked/[id]">) {
  const { id } = await params;
  const me = await requireCustomer(`/booked/${id}`);
  const t = await getTranslations("booked");
  const locale = await getLocale();
  const [bookings, settings] = await Promise.all([account().myBookings(), data().settings()]);
  const b = bookings.find((x) => x.id === id);
  if (!b) notFound();
  const cutoff = cancelCutoff(b.session.startsAt, settings.cancelCutoffTime);
  const who = [t("you"), ...b.childNames].join(" + ");
  return (
    <div className="page">
      <TopBar />
      <main className="page-body" style={{ padding: "16px 20px 24px" }}>
        <div className="tick" aria-hidden="true">✓</div>
        <h1 className="heading" style={{ fontSize: 30 }}>{t("title", { name: me.fullName.split(" ")[0] })}</h1>
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 17 }}>{b.session.title}</div>
          <div className="muted">{formatDayLong(vnDateKey(b.session.startsAt), locale)} · {formatTimeRange(b.session.startsAt, b.session.endsAt, locale)}</div>
          <div style={{ marginTop: 6 }}>{who}</div>
          <div style={{ marginTop: 8 }}>
            {b.unpaid ? (
              <span className="row"><span className="tag tag-pay">{t("payOnTheDay")}</span><strong>{formatVnd(b.amountDueVnd, locale)}</strong></span>
            ) : b.packName ? (
              <span className="muted small">{t("fromPack", { n: b.credits, pack: b.packName })}</span>
            ) : null}
          </div>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          {nowMs() < cutoff.getTime()
            ? t("freeCancel", { time: formatTime(cutoff, locale), day: formatDayShort(vnDateKey(cutoff), locale) })
            : t("cantCancel")}
          {" "}{t("emailSent")}
        </p>
        <a className="btn-secondary" href={`/bookings/${b.id}/calendar`} download>{t("addToCalendar")}</a>
        <Link className="btn" href="/bookings" style={{ marginTop: "auto" }}>{t("seeBookings")}</Link>
        <Link className="link-center" href="/classes">{t("bookAnother")}</Link>
      </main>
    </div>
  );
}
