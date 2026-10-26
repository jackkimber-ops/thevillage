import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { data } from "@/lib/data";
import { formatDayLong, formatTimeRange, vnDateKey } from "@/lib/time";

// C9 for guests: they have no account page to look at, so the confirmation lives in their email.
export default async function GuestBookedPage({ searchParams }: PageProps<"/booked/guest">) {
  const sp = await searchParams;
  const t = await getTranslations("booked");
  const locale = await getLocale();
  const s = typeof sp.session === "string" ? await data().session(sp.session, locale) : null;
  const email = typeof sp.email === "string" ? sp.email : "";
  return (
    <div className="page">
      <TopBar />
      <main className="page-body" style={{ padding: "16px 20px 24px" }}>
        <div className="tick" aria-hidden="true">✓</div>
        <h1 className="heading" style={{ fontSize: 30 }}>{t("guestTitle")}</h1>
        {s && (
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 17 }}>{s.title}</div>
            <div className="muted">{formatDayLong(vnDateKey(s.startsAt), locale)} · {formatTimeRange(s.startsAt, s.endsAt, locale)}</div>
          </div>
        )}
        <p style={{ margin: 0, lineHeight: 1.5 }}>{t("guestBody", { email })}</p>
        <Link className="btn" href={`/login?next=${encodeURIComponent("/bookings")}`} style={{ marginTop: "auto" }}>{t("logInToSee")}</Link>
        <Link className="link-center" href="/classes">{t("bookAnother")}</Link>
      </main>
    </div>
  );
}
