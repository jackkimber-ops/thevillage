"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/locales";
import { setLocaleCookie } from "@/i18n/set-locale";

/** English / Tiếng Việt choice for the menu (each shown in its own language). */
export function LanguageChoice() {
  const locale = useLocale();
  const router = useRouter();
  const choose = (next: Locale) => {
    setLocaleCookie(next);
    router.refresh();
  };
  return (
    <div className="segmented" style={{ width: 190 }} role="group">
      {(["en", "vi"] as const).map((l) => (
        <button key={l} type="button" className="segmented-button" aria-pressed={locale === l} onClick={() => choose(l)} lang={l}>
          {l === "en" ? "English" : "Tiếng Việt"}
        </button>
      ))}
    </div>
  );
}
