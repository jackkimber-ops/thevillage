import Link from "next/link";
import { BackIcon, NextIcon } from "@/components/Icons";
import { CalendarGrid } from "@/components/staff/CalendarGrid";
import { Notice } from "@/components/staff/Notice";
import { staffApi } from "@/lib/data";
import { requireStaff } from "@/lib/staff-guard";
import { addDays, addMonths, formatDayLong, formatMonth, formatWeekRange, isDateKey, monthStart, vnDateKey, vnDayStart, weekStart } from "@/lib/time";

type View = "day" | "week" | "month";

// S2 Calendar: day, week or month. Drag a session to move it (bookings move with it; one room, no overlaps).
export default async function CalendarPage({ searchParams }: PageProps<"/staff/calendar">) {
  const sp = await searchParams;
  const me = await requireStaff();
  const view: View = sp.view === "day" || sp.view === "month" ? sp.view : "week";
  const today = vnDateKey(new Date());
  const anchor = isDateKey(sp.date) ? sp.date : today;

  let from: string, to: string, label: string, prev: string, next: string;
  if (view === "day") {
    from = anchor; to = addDays(anchor, 1); label = formatDayLong(anchor, "en"); prev = addDays(anchor, -1); next = to;
  } else if (view === "month") {
    from = monthStart(anchor); to = addMonths(from, 1); label = formatMonth(from, "en"); prev = addMonths(from, -1); next = to;
  } else {
    from = weekStart(anchor); to = addDays(from, 7); label = `${formatWeekRange(from, "en")} ${from.slice(0, 4)}`; prev = addDays(from, -7); next = to;
  }
  const sessions = await staffApi().timetable(vnDayStart(from), vnDayStart(to));
  const link = (v: View, d: string) => `/staff/calendar?view=${v}&date=${d}`;
  const days = Array.from({ length: view === "day" ? 1 : view === "week" ? 7 : 0 }, (_, i) => addDays(from, i));

  return (
    <>
      <div className="staff-head">
        <div className="staff-actions" style={{ alignItems: "center" }}>
          <Link className="back-button" href={link(view, prev)} aria-label="Previous"><BackIcon /></Link>
          <h1 className="heading" style={{ fontSize: 22 }}>{label.toLowerCase()}</h1>
          <Link className="back-button" href={link(view, next)} aria-label="Next"><NextIcon /></Link>
          <Link className="small-link" href={link(view, today)}>Today</Link>
        </div>
        <div className="staff-actions">
          <nav className="segmented" aria-label="Calendar view" style={{ width: 240 }}>
            {(["day", "week", "month"] as const).map((v) => (
              <Link key={v} href={link(v, anchor)} aria-current={view === v ? "page" : undefined}>{v[0].toUpperCase() + v.slice(1)}</Link>
            ))}
          </nav>
          <Link className="sbtn" href={`/staff/sessions/new?date=${anchor}`}>+ New session</Link>
        </div>
      </div>
      <Notice error={sp.error} ok={sp.cancelled ? "Session cancelled. Everyone booked has their credit back." : null} />
      <div className="legend">
        <span><span className="swatch kind-class" />Group class</span>
        <span><span className="swatch kind-open_play" />Open play</span>
        <span><span className="swatch kind-private_hire" />Private hire</span>
        <span><span className="swatch kind-workshop" />Workshop <span className="tag tag-later">+1 month</span></span>
      </div>
      {view === "month" ? (
        <MonthView from={from} sessions={sessions.map((s) => ({ startsAt: s.startsAt, kind: s.kind }))} link={(d) => link("day", d)} today={today} />
      ) : (
        <CalendarGrid
          days={days}
          today={today}
          sessions={sessions}
          meId={me.userId}
          isManager={me.role === "manager"}
        />
      )}
      <p className="muted small" style={{ margin: 0 }}>
        Drag a session to move it: its bookings move too and everyone booked gets an email. Sessions can&apos;t overlap: there is one room.
        {me.role !== "manager" && " You can move and edit your own classes."}
      </p>
    </>
  );
}

function MonthView({ from, sessions, link, today }: { from: string; sessions: Array<{ startsAt: string; kind: string }>; link: (d: string) => string; today: string }) {
  const lead = (new Date(`${from}T00:00:00Z`).getUTCDay() + 6) % 7;
  const end = addMonths(from, 1);
  const days: string[] = [];
  for (let d = from; d < end; d = addDays(d, 1)) days.push(d);
  return (
    <div className="staff-month">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d} className="month-dow">{d}</span>)}
      {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
      {days.map((d) => {
        const mine = sessions.filter((s) => vnDateKey(s.startsAt) === d);
        return (
          <Link key={d} href={link(d)} className={`staff-month-cell${d === today ? " today" : ""}`}>
            <strong>{Number(d.slice(8))}</strong>
            <span className="dots">{mine.slice(0, 6).map((s, i) => <span key={i} className={`dot kind-${s.kind}`} />)}</span>
            {mine.length > 0 && <span className="small muted">{mine.length} session{mine.length > 1 ? "s" : ""}</span>}
          </Link>
        );
      })}
    </div>
  );
}
