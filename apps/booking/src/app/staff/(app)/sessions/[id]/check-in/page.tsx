import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/staff/Notice";
import { staffApi } from "@/lib/data";
import { attendanceAction, recordPaymentAction, restoreCreditAction, staffCancelBookingAction } from "@/lib/actions/staff";
import { formatVnd } from "@/lib/money";
import { requireStaff } from "@/lib/staff-guard";
import { sessionLine } from "@/lib/staff-format";
import { formatDayShort, formatTime, vnDateKey } from "@/lib/time";

// S12 Check-in list: mark who came, no-shows and late cancellations; managers record payments.
export default async function CheckIn({ params, searchParams }: PageProps<"/staff/sessions/[id]/check-in">) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await requireStaff();
  const api = staffApi();
  const s = await api.session(id);
  if (!s) notFound();
  const roster = await api.roster(id);
  const here = roster.filter((r) => r.status === "attended").length;
  const back = `/staff/sessions/${id}/check-in`;
  const closed = s.status !== "scheduled";

  return (
    <>
      <Link href={`/staff/sessions/${id}`} className="small-link">← Session</Link>
      <h1 className="heading">{s.title.toLowerCase()} · {formatTime(s.startsAt, "en")}</h1>
      <p className="muted" style={{ margin: 0 }}>{formatDayShort(vnDateKey(s.startsAt), "en")} · {sessionLine(s)} · {here} here</p>
      <Notice error={sp.error} ok={sp.booked ? "Booked in." : null} />
      {roster.length === 0 && <p className="muted">Nobody booked yet.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {roster.map((r) => (
          <div key={r.bookingId} className="card checkin-row">
            <div style={{ flex: 1, minWidth: 200 }}>
              <strong>{r.fullName}</strong>
              <div className="muted small">
                {r.childNames.length > 0 ? `+ ${r.childNames.join(", ")}` : r.children > 0 ? `+ ${r.children} child${r.children > 1 ? "ren" : ""}` : "No children"}
                {r.parents > 1 && " · 2 parents"}
              </div>
              <div style={{ marginTop: 4 }} className="row">
                {r.freeTrial && <span className="tag tag-new">Free trial</span>}
                {r.firstBooking && <span className="tag tag-new">First visit</span>}
                {r.unpaid && !r.paid && <><span className="tag tag-pay">Pay on the day</span><strong className="small">{formatVnd(r.amountDueVnd, "en")}</strong></>}
                {r.unpaid && r.paid && <span className="tag tag-ok">Paid</span>}
                {r.credits > 0 && <span className="muted small">{r.credits} credit · {r.packName}</span>}
                {["late_cancelled", "no_show"].includes(r.status) && <span className="tag tag-warn">{r.status === "no_show" ? "No-show" : "Late cancel"}</span>}
              </div>
            </div>
            {!closed && ["booked", "attended", "no_show"].includes(r.status) && (
              <div className="staff-actions">
                {(["attended", "no_show"] as const).map((st) => (
                  <form key={st} action={attendanceAction}>
                    <input type="hidden" name="bookingId" value={r.bookingId} />
                    <input type="hidden" name="status" value={r.status === st ? "booked" : st} />
                    <input type="hidden" name="back" value={back} />
                    <button className={r.status === st ? "sbtn sbtn-sm" : "sbtn2 sbtn-sm"} type="submit" aria-pressed={r.status === st}>
                      {st === "attended" ? "Here" : "No-show"}
                    </button>
                  </form>
                ))}
                {r.status === "booked" && (
                  <form action={staffCancelBookingAction}>
                    <input type="hidden" name="bookingId" value={r.bookingId} />
                    <input type="hidden" name="back" value={back} />
                    <button className="sbtn2 sbtn-sm" type="submit">Late cancel</button>
                  </form>
                )}
              </div>
            )}
            {me.role === "manager" && r.unpaid && !r.paid && ["booked", "attended"].includes(r.status) && (
              <form action={recordPaymentAction} className="staff-actions" style={{ width: "100%" }}>
                <input type="hidden" name="customerId" value={r.customerId} />
                <input type="hidden" name="bookingId" value={r.bookingId} />
                <input type="hidden" name="amount" value={r.amountDueVnd} />
                <input type="hidden" name="paidFor" value={s.kind === "workshop" ? "workshop" : "drop_in"} />
                <input type="hidden" name="back" value={back} />
                <select name="method" aria-label="Payment method" className="small-select">
                  <option value="qr">QR</option><option value="transfer">Transfer</option><option value="cash">Cash</option>
                </select>
                <button className="sbtn sbtn-sm" type="submit">Record {formatVnd(r.amountDueVnd, "en")}</button>
              </form>
            )}
            {me.role === "manager" && r.credits > 0 && ["late_cancelled", "no_show"].includes(r.status) && (
              <form action={restoreCreditAction} className="staff-actions">
                <input type="hidden" name="bookingId" value={r.bookingId} />
                <input type="hidden" name="back" value={back} />
                <input name="reason" placeholder="Reason" required className="small-input" aria-label="Reason for restoring" />
                <button className="sbtn2 sbtn-sm" type="submit">Restore credit</button>
              </form>
            )}
          </div>
        ))}
      </div>
      <p className="muted small" style={{ margin: 0 }}>Anyone not marked is set to attended automatically after the class.</p>
      {!closed && s.kind !== "private_hire" && <Link className="sbtn2" style={{ alignSelf: "flex-start" }} href={`/staff/book?session=${id}&back=${encodeURIComponent(back)}`}>+ Book someone in</Link>}
    </>
  );
}
