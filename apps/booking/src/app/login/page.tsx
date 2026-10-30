import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { LanguageButton } from "@/components/LanguageButton";
import { MenuIcon } from "@/components/Icons";
import { LoginForm } from "@/components/forms/LoginForm";
import { data } from "@/lib/data";
import { formatVnd } from "@/lib/money";
import { safeNext } from "@/lib/safe-next";
import { formatDayShort, formatTimeRange, vnDateKey } from "@/lib/time";

// C1 Log in (opens from Book or Log in). No password: a 6-digit code by email.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const t = await getTranslations("login");
  const booking = /^\/classes\/([^/]+)\/book$/.exec(next);
  const locale = await getLocale();
  const ts = await getTranslations("session");
  // Coming from "Book this class": remind them which class (team feedback 30 Oct), like the guest form does.
  const s = booking ? await data().session(booking[1], locale) : null;
  return (
    <div className="page">
      <div className="login-hero">
        <div className="topbar">
          <Link href="/" aria-label={t("home")} className="logo-pill">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo" src="/brand/wordmark-full-colour.png" alt="the village." width={73} height={34} />
          </Link>
          <div className="topbar-actions">
            <LanguageButton />
            <Link className="icon-button on-photo" href="/menu" aria-label={t("menu")}><MenuIcon /></Link>
          </div>
        </div>
      </div>
      <main className="page-body" style={{ padding: "16px 22px 24px" }}>
        {s && (
          <div className={`summary kind-${s.kind}`}>
            <div className="muted small">{t("booking")}</div>
            <div style={{ fontWeight: 600 }}>{s.title}</div>
            <div style={{ fontSize: 14 }}>{formatDayShort(vnDateKey(s.startsAt), locale)} · {formatTimeRange(s.startsAt, s.endsAt, locale)}</div>
            {s.priceVnd !== null && (
              <div className="small" style={{ marginTop: 4 }}>
                {s.kind === "open_play" ? ts("priceOpenPlay", { price: formatVnd(s.priceVnd, locale) }) : ts("priceClass", { price: formatVnd(s.priceVnd, locale) })}
              </div>
            )}
          </div>
        )}
        <h1 className="heading" style={{ fontSize: 26, margin: 0 }}>{t("title")}</h1>
        <p className="muted" style={{ margin: 0, fontSize: 15 }}>{t("intro")}</p>
        <LoginForm next={next} />
        {booking && (
          <>
            <div className="divider"><span>{t("newHere")}</span></div>
            <Link className="btn-secondary" href={next.replace(/\/book$/, "/guest")}>{t("bookAsGuest")}</Link>
          </>
        )}
        <p className="muted small" style={{ marginTop: "auto", textAlign: "center", lineHeight: 1.45 }}>{t("stayLoggedIn")}</p>
      </main>
    </div>
  );
}
