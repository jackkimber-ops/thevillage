import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/staff/Notice";
import { SessionForm } from "@/components/staff/SessionForm";
import { staffApi } from "@/lib/data";
import { cancelSessionAction } from "@/lib/actions/staff";
import { requireStaff } from "@/lib/staff-guard";
import { sessionLine } from "@/lib/staff-format";
import { formatDayLong, formatTime, minutesBetween, vnDateKey } from "@/lib/time";

// S3 Edit a session: details, who's booked, and cancelling it for everyone.
export default async function SessionPage({ params, searchParams }: PageProps<"/staff/sessions/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await requireStaff();
  const api = staffApi();
  const [s, types, instructors] = await Promise.all([api.session(id), api.sessionTypes(), api.instructors()]);
  if (!s) notFound();
  const roster = await api.roster(id);
  const canEdit = me.role === "manager" || s.instructorId === me.userId;
  const active = roster.filter((r) => ["booked", "attended", "no_show"].includes(r.status));
  const ok = sp.created ? `Created ${sp.created} session${sp.created === "1" ? "" : "s"}.` : sp.saved ? "Saved." : null;

  return (
    <>
      <Link href={`/staff/calendar?date=${vnDateKey(s.startsAt)}`} className="small-link">← Calendar</Link>
      <h1 className="heading">{s.title.toLowerCase()} · {formatDayLong(vnDateKey(s.startsAt), "en").toLowerCase()}, {formatTime(s.startsAt, "en")}</h1>
      <Notice error={sp.error} ok={ok} />
      <div className="grid-2">
        {canEdit && s.status === "scheduled" ? (
          <SessionForm
            types={types}
            instructors={instructors}
            lockInstructor={me.role === "manager" ? null : me.userId}
            initial={{
              id: s.id, sessionTypeId: s.sessionTypeId, title: s.title, date: vnDateKey(s.startsAt), time: formatTime(s.startsAt, "en").padStart(5, "0"),
              minutes: minutesBetween(s.startsAt, s.endsAt), capacity: s.capacity, instructorId: s.instructorId, notes: s.notes,
            }}
          />
        ) : (
          <div className="card"><p style={{ margin: 0 }}>{s.instructorName ?? "No instructor"} · {sessionLine(s)}</p>{s.status === "closed" && <p className="muted small">This session has finished and been closed.</p>}</div>
        )}
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="staff-head"><h2 className="heading sec" style={{ margin: 0 }}>booked · {sessionLine(s)}</h2></div>
          {active.length === 0 && <p className="muted" style={{ margin: 0 }}>Nobody booked yet.</p>}
          {active.slice(0, 8).map((r) => (
            <div key={r.bookingId} className="list-row">
              <span><Link href={`/staff/customers/${r.customerId}`}>{r.fullName}</Link>{r.childNames.length > 0 && ` + ${r.childNames.join(", ")}`}</span>
              <span className={`tag ${r.freeTrial ? "tag-new" : r.unpaid && !r.paid ? "tag-pay" : "tag-ok"}`}>{r.freeTrial ? "free trial" : r.unpaid && !r.paid ? "Pay on the day" : r.credits ? "credit" : "paid"}</span>
            </div>
          ))}
          {active.length > 8 && <span className="muted small">+ {active.length - 8} more</span>}
          <div className="staff-actions" style={{ marginTop: 6 }}>
            <Link className="sbtn" href={`/staff/sessions/${s.id}/check-in`}>Check-in list</Link>
            {s.kind !== "private_hire" && <Link className="sbtn2" href={`/staff/book?session=${s.id}`}>Book someone in</Link>}
          </div>
          {me.role === "manager" && s.status === "scheduled" && (
            <details style={{ marginTop: 10 }}>
              <summary className="small" style={{ cursor: "pointer", color: "var(--coral-deep)", fontWeight: 600 }}>Cancel session for everyone</summary>
              <form action={cancelSessionAction} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <input type="hidden" name="id" value={s.id} />
                <p className="small" style={{ margin: 0 }}>Cancels all {active.length} booking{active.length === 1 ? "" : "s"} and returns credits (illness, floods…).</p>
                <div className="field"><label htmlFor="reason">Reason</label><input id="reason" name="reason" required /></div>
                <button className="sbtn-danger" type="submit">Cancel this session</button>
              </form>
            </details>
          )}
        </section>
      </div>
    </>
  );
}
