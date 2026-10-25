import { createAdminClient } from "@/lib/supabase/admin";

// Personal calendar feed (subscribe in Google/Apple Calendar). The token is secret and can be replaced.
// Titles and times only, never names.
export async function GET(_: Request, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token } = await ctx.params;
  const clean = token.replace(/\.ics$/, "");
  if (!/^[0-9a-f]{64}$/.test(clean) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response("Not found", { status: 404 });
  const db = createAdminClient();
  const [{ data, error }, { data: s }] = await Promise.all([
    db.rpc("calendar_feed", { p_token: clean }),
    db.from("studio_settings").select("name, address").single(),
  ]);
  if (error) return new Response("Error", { status: 500 });
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (v: string) => v.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const now = stamp(new Date().toISOString());
  const events = (data as Array<{ uid: string; title: string; starts_at: string; ends_at: string }>).flatMap((e) => [
    "BEGIN:VEVENT", `UID:${e.uid}@thevillagesaigon.com`, `DTSTAMP:${now}`, `DTSTART:${stamp(e.starts_at)}`, `DTEND:${stamp(e.ends_at)}`,
    `SUMMARY:${esc(e.title)}`, s?.address ? `LOCATION:${esc(s.address)}` : "", "END:VEVENT",
  ].filter(Boolean));
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Village//Booking//EN", `X-WR-CALNAME:${esc(s?.name ?? "The Village")}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H", ...events, "END:VCALENDAR", ""].join("\r\n");
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=900" } });
}
