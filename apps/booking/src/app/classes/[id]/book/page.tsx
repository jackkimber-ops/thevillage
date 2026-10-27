import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { BookForm } from "@/components/forms/BookForm";
import { account, data } from "@/lib/data";
import { cancelCutoff } from "@/lib/cutoff";
import { requireCustomer } from "@/lib/guard";
import { safeNext } from "@/lib/safe-next";
import { formatVnd } from "@/lib/money";
import { formatDayShort, formatTime, formatTimeRange, vnDateKey, nowMs } from "@/lib/time";

// C6 Confirm a class / C7 Confirm open play (and C6b: add a child opens inside the form).
export default async function BookPage({ params, searchParams }: PageProps<"/classes/[id]/book">) {
  const { id } = await params;
  const from = (await searchParams).from;
  const me = await requireCustomer(`/classes/${id}/book`);
  const locale = await getLocale();
  const t = await getTranslations("book");
  const db = data();
  const [s, settings, packs] = await Promise.all([db.session(id, locale), db.settings(), account().myPacks()]);
  if (!s) notFound();
  if (s.bookingClosed) redirect(`/classes/${id}`); // explains that booking has closed

  const cutoff = cancelCutoff(s.startsAt, settings.cancelCutoffTime);
  const day = vnDateKey(s.startsAt);
  const usable = packs
    .filter((p) => p.sessionTypeIds.includes(s.sessionTypeId) && p.validFrom <= day && p.lastDay >= day)
    .sort((a, b) => a.lastDay.localeCompare(b.lastDay))
    .map((p) => ({ name: p.name, remaining: p.remaining, lastDay: formatDayShort(p.lastDay, locale) }));

  return (
    <div className="page">
      <div className={`session-hero kind-${s.kind}`} style={{ height: 150 }}>
        <TopBar back={`/classes/${s.id}${typeof from === "string" ? `?from=${encodeURIComponent(safeNext(from))}` : ""}`} />
        <div className="hero-caption">
          <h1 className="heading" style={{ fontSize: 28, color: "var(--ink)" }}>{s.title}</h1>
          <div style={{ fontSize: 14 }}>
            {formatDayShort(day, locale)} · {formatTimeRange(s.startsAt, s.endsAt, locale)}
            {s.kind !== "open_play" && s.placesLeft !== null ? ` · ${t("placesLeft", { n: s.placesLeft })}` : ""}
          </div>
        </div>
      </div>
      <BookForm
        sessionId={s.id}
        kind={s.kind}
        me={{ name: me.fullName.split(" ")[0], children: me.children.map((c) => ({ id: c.id, name: c.name, birthMonth: c.birthMonth })) }}
        packs={usable}
        dropIn={s.priceVnd === null ? null : formatVnd(s.priceVnd, locale)}
        dropInVnd={s.priceVnd}
        cutoffText={t("freeCancel", { time: formatTime(cutoff, locale), day: formatDayShort(vnDateKey(cutoff), locale) })}
        afterCutoff={nowMs() >= cutoff.getTime()}
        back={`/classes/${s.id}/book`}
      />
    </div>
  );
}
