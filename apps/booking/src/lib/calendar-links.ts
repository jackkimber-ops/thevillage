// Calendar links for one booking (server and browser).

/** Google Calendar's "new event" page, filled in. Times in UTC. */
export function googleCalendarUrl(e: { title: string; startsAt: string; endsAt: string; location: string; details: string }) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${stamp(e.startsAt)}/${stamp(e.endsAt)}`, location: e.location, details: e.details });
  return `https://calendar.google.com/calendar/render?${q}`;
}
