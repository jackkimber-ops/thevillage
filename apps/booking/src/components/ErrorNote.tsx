import { getTranslations } from "next-intl/server";

/** Server-side version of ErrorText for errors passed in the URL. */
export async function ErrorNote({ code }: { code: string }) {
  const t = await getTranslations("errors");
  return <p className="error-text" role="alert">{t.has(code) ? t(code) : t("generic")}</p>;
}
