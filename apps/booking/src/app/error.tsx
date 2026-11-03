"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

// Shown instead of a crash when a page can't load (Sentry, 29 Oct and 3 Nov: the database connection timed out).
// The error itself still goes to Sentry.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  return (
    <div className="page">
      <main className="page-body" style={{ justifyContent: "center", textAlign: "center", gap: 14 }}>
        <h1 className="heading" style={{ fontSize: 26 }}>{t("title")}</h1>
        <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>{t("body")}</p>
        <button type="button" className="btn" onClick={() => reset()}>{t("retry")}</button>
        <Link className="link-center" href="/">{t("home")}</Link>
      </main>
    </div>
  );
}
