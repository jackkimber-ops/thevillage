import { Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { formatVnd } from "@/lib/money";
import { formatDayLong, formatDayShort, formatTime, formatTimeRange, vnDateKey } from "@/lib/time";
import { en, fill, vi } from "./strings";
import type { EmailData } from "./types";

// Brand colours (design/brand/README.md). Emails need inline styles.
const C = { linen: "#FFF4E6", sky: "#E8E3C5", sage: "#C3BF94", ink: "#3B3A2A", muted: "#66624A", deep: "#5E5B3B", coralDeep: "#A44A2C" };
const font = "'Work Sans', Helvetica, Arial, sans-serif";
const heading = "'Lexend Deca', Helvetica, Arial, sans-serif";

export function strings(lang: "en" | "vi") {
  return lang === "vi" ? vi : en;
}

export function when(d: EmailData, iso: string) {
  return `${formatDayLong(vnDateKey(iso), d.lang)}, ${formatTime(iso, d.lang)}`;
}

export function subjectFor(d: EmailData): string {
  const s = strings(d.lang);
  return fill(s.subject[d.kind], { title: d.title, when: when(d, d.startsAt), time: formatTime(d.startsAt, d.lang) });
}

/** The lines shared by the HTML and plain-text versions. */
export function lines(d: EmailData) {
  const s = strings(d.lang);
  const who = s.you + (d.childNames.length ? fill(s.plusChildren, { names: d.childNames.join(", ") }) : "") + (d.parents > 1 ? s.secondParent : "");
  const pay = d.freeTrial
    ? s.freeTrial
    : d.credits > 0 && d.packName
      ? fill(s.creditFrom, { n: d.credits, pack: d.packName })
      : d.unpaid
        ? fill(s.payOnTheDay, { amount: formatVnd(d.amountDueVnd, d.lang) })
        : null;
  const cutoffPassed = new Date(d.cancelCutoff).getTime() <= Date.now();
  const cancelLine = cutoffPassed
    ? s.cantCancel
    : fill(s.freeCancel, { time: formatTime(d.cancelCutoff, d.lang), day: formatDayShort(vnDateKey(d.cancelCutoff), d.lang) });
  const note =
    d.kind === "session_moved" ? [fill(s.movedFrom, { old: when(d, d.oldStartsAt ?? d.startsAt) }), s.movedNote]
    : d.kind === "session_cancelled" ? [d.reason ? fill(s.cancelledReason, { reason: d.reason }) : null, d.credits > 0 && d.packName ? fill(s.creditBack, { pack: d.packName }) : s.nothingToPay]
    : [d.unpaid ? s.payHow : null, cancelLine];
  return {
    heading: fill(s.heading[d.kind], { name: d.firstName }),
    title: d.title,
    time: `${formatDayLong(vnDateKey(d.startsAt), d.lang)} · ${formatTimeRange(d.startsAt, d.endsAt, d.lang)}`,
    who,
    pay: d.kind === "session_cancelled" ? null : pay,
    notes: note.filter((x): x is string => Boolean(x)),
  };
}

export function CustomerEmail(d: EmailData) {
  const s = strings(d.lang);
  const l = lines(d);
  const st = d.settings;
  const messages = [
    st.zaloUrl && { label: "Zalo", href: st.zaloUrl },
    st.whatsappUrl && { label: "WhatsApp", href: st.whatsappUrl },
    { label: "Email", href: `mailto:${st.contactEmail}` },
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  return (
    <Html lang={d.lang}>
      <Head />
      <Preview>{`${l.title} · ${l.time}`}</Preview>
      <Body style={{ margin: 0, background: C.linen, fontFamily: font, color: C.ink }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "24px 18px" }}>
          <Img src={`${d.appUrl}/brand/wordmark-full-colour.png`} alt="the village." width="110" height="51" />
          <Heading as="h1" style={{ fontFamily: heading, fontWeight: 500, textTransform: "lowercase", color: C.deep, fontSize: 26, margin: "22px 0 14px" }}>
            {l.heading}
          </Heading>
          <Section style={{ background: "#ffffff", borderRadius: 20, padding: "16px 18px" }}>
            <Text style={{ margin: 0, fontSize: 17, fontWeight: 600, textDecoration: d.kind === "session_cancelled" ? "line-through" : "none" }}>{l.title}</Text>
            <Text style={{ margin: "2px 0 0", fontSize: 15, color: C.muted }}>{l.time}</Text>
            <Text style={{ margin: "8px 0 0", fontSize: 15 }}>{l.who}</Text>
            {l.pay && <Text style={{ margin: "6px 0 0", fontSize: 14, color: d.unpaid ? C.coralDeep : C.muted, fontWeight: d.unpaid ? 600 : 400 }}>{l.pay}</Text>}
          </Section>
          {l.notes.map((n, i) => <Text key={i} style={{ fontSize: 14, lineHeight: "21px", margin: "12px 0 0" }}>{n}</Text>)}
          <Button href={`${d.appUrl}/bookings`} style={{ background: C.deep, color: C.linen, borderRadius: 26, padding: "14px 24px", fontWeight: 600, fontSize: 15, marginTop: 18 }}>
            {s.seeBookings}
          </Button>
          <Hr style={{ borderColor: C.sage, margin: "26px 0 14px" }} />
          <Text style={{ fontSize: 14, margin: 0, fontWeight: 600 }}>{s.findUs}</Text>
          <Text style={{ fontSize: 14, margin: "2px 0 0", color: C.muted }}>{st.address} · {st.openingHours}</Text>
          {st.mapsUrl && <Link href={st.mapsUrl} style={{ fontSize: 14, color: C.deep }}>{s.openMaps}</Link>}
          <Text style={{ fontSize: 14, margin: "14px 0 0" }}>
            {s.messageUs}{" "}
            {messages.map((m, i) => (
              <span key={m.label}>{i > 0 && " · "}<Link href={m.href} style={{ color: C.deep }}>{m.label}</Link></span>
            ))}
          </Text>
          <Text style={{ fontSize: 12, color: C.muted, margin: "22px 0 0" }}>{fill(s.footer, { studio: st.name })}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function plainText(d: EmailData): string {
  const s = strings(d.lang);
  const l = lines(d);
  return [
    l.heading, "", l.title, l.time, l.who, l.pay ?? "", "", ...l.notes, "",
    `${s.seeBookings}: ${d.appUrl}/bookings`, "", `${d.settings.address} · ${d.settings.openingHours}`,
    d.settings.mapsUrl ?? "", `${s.messageUs} ${d.settings.contactEmail}`,
  ].filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n");
}
