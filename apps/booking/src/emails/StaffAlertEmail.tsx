import { Body, Button, Container, Head, Heading, Html, Text } from "@react-email/components";
import { render } from "@react-email/render";
import { formatVnd } from "@/lib/money";
import { formatDayLong, formatTime, vnDateKey } from "@/lib/time";

// S25: tells the studio about a new customer's first booking or an unpaid drop-in, so someone calls them.
// Staff-facing, so English only (like the staff app).

export interface StaffAlert {
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
  staffUrl: string; // the staff app's dashboard
}

const CONTACT = { whatsapp: "WhatsApp", zalo: "Zalo", call: "a call" } as const;

function lines(a: StaffAlert) {
  const when = `${formatDayLong(vnDateKey(a.startsAt), "en")}, ${formatTime(a.startsAt, "en")}`;
  return {
    subject: a.first ? `New customer to welcome: ${a.fullName}, ${a.title}` : `Pay-on-the-day booking: ${a.fullName}, ${a.title}`,
    heading: a.first ? "a new customer has booked" : "an unpaid drop-in has booked",
    who: `${a.fullName}${a.phone ? ` · ${a.phone}` : ""} · prefers ${CONTACT[a.preferredContact]}${a.email ? ` · ${a.email}` : ""}`,
    what: `${a.title} · ${when}`,
    pay: a.unpaid ? `Pay on the day: ${formatVnd(a.amountDueVnd, "en")}` : a.credits > 0 && a.packName ? `${a.credits} credit from their ${a.packName}` : "Nothing to pay",
    ask: "Please get in touch to say hello and confirm, then tick Contacted on the dashboard.",
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
          <Text style={{ fontSize: 15, margin: "6px 0 0", color: a.unpaid ? "#A44A2C" : "#66624A" }}>{l.pay}</Text>
          <Text style={{ fontSize: 14, margin: "14px 0 0" }}>{l.ask}</Text>
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
    text: [l.heading, "", l.who, l.what, l.pay, "", l.ask, a.staffUrl].join("\n"),
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
    heading: `hi ${l.name.split(" ")[0].toLowerCase()}, ${n === 1 ? "a class tomorrow is" : "classes tomorrow are"} below the minimum`,
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
