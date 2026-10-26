import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { data } from "@/lib/data";
import { formatVnd } from "@/lib/money";
import { formatDayShort, formatTimeRange, minutesBetween, vnDateKey } from "@/lib/time";

// C5 Session details.
export default async function SessionPage({ params }: PageProps<"/classes/[id]">) {
  const { id } = await params;
  const t = await getTranslations("session");
  const locale = await getLocale();
  const s = await data().session(id, locale);
  if (!s) notFound();

  const when = `${formatDayShort(vnDateKey(s.startsAt), locale)} · ${formatTimeRange(s.startsAt, s.endsAt, locale)} (${t("minutes", { n: minutesBetween(s.startsAt, s.endsAt) })})`;
  const price = s.priceVnd === null ? null : formatVnd(s.priceVnd, locale);
  const rows: Array<[string, string | null]> = [
    [t("when"), when],
    [t("instructor"), s.instructorName],
    [t("suits"), s.suits],
    [t("bring"), s.bring],
    [t("places"), s.kind === "open_play" ? (s.isFull ? t("full") : null) : s.isFull ? t("full") : s.placesLeft !== null ? t("placesShort", { left: s.placesLeft, capacity: s.capacity ?? 0 }) : null],
    [t("price"), price === null ? null : s.kind === "open_play" ? t("priceOpenPlay", { price }) : s.kind === "workshop" ? price : t("priceClass", { price })],
  ];

  return (
    <div className="page">
      <div className={`session-hero kind-${s.kind}`}>
        <TopBar back="/classes" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="session-hero-pic" src={s.pictureUrl ?? "/brand/icon-house-linen-badge.png"} alt="" />
      </div>
      <main className="page-body" style={{ gap: 10 }}>
        <div><span className="tag tag-ok">{t(`kinds.${s.kind}`)}</span></div>
        <h1 className="heading" style={{ fontSize: 30 }}>{s.title}</h1>
        {s.description && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{s.description}</p>}
        <dl className="card details">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="details-row"><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <div style={{ marginTop: "auto", paddingTop: 10 }}>
          {s.isFull ? (
            <p className="empty">{t("fullMessage")}</p>
          ) : (
            <Link className="btn" href={`/classes/${s.id}/book`}>{s.kind === "open_play" ? t("bookOpenPlay") : t("bookClass")}</Link>
          )}
          <Link className="link-center" style={{ display: "block" }} href="/menu#message-us">{t("questions")}</Link>
        </div>
      </main>
    </div>
  );
}
