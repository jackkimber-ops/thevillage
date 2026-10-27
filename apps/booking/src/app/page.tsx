import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SessionCard } from "@/components/SessionCard";
import { TopBar } from "@/components/TopBar";
import { data } from "@/lib/data";
import { myBookedSessions } from "@/lib/my-booked";

// C0 Home: the first page before logging in.
export default async function Home() {
  const t = await getTranslations("home");
  const db = data();
  const now = new Date();
  const [settings, upcoming, booked] = await Promise.all([
    db.settings(),
    // The whole booking window, so "coming up" still shows something when the next class is weeks away.
    db.timetable(now, new Date(now.getTime() + 31 * 86400000)),
    myBookedSessions(),
  ]);
  // The next 3 sessions people can still book: more than 1 hour away and not full.
  const next = upcoming.filter((s) => new Date(s.startsAt).getTime() > now.getTime() + 3600000 && !s.isFull).slice(0, 3);

  return (
    <div className="page">
      <TopBar extra={<Link href="/login" style={{ fontSize: 15, fontWeight: 600, padding: "8px" }}>{t("logIn")}</Link>} />
      <main className="page-body">
        <section className="hero">
          <div className="hero-text">
            <h1 className="heading hero-title">{t("title")}</h1>
            <p>{t("subtitle")}</p>
          </div>
        </section>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
          <h2 className="day-label" style={{ margin: 0 }}>{t("comingUp")}</h2>
          <Link href="/classes" style={{ fontSize: 14, fontWeight: 600 }}>{t("seeAll")}</Link>
        </div>
        {next.length === 0 ? <p className="empty">{t("nothingSoon")}</p> : next.map((s) => <SessionCard key={s.id} s={s} showDay bookingId={booked.get(s.id)} />)}
        <p className="muted" style={{ margin: 0, fontSize: 13, textAlign: "center" }}>{t("firstClass")}</p>

        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
          {/* Change list #7: a picture of the map (owners' Google Maps screenshot); tapping opens Google Maps. */}
          <a className="map-picture" href={settings.mapsUrl ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={t("mapAlt")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/map-the-village.jpg" alt="" width={1000} height={475} />
            <span className="map-credit">Map data © Google</span>
          </a>
          <div style={{ padding: "0 4px" }}>
            <h2 className="heading" style={{ fontSize: 18 }}>{t("findUs")}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 14, lineHeight: 1.45 }}>
              {settings.address}
              <br />
              <span className="muted">{settings.openingHours}</span>
            </p>
          </div>
          {settings.mapsUrl && (
            <a className="btn-secondary" style={{ minHeight: 44 }} href={settings.mapsUrl} target="_blank" rel="noopener noreferrer">
              {t("openMaps")}
            </a>
          )}
        </section>
      </main>
    </div>
  );
}
