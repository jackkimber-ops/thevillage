import "server-only";
// DEMO DATA for local development and automated tests only (see demo-store.ts).
import { instructorName, kindOf, settings, store, taken, typeOf, type DemoSession } from "./demo-store";
import type { DataSource, SessionDetail, TimetableEntry } from "./types";

// Badges for the demo types, so the timetable looks as it will with real data (change list #5).
const DEMO_LOOK: Record<string, { colour: string; pictureUrl: string | null }> = {
  "demo-class": { colour: "#858152", pictureUrl: "/brand/badges/core-cuddle.png" },
  "demo-open-play": { colour: "#FFBA9B", pictureUrl: "/brand/badges/open-play.png" },
};

function entry(s: DemoSession): TimetableEntry {
  const kind = kindOf(s);
  const t = taken(s);
  const look = DEMO_LOOK[s.sessionTypeId] ?? { colour: "#E8E3C5", pictureUrl: null };
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
    bookingClosed: new Date(s.startsAt).getTime() - 3600_000 < Date.now(),
    typeName: typeOf(s).name,
    ...look,
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
    };
  },
};
