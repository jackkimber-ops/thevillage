import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { GuestForm } from "@/components/forms/GuestForm";
import { data } from "@/lib/data";
import { formatVnd } from "@/lib/money";
import { formatDayShort, formatTimeRange, vnDateKey } from "@/lib/time";

// C3 Book as a guest: no account needed, pay on the day.
export default async function GuestPage({ params }: PageProps<"/classes/[id]/guest">) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations("guest");
  const [s, settings] = await Promise.all([data().session(id, locale), data().settings()]);
  if (!s) notFound();
  return (
    <div className="page">
      <TopBar back={`/login?next=${encodeURIComponent(`/classes/${id}/book`)}`} />
      <main className="page-body" style={{ padding: "4px 18px 20px" }}>
        <div className={`summary kind-${s.kind}`}>
          <div style={{ fontWeight: 600 }}>{s.title}</div>
          <div style={{ fontSize: 14 }}>{formatDayShort(vnDateKey(s.startsAt), locale)} · {formatTimeRange(s.startsAt, s.endsAt, locale)}</div>
          {s.priceVnd !== null && (
            <div className="row" style={{ marginTop: 6 }}>
              <span className="tag tag-pay">{t("payOnTheDay")}</span>
              <strong className="small">{s.kind === "open_play" ? t("perChild", { price: formatVnd(s.priceVnd, locale) }) : formatVnd(s.priceVnd, locale)}</strong>
            </div>
          )}
        </div>
        <h1 className="heading" style={{ fontSize: 26 }}>{t("title")}</h1>
        <GuestForm sessionId={s.id} needsChild={s.kind === "open_play"} cutoffTime={settings.cancelCutoffTime} />
      </main>
    </div>
  );
}
