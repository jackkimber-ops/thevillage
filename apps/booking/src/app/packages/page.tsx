import { getLocale, getTranslations } from "next-intl/server";
import { TabBar } from "@/components/TabBar";
import { TopBar } from "@/components/TopBar";
import { account, data } from "@/lib/data";
import { requireCustomer } from "@/lib/guard";
import { formatVnd } from "@/lib/money";
import { formatDayShort, vnDateKey } from "@/lib/time";

// C12 My packages.
export default async function PackagesPage() {
  await requireCustomer("/packages");
  const t = await getTranslations("packages");
  const locale = await getLocale();
  const [packs, onSale, prices] = await Promise.all([account().myPacks(), account().packsOnSale(), data().dropInPrices()]);
  const today = vnDateKey(new Date());
  const active = packs.filter((p) => p.lastDay >= today && (p.remaining > 0 || p.reserved > 0));
  const finished = packs.filter((p) => !active.includes(p)).slice(0, 3);
  const year = (d: string) => new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { timeZone: "UTC", year: "numeric" }).format(new Date(`${d}T00:00:00Z`));

  return (
    <div className="page">
      <TopBar />
      <main className="page-body">
        <h1 className="heading" style={{ fontSize: 28 }}>{t("title")}</h1>
        {active.length === 0 && <p className="muted" style={{ margin: 0 }}>{t("none")}</p>}
        {active.map((p) => {
          const total = p.remaining + p.reserved + p.used || 1;
          return (
            <div key={p.id} className="card" style={{ padding: "16px 18px" }}>
              <div className="row-between"><strong>{p.name}</strong><span className="tag tag-ok">{t("classes")}</span></div>
              <div className="row" style={{ alignItems: "baseline", marginTop: 12 }}>
                <span className="big-number">{p.remaining}</span><span>{t("remaining", { n: p.remaining })}</span>
              </div>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${(p.used / total) * 100}%`, background: "var(--forrest-deep)" }} />
                <span style={{ width: `${(p.reserved / total) * 100}%`, background: "var(--sage)" }} />
              </div>
              <div className="muted small">
                {t("summary", { used: p.used, reserved: p.reserved })} · {t("expires")} <strong style={{ color: "var(--ink)" }}>{formatDayShort(p.lastDay, locale)} {year(p.lastDay)}</strong>
                {p.pausedDays > 0 && ` · ${t("paused", { n: p.pausedDays })}`}
              </div>
            </div>
          );
        })}
        {prices.openPlayVnd !== null && (
          <div className="card open-play-card">
            <strong>{t("openPlay")}</strong> <span className="small">{t("noPack")}</span>
            <div className="small" style={{ marginTop: 2 }}>{t("openPlayPrice", { price: formatVnd(prices.openPlayVnd, locale) })}</div>
          </div>
        )}
        {finished.map((p) => (
          <div key={p.id} className="card muted" style={{ boxShadow: "none", background: "#fbf7ef" }}>
            <div className="row-between"><strong>{p.name}</strong><span className="small">{t("finished")}</span></div>
            <div className="small">{t("endedOn", { day: `${formatDayShort(p.lastDay, locale)} ${year(p.lastDay)}` })}</div>
          </div>
        ))}
        <div className="buy-card">
          <h2 className="heading" style={{ fontSize: 18, color: "var(--linen)" }}>{t("buyTitle")}</h2>
          <p style={{ margin: "4px 0 0" }}>{t("buyHow")}</p>
          <div className="buy-grid">
            {onSale.filter((k) => !k.isIntro).map((k) => (
              <div key={k.id} className="buy-item">
                <strong>{k.name}</strong><br />{formatVnd(k.priceVnd, locale)}<br />
                <span className="muted small">{k.validityMonths ? t("lastsMonths", { n: k.validityMonths }) : t("lastsDays", { n: k.validityDays ?? 0 })}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
      <TabBar current="packages" />
    </div>
  );
}
