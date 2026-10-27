import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BackIcon, NextIcon } from "@/components/Icons";
import { SessionCard } from "@/components/SessionCard";
import { TabBar } from "@/components/TabBar";
import { TopBar } from "@/components/TopBar";
import { account, data, type TimetableEntry } from "@/lib/data";
import { myBookedSessions } from "@/lib/my-booked";
import {
  addDays, addMonths, formatDayLong, formatMonth, formatTime, formatWeekRange, isDateKey, monthStart,
  vnDateKey, vnDayStart, weekStart,
} from "@/lib/time";

type View = "list" | "week" | "month";
type Filter = "all" | "classes" | "open-play";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

// C4 / C4b / C4c: the timetable as a week list (default), a 7-day grid or a month calendar.
export default async function ClassesPage({ searchParams }: PageProps<"/classes">) {
  const sp = await searchParams;
  const t = await getTranslations("timetable");
  const locale = await getLocale();
  const db = data();
  const [settings, me, booked] = await Promise.all([db.settings(), account().me(), myBookedSessions()]);

  const view: View = ["week", "month"].includes(first(sp.view) ?? "") ? (first(sp.view) as View) : "list";
  // The All / Classes / Open play pills are on the List view only, so Week and Month always show everything
  // (a filter picked in List mustn't silently hide Open Play there).
  const filter: Filter = view === "list" && ["classes", "open-play"].includes(first(sp.filter) ?? "") ? (first(sp.filter) as Filter) : "all";
  const today = vnDateKey(new Date());
  const lastBookable = addDays(today, settings.bookingWindowDays);
  const requested = first(sp.date);
  const anchor = isDateKey(requested) && requested >= today && requested <= lastBookable ? requested : today;

  const href = (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { view: view === "list" ? undefined : view, filter: filter === "all" ? undefined : filter, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/classes?${s}` : "/classes";
  };

  const keep = (s: TimetableEntry) =>
    filter === "all" || (filter === "classes" ? s.kind === "class" || s.kind === "workshop" : s.kind === "open_play");

  const nav = (
    <nav className="segmented" aria-label={t("viewLabel")}>
      {(["list", "week", "month"] as const).map((v) => (
        <Link key={v} href={href({ view: v === "list" ? undefined : v, date: anchor === today ? undefined : anchor })} aria-current={view === v ? "page" : undefined}>
          {t(`views.${v}`)}
        </Link>
      ))}
    </nav>
  );

  let body: React.ReactNode;
  if (view === "month") {
    const start = monthStart(anchor);
    const next = addMonths(start, 1);
    const sessions = (await db.timetable(vnDayStart(start), vnDayStart(next))).filter(keep);
    const selected = isDateKey(first(sp.day)) ? first(sp.day)! : anchor;
    body = (
      <>
        <Stepper
          label={formatMonth(start, locale)}
          prev={start > monthStart(today) ? href({ view: "month", date: addMonths(start, -1) < today ? undefined : addMonths(start, -1) }) : null}
          next={next <= lastBookable ? href({ view: "month", date: next }) : null}
          prevLabel={t("prevMonth")}
          nextLabel={t("nextMonth")}
        />
        <MonthGrid start={start} sessions={sessions} today={today} lastBookable={lastBookable} selected={selected}
          dayHref={(d) => href({ view: "month", date: start === monthStart(today) ? undefined : start, day: d })} locale={locale} />
        <Legend kind="month" types={typesOf(sessions)} />
        <h2 className="day-label">{formatDayLong(selected, locale)}</h2>
        {sessions.filter((s) => vnDateKey(s.startsAt) === selected).map((s) => <SessionCard key={s.id} s={s} bookingId={booked.get(s.id)} />)}
        {selected > lastBookable && <p className="empty">{t("opensLater")}</p>}
        {selected <= lastBookable && !sessions.some((s) => vnDateKey(s.startsAt) === selected) && <p className="empty">{t("nothingThisDay")}</p>}
      </>
    );
  } else if (view === "week") {
    const monday = weekStart(anchor);
    const sessions = (await db.timetable(vnDayStart(monday), vnDayStart(addDays(monday, 7)))).filter(keep);
    body = (
      <>
        <Stepper
          label={formatWeekRange(monday, locale)}
          prev={monday > weekStart(today) ? href({ view: "week", date: addDays(monday, -7) < today ? undefined : addDays(monday, -7) }) : null}
          next={addDays(monday, 7) <= lastBookable ? href({ view: "week", date: addDays(monday, 7) }) : null}
          prevLabel={t("prevWeek")}
          nextLabel={t("nextWeek")}
        />
        <WeekGrid monday={monday} today={today} sessions={sessions} booked={booked} locale={locale} />
        <Legend kind="week" />
      </>
    );
  } else {
    // List: one calendar week, Monday to Sunday (change list #4). Sessions already over are left out,
    // so this week starts from today; "See next week" at the bottom moves on.
    const monday = weekStart(anchor);
    const end = addDays(monday, 7);
    const sessions = (await db.timetable(vnDayStart(monday), vnDayStart(end))).filter(keep);
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
      .map((d) => ({ d, items: sessions.filter((s) => vnDateKey(s.startsAt) === d && new Date(s.endsAt) > new Date()) }))
      .filter((x) => x.items.length > 0);
    const weekHref = (m: string) => href({ date: m <= today ? undefined : m });
    const nextHref = end <= lastBookable ? weekHref(end) : null;
    body = (
      <>
        <Stepper
          label={formatWeekRange(monday, locale)}
          prev={monday > weekStart(today) ? weekHref(addDays(monday, -7)) : null}
          next={nextHref}
          prevLabel={t("prevWeek")}
          nextLabel={t("nextWeek")}
        />
        <nav className="pills" aria-label={t("filterLabel")}>
          {(["all", "classes", "open-play"] as const).map((f) => (
            <Link key={f} className="pill" href={href({ filter: f === "all" ? undefined : f, date: anchor === today ? undefined : anchor })} aria-current={filter === f ? "page" : undefined}>
              {t(`filters.${f}`)}
            </Link>
          ))}
        </nav>
        {days.length === 0 && <p className="empty">{t("nothingThisWeek")}</p>}
        {days.map(({ d, items }) => (
          <section key={d} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="day-label">{formatDayLong(d, locale)}</h2>
            {items.map((s) => <SessionCard key={s.id} s={s} bookingId={booked.get(s.id)} />)}
          </section>
        ))}
        {nextHref && <Link className="btn-secondary" href={nextHref}>{t("seeNextWeek")}</Link>}
      </>
    );
  }

  return (
    <div className="page">
      <TopBar />
      <main className="page-body">
        <h1 className="heading" style={{ fontSize: 28 }}>{me ? t("greeting", { name: me.fullName.split(" ")[0].toLowerCase() }) : t("title")}</h1>
        {nav}
        {body}
      </main>
      <TabBar current="classes" />
    </div>
  );
}

function Stepper({ label, prev, next, prevLabel, nextLabel }: { label: string; prev: string | null; next: string | null; prevLabel: string; nextLabel: string }) {
  return (
    <div className="stepper">
      {prev ? <Link className="icon-button" href={prev} aria-label={prevLabel}><BackIcon /></Link> : <span className="icon-button disabled" aria-hidden="true"><BackIcon /></span>}
      <strong>{label}</strong>
      {next ? <Link className="icon-button" href={next} aria-label={nextLabel}><NextIcon /></Link> : <span className="icon-button disabled" aria-hidden="true"><NextIcon /></span>}
    </div>
  );
}

type TypeLook = { id: string; name: string; kind: TimetableEntry["kind"]; pictureUrl: string | null };

/** The class types in a list of sessions, once each, in timetable order. */
function typesOf(sessions: TimetableEntry[]): TypeLook[] {
  const seen = new Map<string, TypeLook>();
  for (const s of sessions) {
    if (!seen.has(s.sessionTypeId)) seen.set(s.sessionTypeId, { id: s.sessionTypeId, name: s.typeName, kind: s.kind, pictureUrl: s.pictureUrl });
  }
  return [...seen.values()];
}

/** A class type's badge (change list #5), or the old coloured dot for a type without one. */
function TypeMark({ type }: { type: TypeLook }) {
  return type.pictureUrl
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="mini-badge" src={type.pictureUrl} alt="" />
    : <span className={`dot dot-${type.kind}`} />;
}

async function Legend({ kind, types = [] }: { kind: "week" | "month"; types?: TypeLook[] }) {
  const t = await getTranslations("timetable.legend");
  if (kind === "month") {
    return (
      <div className="legend">
        {types.filter((x) => x.kind !== "private_hire").map((x) => <span key={x.id}><TypeMark type={x} />{x.name}</span>)}
        <span className="muted">{t("greyLater")}</span>
      </div>
    );
  }
  return (
    <div className="legend">
      <span><span className="swatch kind-class" />{t("class")}</span>
      <span><span className="swatch kind-open_play" />{t("openPlay")}</span>
      <span><span className="swatch swatch-full" />{t("full")}</span>
    </div>
  );
}

async function WeekGrid({ monday, today, sessions, booked, locale }: {
  monday: string; today: string; sessions: TimetableEntry[]; booked: Map<string, string>; locale: string;
}) {
  const t = await getTranslations("session");
  const PX = 44; // per hour
  const hourOf = (iso: string) => {
    const [h, m] = formatTime(iso, "en").split(":").map(Number);
    return h + m / 60;
  };
  const startHour = Math.min(8.5, ...sessions.map((s) => Math.floor(hourOf(s.startsAt))));
  const endHour = Math.max(17, ...sessions.map((s) => Math.ceil(hourOf(s.endsAt))));
  const height = (endHour - startHour) * PX;
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const dayFmt = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { timeZone: "UTC", weekday: "short" });
  const hours: number[] = [];
  for (let h = Math.ceil(startHour); h < endHour; h++) hours.push(h);

  return (
    <div className="week-grid">
      <span />
      {days.map((d) => (
        <div key={d} className={`week-day${d === today ? " today" : ""}`}>
          {dayFmt.format(new Date(`${d}T00:00:00Z`))}
          <strong>{Number(d.slice(8))}</strong>
        </div>
      ))}
      <div style={{ position: "relative", height }}>
        {hours.map((h) => <span key={h} className="week-hour" style={{ top: (h - startHour) * PX - 6 }}>{h}</span>)}
      </div>
      {days.map((d) => (
        <div key={d} className="week-col" style={{ height }}>
          {sessions.filter((s) => vnDateKey(s.startsAt) === d).map((s) => {
            const top = (hourOf(s.startsAt) - startHour) * PX + 2;
            const h = (hourOf(s.endsAt) - hourOf(s.startsAt)) * PX - 4;
            const time = formatTime(s.startsAt, locale);
            const isBooked = booked.has(s.id);
            const label = `${s.title}, ${time}${isBooked ? `, ${t("booked")}` : s.isFull ? `, ${t("full")}` : ""}`;
            const style = { top, height: h };
            const closed = !isBooked && (s.isFull || s.bookingClosed);
            return closed ? (
              <div key={s.id} className="week-block swatch-full" style={style} aria-label={label}><b>{s.title}</b>{time}</div>
            ) : (
              <Link key={s.id} className={`week-block kind-${s.kind}${isBooked ? " booked" : ""}`} style={style} href={`/classes/${s.id}`} aria-label={label}>
                <b>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.pictureUrl && <img className="mini-badge" src={s.pictureUrl} alt="" />}
                  {isBooked && "✓ "}{s.title}
                </b>{time}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

async function MonthGrid({ start, sessions, today, lastBookable, selected, dayHref, locale }: {
  start: string; sessions: TimetableEntry[]; today: string; lastBookable: string; selected: string; dayHref: (d: string) => string; locale: string;
}) {
  const t = await getTranslations("timetable");
  const lead = (new Date(`${start}T00:00:00Z`).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)), 0)).getUTCDate();
  const dow = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { timeZone: "UTC", weekday: "narrow" });
  const names = Array.from({ length: 7 }, (_, i) => dow.format(new Date(Date.UTC(2026, 10, 2 + i)))); // a Monday
  return (
    <div className="month-grid">
      {names.map((n, i) => <span key={i} className="month-dow" aria-hidden="true">{n}</span>)}
      {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} aria-hidden="true" />)}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const d = addDays(start, i);
        const types = typesOf(sessions.filter((s) => vnDateKey(s.startsAt) === d)).filter((x) => x.kind !== "private_hire");
        const later = d > lastBookable;
        const past = d < today;
        const cls = `month-cell${d === selected ? " selected" : ""}${later || past ? " later" : ""}`;
        const aria = `${formatDayLong(d, locale)}${later ? `, ${t("opensLater")}` : ""}`;
        return (
          <Link key={d} className={cls} href={dayHref(d)} aria-label={aria} aria-current={d === selected ? "date" : undefined}>
            <span>{i + 1}</span>
            <span className="dots">
              {!later && !past && types.slice(0, 3).map((x) => <TypeMark key={x.id} type={x} />)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
