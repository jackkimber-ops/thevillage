import Link from "next/link";
import { staffApi } from "@/lib/data";
import { requireStaff } from "@/lib/staff-guard";
import { sessionLine } from "@/lib/staff-format";
import { addDays, formatDayShort, formatTime, vnDateKey, vnDayStart } from "@/lib/time";

// S11 My sessions (instructor's phone): today and the next few days, tap one for its check-in list.
export default async function Today() {
  const me = await requireStaff();
  const today = vnDateKey(new Date());
  const all = await staffApi().timetable(vnDayStart(today), vnDayStart(addDays(today, 4)));
  const mine = all.filter((s) => s.instructorId === me.userId && s.kind !== "private_hire");
  const days = [0, 1, 2, 3].map((i) => addDays(today, i)).map((d) => ({ d, items: mine.filter((s) => vnDateKey(s.startsAt) === d) })).filter((x) => x.items.length);
  return (
    <>
      <h1 className="heading">my sessions</h1>
      <p className="muted" style={{ margin: 0 }}>{me.name}</p>
      {days.length === 0 && <p className="muted">No sessions of yours in the next few days.</p>}
      {days.map(({ d, items }) => (
        <section key={d} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="day-label">{[d === today ? "today" : d === addDays(today, 1) ? "tomorrow" : null, formatDayShort(d, "en").toLowerCase()].filter(Boolean).join(" · ")}</h2>
          {items.map((s) => (
            <Link key={s.id} className={`sess-row kind-${s.kind}`} href={`/staff/sessions/${s.id}/check-in`}>
              <strong>{formatTime(s.startsAt, "en")}</strong>
              <span style={{ flex: 1 }}>{s.title}<br /><span className="small">{sessionLine(s)}</span></span>
            </Link>
          ))}
        </section>
      ))}
      <p className="muted small">A manager who also teaches sees this same list for their own classes.</p>
    </>
  );
}
