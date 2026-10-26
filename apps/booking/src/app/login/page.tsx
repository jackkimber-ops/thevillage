import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageButton } from "@/components/LanguageButton";
import { MenuIcon } from "@/components/Icons";
import { LoginForm } from "@/components/forms/LoginForm";
import { safeNext } from "@/lib/safe-next";

// C1 Log in (opens from Book or Log in). No password: a 6-digit code by email.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const t = await getTranslations("login");
  const booking = /^\/classes\/[^/]+\/book$/.exec(next);
  return (
    <div className="page">
      <div className="login-hero">
        <div className="topbar">
          <Link href="/" aria-label={t("home")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo" src="/brand/wordmark-full-colour.png" alt="the village." width={73} height={34} />
          </Link>
          <div className="topbar-actions">
            <LanguageButton />
            <Link className="icon-button on-photo" href="/menu" aria-label={t("menu")}><MenuIcon /></Link>
          </div>
        </div>
        <h1 className="heading login-title">{t("title")}</h1>
      </div>
      <main className="page-body" style={{ padding: "16px 26px 24px" }}>
        <p className="muted" style={{ margin: 0, textAlign: "center", fontSize: 15 }}>{t("intro")}</p>
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
