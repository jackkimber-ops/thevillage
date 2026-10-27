import Link from "next/link";
import { Notice } from "@/components/staff/Notice";
import { data, staffApi, type ContactItem } from "@/lib/data";
import { markContactedAction } from "@/lib/actions/staff";
import { formatVnd } from "@/lib/money";
import { requireStaff } from "@/lib/staff-guard";
import { sessionLine } from "@/lib/staff-format";
import { addDays, formatDayLong, formatTime, vnDateKey, vnDayStart } from "@/lib/time";

const fmtDay = (iso: string) => `${formatDayLong(vnDateKey(iso), "en").split(" ")[0].slice(0, 3)} ${formatTime(iso, "en")}`;

function why(c: ContactItem) {
  if (c.source === "guest" && c.firstBooking) return { label: "New · guest", cls: "tag-new" };
  if (c.firstBooking) return { label: c.source === "staff" ? "New · added by staff" : "New customer", cls: "tag-new" };
  return { label: "Unpaid drop-in", cls: "tag-pay" };
}

const CONTACT_LABEL = { whatsapp: "WhatsApp", zalo: "Zalo", call: "a call" } as const;

function digits(phone: string | null) {
  return (phone ?? "").replace(/\D/g, "");
}

// S1 Dashboard: the get-in-touch list and today's sessions.
export default async function Dashboard({ searchParams }: PageProps<"/staff">) {
  const sp = await searchParams;
  const me = await requireStaff();
  const api = staffApi();
  const today = vnDateKey(new Date());
  const [contacts, sessions, settings] = await Promise.all([
    api.contactList(), api.timetable(vnDayStart(today), vnDayStart(addDays(today, 1))), data().settings(),
  ]);
  const zaloBase = settings.zaloUrl ? settings.zaloUrl.replace(/\/[^/]*$/, "") : "https://zalo.me";

  return (
    <>
      <div className="staff-head">
        <h1 className="heading">{formatDayLong(today, "en").toLowerCase()}</h1>
        <div className="staff-actions">
          <Link className="sbtn" href="/staff/book">Book someone in</Link>
          <Link className="sbtn2" href="/staff/customers/new">Add customer</Link>
          {me.role === "manager" && <Link className="sbtn2" href="/staff/customers?sell=1">Sell a pack</Link>}
        </div>
      </div>
      <Notice error={sp.error} ok={sp.managers_only ? "That page is for managers only." : sp.booked ? "Booked in." : null} />
      <div className="grid-2">
        <section className="card" style={{ flex: "3 1 420px", display: "flex", flexDirection: "column", gap: 12, boxShadow: "inset 0 0 0 2px var(--rose)" }}>
          <div className="staff-head">
            <h2 className="heading sec" style={{ margin: 0 }}>get in touch to confirm</h2>
            <span className="muted small">{contacts.length} to contact</span>
          </div>
          {contacts.length === 0 && <p className="muted" style={{ margin: 0 }}>Nobody to contact right now.</p>}
          {contacts.map((c) => {
            const w = why(c);
            const d = digits(c.phone);
            return (
              <div key={c.bookingId} className="contact-row">
                <div style={{ minWidth: 220 }}>
                  <div><Link href={`/staff/customers/${c.customerId}`}><strong>{c.fullName}</strong></Link> <span className={`tag ${w.cls}`}>{w.label}</span></div>
                  <div className="muted small">
                    {c.title} · {fmtDay(c.startsAt)}
                    {c.freeTrial ? " · free trial" : c.unpaid ? ` · pay on the day · ${formatVnd(c.amountDueVnd, "en")}` : ""}
                  </div>
                  <div className="muted small">{c.phone} · prefers {CONTACT_LABEL[c.preferredContact]}</div>
                </div>
                <div className="staff-actions">
                  {d && <a className="sbtn2 sbtn-sm" href={`https://wa.me/${d}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                  {d && <a className="sbtn2 sbtn-sm" href={`${zaloBase}/${d.replace(/^84/, "0")}`} target="_blank" rel="noopener noreferrer">Zalo</a>}
                  {c.phone && <a className="sbtn2 sbtn-sm" href={`tel:${c.phone}`}>Call</a>}
                  <form action={markContactedAction}>
                    <input type="hidden" name="bookingId" value={c.bookingId} />
                    <button className="sbtn sbtn-sm" type="submit">Contacted ✓</button>
                  </form>
                </div>
              </div>
            );
          })}
          <span className="muted small">Bookings stand straight away. Message or call them the way they prefer, then tick Contacted. Or cancel the booking from the session.</span>
        </section>
        <section className="card" style={{ flex: "2 1 300px", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="heading sec" style={{ marginBottom: 4 }}>today</h2>
          {sessions.length === 0 && <p className="muted" style={{ margin: 0 }}>No sessions today.</p>}
          {sessions.map((s) => (
            <Link key={s.id} className={`sess-row kind-${s.kind}`} href={`/staff/sessions/${s.id}/check-in`}>
              <strong>{formatTime(s.startsAt, "en")}</strong>
              <span style={{ flex: 1 }}>{s.title}{s.instructorName ? ` · ${s.instructorName}` : ""}<br /><span className="small">{sessionLine(s)}</span></span>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
