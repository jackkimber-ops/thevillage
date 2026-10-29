import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { bookingUrl, studio } from "@/lib/settings";

// W1 One-page website. Wording from the requirements doc (draft); photos are placeholders until the owners send them.
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("site");
  const s = await studio();
  const other = locale === "vi" ? { href: "/", label: "EN", name: "English" } : { href: "/vi", label: "VN", name: "Tiếng Việt" };
  const book = bookingUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ExerciseGym",
    name: s.name,
    address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: "Hồ Chí Minh", addressCountry: "VN" },
    email: s.contactEmail,
    telephone: s.contactPhone,
    url: "https://thevillagesaigon.com",
    sameAs: [s.facebookUrl, s.instagramUrl].filter(Boolean),
  };

  return (
    <div className="site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="wrap header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wordmark-full-colour.png" alt="the village." width={103} height={48} className="logo" />
        {/* Team feedback 29 Oct: logo and language only on phones (Book now is right under the headline);
            Facebook and Instagram moved down to "find us" and the footer. */}
        <div className="header-actions">
          <Link className="lang" href={other.href} hrefLang={other.href === "/" ? "en" : "vi"} aria-label={other.name}>{other.label}</Link>
          <a className="btn header-book" href={book}>{t("bookNow")}</a>
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <div className="hero-text">
            <h1 className="h">{t("heroTitle")}</h1>
            <p className="lead">{t("heroLead")}</p>
            <div className="buttons">
              <a className="btn" href={book}>{t("bookClass")}</a>
              <a className="btn2" href={bookingUrl("/classes")}>{t("seeTimetable")}</a>
            </div>
          </div>
          <div className="hero-pic" aria-hidden="true">
            <div className="arch">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/badge-linen-full-colour.png" alt="" width={140} height={140} />
            </div>
            <div className="blob" />
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            <h2 className="h">{t("villageTitle")}</h2>
            <p className="strong">{t("villageStrong")}</p>
            <p className="body">{t("villageBody")}</p>
            <div className="grid3">
              {(["move", "connect", "belong"] as const).map((k, i) => (
                <div key={k} className={`pillar pillar-${i}`}>
                  <h3 className="h">{t(`${k}.title`)}</h3>
                  <p>{t(`${k}.body`)}</p>
                </div>
              ))}
            </div>
            <p className="muted">{t("welcomeAll")}</p>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            <h2 className="h">{t("whatsOn")}</h2>
            <div className="grid3">
              {([
                { k: "classes", href: bookingUrl("/classes?filter=classes"), cls: "sage" },
                { k: "openPlay", href: bookingUrl("/classes?filter=open-play"), cls: "rose" },
                { k: "hire", href: bookingUrl("/hire"), cls: "sky" },
              ] as const).map((c) => (
                <a key={c.k} className="whats-card" href={c.href}>
                  <div className={`whats-pic ${c.cls}`} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/icon-house-linen-badge.png" alt="" width={64} height={64} />
                  </div>
                  <strong>{t(`${c.k}.title`)}</strong>
                  <span className="muted">{t(`${c.k}.body`)}</span>
                </a>
              ))}
            </div>
            <p className="muted">{t("comingSoon")}</p>
          </div>
        </section>

        <section className="wrap visit">
          <div>
            <h2 className="h">{t("visitTitle")}</h2>
            <p className="body">{s.address}<br /><span className="muted">{s.openingHours}</span></p>
            <div className="buttons">
              <a className="btn" href={book}>{t("bookNow")}</a>
              {s.mapsUrl && <a className="btn2" href={s.mapsUrl} target="_blank" rel="noopener noreferrer">{t("maps")}</a>}
            </div>
            <p className="muted">
              {t("messageUs")}{" "}
              {[s.zaloUrl && ["Zalo", s.zaloUrl], s.whatsappUrl && ["WhatsApp", s.whatsappUrl], s.messengerUrl && ["Messenger", s.messengerUrl], ["Email", `mailto:${s.contactEmail}`]]
                .filter((x): x is string[] => Boolean(x))
                .map(([label, href], i) => <span key={label}>{i > 0 && " · "}<a href={href}>{label}</a></span>)}
            </p>
            {(s.facebookUrl || s.instagramUrl) && (
              <p className="socials">
                {s.facebookUrl && <a className="social" href={s.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook</a>}
                {s.instagramUrl && <a className="social" href={s.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>}
              </p>
            )}
          </div>
          {/* Change list #7: a picture of the map (owners' Google Maps screenshot); tapping opens Google Maps. */}
          <a className="map" href={s.mapsUrl ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={t("mapAlt")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/map-the-village.jpg" alt="" width={741} height={372} />
            <span className="map-credit">Map data © Google</span>
          </a>
        </section>
      </main>

      <footer className="wrap footer">
        <span>{s.name}</span>
        <span className="footer-links">
          {s.facebookUrl && <a href={s.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook</a>}
          {s.instagramUrl && <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>}
          <a href={bookingUrl("/privacy")}>{t("privacy")}</a>
          <a href={bookingUrl("/terms")}>{t("terms")}</a>
        </span>
      </footer>
    </div>
  );
}
