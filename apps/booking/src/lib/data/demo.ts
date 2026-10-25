import "server-only";
// DEMO DATA for local development and automated tests only (see demo-store.ts).
import { instructorName, kindOf, settings, store, taken, typeOf, type DemoSession } from "./demo-store";
import type { DataSource, SessionDetail, TimetableEntry } from "./types";

function entry(s: DemoSession): TimetableEntry {
  const kind = kindOf(s);
  const t = taken(s);
  return {
    id: s.id,
    sessionTypeId: s.sessionTypeId,
    kind,
    title: s.title,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    instructorName: instructorName(s.instructorId),
    priceVnd: typeOf(s).dropInPriceVnd,
    capacity: s.capacity,
    placesLeft: kind === "open_play" || s.capacity === null ? null : Math.max(s.capacity - t, 0),
    isFull: s.capacity !== null && t >= s.capacity,
  };
}

export const demoData: DataSource = {
  async settings() {
    return settings;
  },
  async dropInPrices() {
    return { classVnd: 450000, openPlayVnd: 150000 };
  },
  async timetable(from, to) {
    return store.sessions
      .filter((s) => s.status === "scheduled" && kindOf(s) !== "private_hire" && new Date(s.startsAt) >= from && new Date(s.startsAt) < to)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(entry);
  },
  async session(id): Promise<SessionDetail | null> {
    const s = store.sessions.find((x) => x.id === id && x.status === "scheduled");
    if (!s) return null;
    const kind = kindOf(s);
    return {
      ...entry(s),
      description: typeOf(s).description,
      suits: kind === "class" ? "Babies and crawlers" : "Children up to 5",
      bring: kind === "class" ? "Water, a towel, a blanket for baby" : "Socks for everyone",
      colour: kind === "class" ? "#C3BF94" : "#FFBEA1",
      pictureUrl: null,
    };
  },
};
