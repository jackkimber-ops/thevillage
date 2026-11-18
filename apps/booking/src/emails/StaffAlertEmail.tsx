import { Body, Button, Container, Head, Heading, Html, Text } from "@react-email/components";
import { render } from "@react-email/render";
import { formatVnd } from "@/lib/money";
import { formatDayLong, formatDayShort, formatTime, vnDateKey } from "@/lib/time";

// S25, changed 17 Nov (change #50): tells the studio about every booking and cancellation. New customers and
// unpaid drop-ins also ask someone to get in touch. Staff-facing, so English only (like the staff app).

export interface StaffAlert {
  event?: "booked" | "cancelled" | "late_cancelled";
  first: boolean;
  fullName: string;
  phone: string | null;
  preferredContact: "whatsapp" | "zalo" | "call";
  email: string | null;
  title: string;
  startsAt: string;
  unpaid: boolean;
  amountDueVnd: number;
  credits: number;
  packName: string | null;
  freeTrial?: boolean;
  childNames?: string[];
  /** "online" | "guest" | "staff" */
  source?: string | null;
  /** The staff member who booked or cancelled it, if one did. */
  by?: string | null;
  creditBack?: boolean;
  reason?: string | null;
  staffUrl: string; // the staff app's dashboard
}

const CONTACT = { whatsapp: "WhatsApp", zalo: "Zalo", call: "a call" } as const;

function lines(a: StaffAlert) {
  const event = a.event ?? "booked";
  const short = `${formatDayShort(vnDateKey(a.startsAt), "en")}, ${formatTime(a.startsAt, "en")}`;
  const when = `${formatDayLong(vnDateKey(a.startsAt), "en")}, ${formatTime(a.startsAt, "en")}`;
  const kids = a.childNames && a.childNames.length > 0 ? ` + ${a.childNames.join(", ")}` : "";
  const booked = event === "booked";
  const prefix = !booked ? (event === "late_cancelled" ? "Late cancellation" : "Cancelled")
    : a.first ? "New customer to welcome" : a.unpaid && !a.freeTrial ? "Pay-on-the-day booking" : "Booked";
  const heading = !booked ? (event === "late_cancelled" ? "a late cancellation" : "a booking was cancelled")
    : a.first ? "a new customer has booked" : a.unpaid && !a.freeTrial ? "an unpaid drop-in has booked" : "a new booking";
  const pay = booked
    ? (a.freeTrial ? "Free trial" : a.unpaid ? `Pay on the day: ${formatVnd(a.amountDueVnd, "en")}` : a.credits > 0 && a.packName ? `${a.credits} credit from their ${a.packName}` : a.credits > 0 ? `${a.credits} credit` : "Nothing to pay")
    : (a.creditBack ? "Their credit went back to their pack" : a.credits > 0 ? "Their credit is used (late), unless a manager restores it" : "Nothing to pay");
  const how = booked
    ? (a.by ? `Booked by ${a.by}` : a.source === "guest" ? "Booked online as a guest" : "Booked online")
    : (a.by ? `Cancelled by ${a.by}${a.reason ? ` (${a.reason})` : ""}` : "Cancelled online by the customer");
  return {
    subject: `${prefix}: ${a.fullName}, ${a.title}, ${short}`,
    heading,
    who: `${a.fullName}${kids}${a.phone ? ` · ${a.phone}` : ""} · prefers ${CONTACT[a.preferredContact]}${a.email ? ` · ${a.email}` : ""}`,
    what: `${a.title} · ${when}`,
    pay,
    how,
    ask: booked && (a.first || (a.unpaid && !a.freeTrial)) ? "Please get in touch to say hello and confirm, then mark them Contacted on the dashboard." : null,
    red: booked ? a.unpaid && !a.freeTrial : event === "late_cancelled",
  };
}

