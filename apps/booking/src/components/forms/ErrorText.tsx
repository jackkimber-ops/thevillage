"use client";

import { useTranslations } from "next-intl";

/** Shows a translated error for a short code from an action ("session_full"). */
export function ErrorText({ code }: { code?: string }) {
  const t = useTranslations("errors");
  if (!code) return null;
  return (
    <p className="error-text" role="alert">
      {t.has(code) ? t(code) : t("generic")}
    </p>
  );
}
