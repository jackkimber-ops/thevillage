import Link from "next/link";
import { CalendarFeed } from "@/components/CalendarFeed";
import { Notice } from "@/components/staff/Notice";
import { FEED_TEXT, HOME_SCREEN_TEXT } from "@/lib/staff-feed-text";
import { HomeScreenTip } from "@/components/HomeScreenTip";
import { data, staffApi, type ContactItem } from "@/lib/data";
import { logContactAction, undoContactAction } from "@/lib/actions/staff";
import { WAY_LABEL, WAYS, wayPhrase } from "@/lib/contact-ways";
import { formatVnd } from "@/lib/money";
import { requireStaff } from "@/lib/staff-guard";
import { sessionLine } from "@/lib/staff-format";
import { addDays, formatDayLong, formatDayShort, formatTime, vnDateKey, vnDayStart } from "@/lib/time";

// "Mon 16 Nov, 9:00": the date too, not just the weekday (Jack, 10 Nov).
const fmtDay = (iso: string) => `${formatDayShort(vnDateKey(iso), "en")}, ${formatTime(iso, "en")}`;

// "9:12" today, "Mon 16 Nov, 9:12" another day.
const fmtWhen = (iso: string, today: string) => (vnDateKey(iso) === today ? formatTime(iso, "en") : fmtDay(iso));

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
  const todo = contacts.filter((c) => !c.contactedAt);
  const doneToday = contacts.filter((c) => c.contactedAt);
  contacts.sort((a, b) => a.startsAt.localeCompare(b.startsAt)); // contacted ones stay where they were
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
            <span className="muted small">{todo.length} to contact{doneToday.length > 0 ? ` · ${doneToday.length} contacted today` : ""}</span>
          </div>
          {contacts.length === 0 && <p className="muted" style={{ margin: 0 }}>Nobody to contact right now.</p>}
          {contacts.map((c) => {
            const w = why(c);
            const d = digits(c.phone);
            const done = c.contactedAt !== null;
            return (
              <div key={c.bookingId} className={`contact-row${done ? " contact-done" : ""}`}>
                <div style={{ minWidth: 220 }}>
                  <div><Link href={`/staff/customers/${c.customerId}`}><strong>{c.fullName}</strong></Link> <span className={`tag ${w.cls}`}>{w.label}</span></div>
                  <div className="muted small">
                    {c.title} · {fmtDay(c.startsAt)}
                    {c.freeTrial ? " · free trial" : c.unpaid ? ` · pay on the day · ${formatVnd(c.amountDueVnd, "en")}` : ""}
                  </div>
                  <div className="muted small">{c.phone} · prefers {CONTACT_LABEL[c.preferredContact]}</div>
                  {done ? (
                    <div className="small contact-who">
                      ✓ Contacted {wayPhrase(c.contactedWay ?? "call")}{c.contactedBy ? ` by ${c.contactedBy}` : ""}, {formatTime(c.contactedAt!, "en")}
                    </div>
                  ) : c.lastTry && (
                    <div className="small contact-tries">
                      No answer{c.tries > 1 ? ` ×${c.tries}` : ""} · last tried {wayPhrase(c.lastTry.way)}{c.lastTry.by ? ` by ${c.lastTry.by}` : ""}, {fmtWhen(c.lastTry.at, today)}
                    </div>
                  )}
                </div>
                {!done && (
                  <div className="staff-actions">
                    {d && <a className="sbtn2 sbtn-sm" href={`https://wa.me/${d}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                    {d && <a className="sbtn2 sbtn-sm" href={`${zaloBase}/${d.replace(/^84/, "0")}`} target="_blank" rel="noopener noreferrer">Zalo</a>}
                    {c.phone && <a className="sbtn2 sbtn-sm" href={`tel:${c.phone}`}>Call</a>}
                  </div>
                )}
                {done ? (
                  // Tapping the dark button again puts them back to "Not contacted" (logged).
                  <form action={undoContactAction} className="staff-actions contact-log">
                    <input type="hidden" name="bookingId" value={c.bookingId} />
                    <button className="contact-toggle" type="submit" aria-pressed="true" title="Tap to undo">Contacted ✓</button>
                  </form>
                ) : (
                  <form action={logContactAction} className="staff-actions contact-log">
                    <input type="hidden" name="bookingId" value={c.bookingId} />
                    <label className="small" htmlFor={`way-${c.bookingId}`}>How</label>
                    <select id={`way-${c.bookingId}`} name="way" defaultValue={c.preferredContact} className="small-input">
                      {WAYS.map((x) => <option key={x} value={x}>{WAY_LABEL[x]}</option>)}
                    </select>
                    <button className="sbtn2 sbtn-sm" type="submit" name="outcome" value="no_answer">No answer</button>
                    <button className="contact-toggle" type="submit" name="outcome" value="contacted" aria-pressed="false">Not contacted</button>
                  </form>
                )}
              </div>
            );
          })}
          <span className="muted small">Bookings stand straight away. Message or call them the way they prefer, choose how, then tap Not contacted: it turns dark green, Contacted ✓, and says who and how. No answer keeps them waiting so someone tries again. Contacted ones stay here until the end of the day; tap Contacted ✓ again to undo. Or cancel the booking from the session.</span>
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
      <HomeScreenTip text={HOME_SCREEN_TEXT} hideKey="village:staff-home-screen-tip" />
      <CalendarFeed text={me.role === "manager" ? { ...FEED_TEXT, title: "Add the studio's sessions to my calendar", body: "Managers' calendars show every session. Titles and times only, no customer names." } : FEED_TEXT} staff />
    </>
  );
}
