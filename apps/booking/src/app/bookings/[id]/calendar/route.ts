import { account, data } from "@/lib/data";

// "Add to my calendar" for one booking: a small .ics file (title, time and place; no names).
export async function GET(_: Request, ctx: RouteContext<"/bookings/[id]/calendar">) {
  const { id } = await ctx.params;
  const b = (await account().myBookings()).find((x) => x.id === id);
  if (!b) return new Response("Not found", { status: 404 });
  const s = await data().settings();
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (v: string) => v.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Village//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.id}@thevillagesaigon.com`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.session.startsAt)}`,
    `DTEND:${stamp(b.session.endsAt)}`,
    `SUMMARY:${esc(`${b.session.title} · ${s.name}`)}`,
    `LOCATION:${esc(s.address)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="the-village-${b.id.slice(0, 8)}.ics"` },
  });
}
