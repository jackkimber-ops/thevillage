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
