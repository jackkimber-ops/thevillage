"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocaleCookie } from "@/i18n/set-locale";

export function LanguageButton() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();

  function toggle() {
    const next = locale === "vi" ? "en" : "vi";
    setLocaleCookie(next);
    router.refresh();
  }

  return (
    <button type="button" className="lang-button" onClick={toggle} aria-label={t("label")}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
      </svg>
      {t("short")}
    </button>
  );
}