function StaffAlertHtml(a: StaffAlert) {
  const l = lines(a);
  return (
    <Html lang="en">
      <Head />
      <Body style={{ margin: 0, background: "#FFF4E6", fontFamily: "Helvetica, Arial, sans-serif", color: "#3B3A2A" }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "24px 18px" }}>
          <Heading as="h1" style={{ fontWeight: 500, color: "#5E5B3B", fontSize: 22, margin: "0 0 12px" }}>{l.heading}</Heading>
          <Text style={{ fontSize: 15, margin: 0, fontWeight: 600 }}>{l.who}</Text>
          <Text style={{ fontSize: 15, margin: "6px 0 0" }}>{l.what}</Text>
          <Text style={{ fontSize: 15, margin: "6px 0 0", color: l.red ? "#A44A2C" : "#66624A" }}>{l.pay}</Text>
          <Text style={{ fontSize: 14, margin: "6px 0 0", color: "#66624A" }}>{l.how}</Text>
          {l.ask && <Text style={{ fontSize: 14, margin: "14px 0 0" }}>{l.ask}</Text>}
          <Button href={a.staffUrl} style={{ background: "#5E5B3B", color: "#FFF4E6", borderRadius: 26, padding: "12px 22px", fontWeight: 600, fontSize: 15, marginTop: 16 }}>
            Open the dashboard
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderStaffAlert(a: StaffAlert) {
  const l = lines(a);
  return {
    subject: l.subject,
    html: await render(StaffAlertHtml(a)),
    text: [l.heading, "", l.who, l.what, l.pay, l.how, ...(l.ask ? ["", l.ask] : []), a.staffUrl].join("\n"),
  };
}

/** The staff app's address for this deployment: staff.<domain> in production, /staff on previews. */
export function staffUrlFor(appUrl: string) {
  return appUrl.includes("://book.") ? appUrl.replace("://book.", "://staff.") : `${appUrl}/staff`;
}

// An instructor's session was moved by someone else (Jack, 4 Nov). Sent 10 minutes after the move, once,
// with the time it was at before (a quick correction doesn't send two). English, like the staff app.
export interface InstructorMoved {
  name: string;
  title: string;
  fromStartsAt: string;
  startsAt: string;
  booked: number;
  staffUrl: string;
}

function movedLines(m: InstructorMoved) {
  const when = (iso: string) => `${formatDayLong(vnDateKey(iso), "en")}, ${formatTime(iso, "en")}`;
  return {
    subject: `Your session has moved: ${m.title}, now ${when(m.startsAt)}`,
    heading: `hi ${m.name.split(" ")[0].toLowerCase()}, your session has moved`,
    from: `Was: ${when(m.fromStartsAt)}`,
    to: `Now: ${when(m.startsAt)}`,
    booked: m.booked === 0 ? "Nobody is booked yet." : `${m.booked} ${m.booked === 1 ? "booking moved" : "bookings moved"} with it, and they've been emailed.`,
  };
}

function InstructorMovedHtml(m: InstructorMoved) {
  const l = movedLines(m);
  return (
    <Html lang="en">
      <Head />
      <Body style={{ margin: 0, background: "#FFF4E6", fontFamily: "Helvetica, Arial, sans-serif", color: "#3B3A2A" }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "24px 18px" }}>
          <Heading as="h1" style={{ fontWeight: 500, color: "#5E5B3B", fontSize: 22, margin: "0 0 12px" }}>{l.heading}</Heading>
          <Text style={{ fontSize: 15, margin: 0, fontWeight: 600 }}>{m.title}</Text>
          <Text style={{ fontSize: 15, margin: "6px 0 0", color: "#66624A", textDecoration: "line-through" }}>{l.from}</Text>
          <Text style={{ fontSize: 15, margin: "2px 0 0", fontWeight: 600 }}>{l.to}</Text>
          <Text style={{ fontSize: 14, margin: "14px 0 0" }}>{l.booked}</Text>
          <Button href={m.staffUrl} style={{ background: "#5E5B3B", color: "#FFF4E6", borderRadius: 26, padding: "12px 22px", fontWeight: 600, fontSize: 15, marginTop: 16 }}>
            Open the staff app
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderInstructorMoved(m: InstructorMoved) {
  const l = movedLines(m);
  return {
    subject: l.subject,
    html: await render(InstructorMovedHtml(m)),
    text: [l.heading, "", m.title, l.from, l.to, "", l.booked, m.staffUrl].join("\n"),
  };
}

// Minimum sign-ups (owners, 13 Nov; change #44): at 19:00 the evening before, tomorrow's classes with fewer booked
// than the minimum. Managers get every class, an instructor their own. Nothing is cancelled automatically.
export interface LowSignups {
  name: string;
  day: string; // YYYY-MM-DD (Vietnam)
  min: number;
  classes: Array<{ title: string; startsAt: string; booked: number; instructor: string | null }>;
  staffUrl: string;
}

function lowLines(l: LowSignups) {
  const day = formatDayLong(l.day, "en");
  const n = l.classes.length;
  return {
    subject: `${n === 1 ? "1 class" : `${n} classes`} tomorrow below ${l.min} booked: ${day}`,
    heading: `hi ${l.name.split(" ")[0].toLowerCase() || "team"}, ${n === 1 ? "a class tomorrow is" : "classes tomorrow are"} below the minimum`,
    intro: `${day}. The minimum is ${l.min} booked.`,
    rows: l.classes.map((c) => `${formatTime(c.startsAt, "en")} · ${c.title}${c.instructor ? ` (${c.instructor})` : ""} · ${c.booked === 0 ? "nobody booked" : `${c.booked} booked`}`),
    ask: "Nothing has been cancelled. If you decide to cancel, open the session in the staff app and use Cancel session for everyone: everyone booked gets an email. Customers can cancel themselves until the cut-off this evening.",
  };
}

function LowSignupsHtml(l: LowSignups) {
  const x = lowLines(l);
  return (
    <Html lang="en">
      <Head />
      <Body style={{ margin: 0, background: "#FFF4E6", fontFamily: "Helvetica, Arial, sans-serif", color: "#3B3A2A" }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "24px 18px" }}>
          <Heading as="h1" style={{ fontWeight: 500, color: "#5E5B3B", fontSize: 22, margin: "0 0 12px" }}>{x.heading}</Heading>
          <Text style={{ fontSize: 15, margin: 0 }}>{x.intro}</Text>
          {x.rows.map((r, i) => <Text key={i} style={{ fontSize: 15, margin: "6px 0 0", fontWeight: 600 }}>{r}</Text>)}
          <Text style={{ fontSize: 14, margin: "14px 0 0" }}>{x.ask}</Text>
          <Button href={l.staffUrl} style={{ background: "#5E5B3B", color: "#FFF4E6", borderRadius: 26, padding: "12px 22px", fontWeight: 600, fontSize: 15, marginTop: 16 }}>
            Open the staff app
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderLowSignups(l: LowSignups) {
  const x = lowLines(l);
  return {
    subject: x.subject,
    html: await render(LowSignupsHtml(l)),
    text: [x.heading, "", x.intro, ...x.rows, "", x.ask, l.staffUrl].join("\n"),
  };
}

// Daily summary (Jack, 17 Nov; change #51): at 21:05, after the cancellation cut-off, to the alert address.
export interface DailySummary {
  day: string; // YYYY-MM-DD (Vietnam)
  activity: Array<{
    at: string; event: string; fullName: string; title: string; startsAt: string; children: string[];
    onPack: boolean; unpaid: boolean; freeTrial: boolean; amountDueVnd: number; first: boolean; source: string; by: string | null;
  }>;
  tomorrow: Array<{
    title: string; startsAt: string; kind: string; capacity: number | null; taken: number; instructor: string | null;
    people: Array<{ name: string; children: string[]; unnamed: number; onPack: boolean; unpaid: boolean; amountDueVnd: number; freeTrial: boolean; first: boolean }>;
  }>;
  staffUrl: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function summaryLines(d: DailySummary) {
  const tomorrowKey = (() => { const t = new Date(`${d.day}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); })();
  const bookings = d.activity.filter((a) => a.event === "booked").length;
  const cancels = d.activity.length - bookings;
  const booked = d.tomorrow.reduce((n, s) => n + s.people.length, 0);
  const pay = (p: { onPack: boolean; unpaid: boolean; freeTrial: boolean; amountDueVnd: number }) =>
    p.freeTrial ? "free trial" : p.onPack ? "credit" : p.unpaid ? `pay on the day ${formatVnd(p.amountDueVnd, "en")}` : "paid";
  const who = (name: string, kids: string[], unnamed = 0) =>
    `${name}${kids.length ? ` + ${kids.join(", ")}` : ""}${unnamed ? ` + ${plural(unnamed, "child", "children")}` : ""}`;
  const activity = d.activity.map((a) => {
    const verb = a.event === "booked" ? "booked" : a.event === "late_cancelled" ? "late-cancelled" : "cancelled";
    const how = a.by ? `by ${a.by}` : a.source === "guest" ? "guest, online" : "online";
    return `${formatTime(a.at, "en")} · ${who(a.fullName, a.children)} ${verb} ${a.title}, ${formatDayShort(vnDateKey(a.startsAt), "en")} ${formatTime(a.startsAt, "en")} · ${a.event === "booked" ? `${pay(a)} · ` : ""}${how}${a.event === "booked" && a.first ? " · new customer" : ""}`;
  });
  const sessions = d.tomorrow.map((s) => ({
    head: `${formatTime(s.startsAt, "en")} ${s.title}${s.instructor ? ` (${s.instructor})` : ""} · ${s.capacity !== null ? `${s.taken}/${s.capacity}` : s.taken} ${s.kind === "open_play" ? "children" : "booked"}`,
    people: s.people.length === 0 ? ["Nobody booked"] : s.people.map((p) => `${who(p.name, p.children, p.unnamed)} · ${pay(p)}${p.first ? " · first visit" : ""}`),
  }));
  return {
    subject: `Daily summary, ${formatDayShort(d.day, "en")}: ${plural(bookings, "booking", "bookings")}, ${plural(cancels, "cancellation", "cancellations")} · tomorrow ${plural(d.tomorrow.length, "session", "sessions")}, ${booked} booked`,
    heading: `daily summary · ${formatDayLong(d.day, "en").toLowerCase()}`,
    todayTitle: "Today's bookings and cancellations",
    activity: activity.length ? activity : ["No bookings or cancellations today."],
    tomorrowTitle: `Tomorrow, ${formatDayLong(tomorrowKey, "en")} (final: online cancelling has closed)`,
    sessions,
    none: d.tomorrow.length === 0 ? "No sessions tomorrow." : null,
  };
}

function DailySummaryHtml(d: DailySummary) {
  const l = summaryLines(d);
  return (
    <Html lang="en">
      <Head />
      <Body style={{ margin: 0, background: "#FFF4E6", fontFamily: "Helvetica, Arial, sans-serif", color: "#3B3A2A" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "24px 18px" }}>
          <Heading as="h1" style={{ fontWeight: 500, color: "#5E5B3B", fontSize: 22, margin: "0 0 12px" }}>{l.heading}</Heading>
          <Text style={{ fontSize: 15, margin: "8px 0 4px", fontWeight: 600 }}>{l.todayTitle}</Text>
          {l.activity.map((r, i) => <Text key={i} style={{ fontSize: 14, margin: "2px 0" }}>{r}</Text>)}
          <Text style={{ fontSize: 15, margin: "18px 0 4px", fontWeight: 600 }}>{l.tomorrowTitle}</Text>
          {l.none && <Text style={{ fontSize: 14, margin: "2px 0" }}>{l.none}</Text>}
          {l.sessions.map((s, i) => (
            <div key={i}>
              <Text style={{ fontSize: 14, margin: "10px 0 2px", fontWeight: 600 }}>{s.head}</Text>
              {s.people.map((p, j) => <Text key={j} style={{ fontSize: 14, margin: "1px 0 1px 14px", color: "#66624A" }}>{p}</Text>)}
            </div>
          ))}
          <Button href={d.staffUrl} style={{ background: "#5E5B3B", color: "#FFF4E6", borderRadius: 26, padding: "12px 22px", fontWeight: 600, fontSize: 15, marginTop: 18 }}>
            Open the dashboard
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderDailySummary(d: DailySummary) {
  const l = summaryLines(d);
  return {
    subject: l.subject,
    html: await render(DailySummaryHtml(d)),
    text: [l.heading, "", l.todayTitle, ...l.activity, "", l.tomorrowTitle, ...(l.none ? [l.none] : []),
      ...l.sessions.flatMap((s) => ["", s.head, ...s.people.map((p) => `  ${p}`)]), "", d.staffUrl].join("\n"),
  };
}
