import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackIcon } from "@/components/Icons";
import { LanguageChoice } from "@/components/LanguageChoice";
import { account, data } from "@/lib/data";
import { signOutAction } from "@/lib/actions/auth";

// C14 Menu: message us, hire the studio, language, studio details. (My details come with login, stage 5.)
export default async function MenuPage() {
  const t = await getTranslations("menu");
  const [s, me] = await Promise.all([data().settings(), account().me()]);
  const monthYear = (d: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short", year: "numeric" }).format(new Date(`${d}T00:00:00Z`));
  const channels = [
    { key: "zalo", href: s.zaloUrl, cls: "kind-private_hire" },
    { key: "whatsapp", href: s.whatsappUrl, cls: "kind-class" },
    { key: "messenger", href: s.messengerUrl, cls: "kind-open_play" },
    { key: "email", href: `mailto:${s.contactEmail}`, cls: "kind-private_hire" },
  ].filter((c) => c.href);

  return (
    <div className="page">
      <header className="topbar" style={{ justifyContent: "flex-start", gap: 12, paddingLeft: 16 }}>
        <Link className="back-button" href="/classes" aria-label={t("close")}><BackIcon /></Link>
        <h1 className="heading" style={{ fontSize: 24 }}>{t("title")}</h1>
      </header>
      <main className="page-body" style={{ gap: 8 }}>
        <h2 id="message-us" className="label" style={{ marginTop: 0 }}>{t("messageUs")}</h2>
        <div className="message-grid">
          {channels.map((c) => (
            <a key={c.key} className="message-link" href={c.href!} target={c.key === "email" ? undefined : "_blank"} rel="noopener noreferrer">
              <span className={`message-icon ${c.cls}`} aria-hidden="true" />
              {t(`channels.${c.key}`)}
            </a>
          ))}
        </div>

        <div className="card menu-list">
          <Link className="menu-item" href="/hire"><span>{t("hire")}</span><span aria-hidden="true">›</span></Link>
          <div className="menu-item"><span>{t("language")}</span><LanguageChoice /></div>
          {!me && <Link className="menu-item" href="/login"><span>{t("logIn")}</span><span aria-hidden="true">›</span></Link>}
        </div>

        {me && (
          <>
            <h2 className="label">{t("myDetails")}</h2>
            <div className="card menu-list">
              <div className="menu-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <strong>{me.fullName}</strong>
                <span className="muted small">{[me.phone, me.email].filter(Boolean).join(" · ")}</span>
              </div>
              <div className="menu-item">
                <span>{t("children")}{me.children.length > 0 && <span className="muted"> · {me.children.map((c) => `${c.name} (${monthYear(c.birthMonth)})`).join(", ")}</span>}</span>
              </div>
            </div>
          </>
        )}

        <h2 className="label">{t("studio")}</h2>
        <div className="card menu-list">
          <div className="menu-item" style={{ alignItems: "flex-start" }}>
            <span style={{ fontSize: 14 }}>{s.address}<br /><span className="muted">{s.openingHours}</span></span>
            {s.mapsUrl && <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer">{t("map")}</a>}
          </div>
          <Link className="menu-item" href="/privacy"><span>{t("privacy")}</span><span aria-hidden="true">›</span></Link>
          <Link className="menu-item" href="/terms"><span>{t("terms")}</span><span aria-hidden="true">›</span></Link>
        </div>
        {me && (
          <form action={signOutAction}>
            <button type="submit" className="link-button" style={{ padding: "10px 0", fontSize: 15 }}>{t("logOut")}</button>
          </form>
        )}
      </main>
    </div>
  );
}
