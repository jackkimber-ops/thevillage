import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/staff/Notice";
import { SellPackForm } from "@/components/staff/SellPackForm";
import { staffApi } from "@/lib/data";
import { extendPackAction, restoreCreditAction, staffCancelBookingAction } from "@/lib/actions/staff";
import { formatVnd } from "@/lib/money";
import { requireStaff } from "@/lib/staff-guard";
import { addDays, formatDayShort, formatTime, vnDateKey } from "@/lib/time";

const CONTACT = { whatsapp: "WhatsApp", zalo: "Zalo", call: "Call" } as const;
const STATUS: Record<string, string> = { booked: "Booked", attended: "Attended", no_show: "No-show", cancelled: "Cancelled", late_cancelled: "Late cancellation" };

// S5 Customer profile (with S6 Sell a pack for managers).
export default async function CustomerPage({ params, searchParams }: PageProps<"/staff/customers/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await requireStaff();
  const api = staffApi();
  const c = await api.customer(id);
  if (!c) notFound();
  const packs = me.role === "manager" ? await api.packTypes() : [];
  const today = vnDateKey(new Date());
  const back = `/staff/customers/${id}`;
  const upcoming = c.bookings.filter((b) => b.status === "booked" && new Date(b.startsAt) > new Date());
  const history = c.bookings.filter((b) => !upcoming.includes(b)).slice(0, 15);
  const ok = sp.added ? "Customer added." : sp.sold ? "Pack sold and payment recorded." : sp.extended ? "Pack extended." : null;
  const monthYear = (d: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short", year: "numeric" }).format(new Date(`${d}T00:00:00Z`));

  return (
    <>
      <Link href="/staff/customers" className="small-link">← Customers</Link>
      <div className="staff-head">
        <div>
          <h1 className="heading">{c.fullName}</h1>
          <div className="muted small">{[c.phone, c.email, `prefers ${CONTACT[c.preferredContact]}`].filter(Boolean).join(" · ")}</div>
          {c.needsReview && <p className="notice notice-error" style={{ marginTop: 8 }}>Check this customer: a guest booking matched them by email, but the phone matches someone else.</p>}
        </div>
        <div className="staff-actions">
          <Link className="sbtn" href={`/staff/book?customer=${c.customerId}`}>Book in</Link>
          {me.role === "manager" && !c.hadFreeTrial && <Link className="sbtn2" href={`/staff/book?customer=${c.customerId}&trial=1`}>Give free trial</Link>}
        </div>
      </div>
      <Notice error={sp.error} ok={ok} />
      <div className="grid-2">
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="card">
            <h2 className="heading sec">packs</h2>
            {c.packs.length === 0 && <p className="muted" style={{ marginTop: 0 }}>No packs.</p>}
            {c.packs.map((p) => (
              <div key={p.id} className="list-row">
                <span><strong>{p.name}</strong><br /><span className="muted small">{p.lastDay < today ? "Expired" : "Expires"} {formatDayShort(p.lastDay, "en")} {p.lastDay.slice(0, 4)}</span></span>
                <span><strong style={{ fontSize: 20 }}>{p.remaining}</strong> <span className="small">of {p.credits} left</span></span>
                {me.role === "manager" && (
                  <details className="extend-pack">
                    <summary className="sbtn2 sbtn-sm">Extend</summary>
                    <form action={extendPackAction} className="staff-actions">
                      <input type="hidden" name="packId" value={p.id} />
                      <input type="hidden" name="back" value={back} />
                      <label className="small">New last day{" "}
                        <input type="date" name="newLastDay" required className="small-input"
                          min={addDays(p.lastDay, 1)} defaultValue={addDays(p.lastDay < today ? today : p.lastDay, 30)} />
                      </label>
                      <input name="reason" placeholder="Reason" required className="small-input" aria-label="Reason for extending" />
                      <button className="sbtn sbtn-sm" type="submit">Extend pack</button>
                    </form>
                  </details>
                )}
              </div>
            ))}
            {me.role === "manager" && (
              <details open={Boolean(sp.sell)} style={{ marginTop: 12 }}>
                <summary className="sbtn2" style={{ display: "inline-flex", listStyle: "none" }}>Sell a pack</summary>
                <div style={{ marginTop: 12 }}><SellPackForm customerId={c.customerId} packs={packs} today={today} /></div>
              </details>
            )}
          </section>
          <section className="card">
            <h2 className="heading sec">children</h2>
            {c.children.length === 0 && <p className="muted" style={{ margin: 0 }}>None added.</p>}
            {c.children.map((k) => <div key={k.id} className="list-row"><span>{k.name}</span><span className="muted small">born {monthYear(k.birthMonth)}</span></div>)}
          </section>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="card">
            <h2 className="heading sec">upcoming bookings</h2>
            {upcoming.length === 0 && <p className="muted" style={{ margin: 0 }}>None.</p>}
            {upcoming.map((b) => (
              <div key={b.id} className="list-row">
                <span>
                  <Link href={`/staff/sessions/${b.sessionId}`}><strong>{b.title}</strong></Link> · {formatDayShort(vnDateKey(b.startsAt), "en")} {formatTime(b.startsAt, "en")}
                  {b.childNames.length > 0 && ` · + ${b.childNames.join(", ")}`}
                  <br />
                  {b.freeTrial ? <span className="tag tag-new">Free trial</span> : b.unpaid && !b.paid ? <span className="tag tag-pay">Pay on the day · {formatVnd(b.amountDueVnd, "en")}</span> : <span className="muted small">{b.credits} credit · {b.packName}</span>}
                </span>
                <form action={staffCancelBookingAction}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <input type="hidden" name="back" value={back} />
                  <button className="sbtn2 sbtn-sm" type="submit">Cancel</button>
                </form>
              </div>
            ))}
          </section>
          <section className="card">
            <h2 className="heading sec">history</h2>
            {history.length === 0 && <p className="muted" style={{ margin: 0 }}>Nothing yet.</p>}
            {history.map((b) => (
              <div key={b.id} className="list-row">
                <span>{b.title} · {formatDayShort(vnDateKey(b.startsAt), "en")} · <span className="muted">{STATUS[b.status]}</span></span>
                {me.role === "manager" && b.credits > 0 && ["late_cancelled", "no_show"].includes(b.status) && (
                  <form action={restoreCreditAction} className="staff-actions">
                    <input type="hidden" name="bookingId" value={b.id} />
                    <input type="hidden" name="back" value={back} />
                    <input name="reason" placeholder="Reason" required className="small-input" aria-label="Reason for restoring" />
                    <button className="sbtn2 sbtn-sm" type="submit">Restore credit</button>
                  </form>
                )}
              </div>
            ))}
          </section>
          {me.role === "manager" && c.ledger.length > 0 && (
            <section className="card" style={{ overflowX: "auto" }}>
              <h2 className="heading sec">credit history</h2>
              <table>
                <thead><tr><th>When</th><th>What</th><th>Credits</th><th>Pack</th></tr></thead>
                <tbody>
                  {c.ledger.slice(0, 20).map((l, i) => (
                    <tr key={i}><td>{formatDayShort(vnDateKey(l.at), "en")} {formatTime(l.at, "en")}</td><td>{l.reason}</td><td>{l.amount > 0 ? `+${l.amount}` : l.amount}</td><td>{l.packName}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
