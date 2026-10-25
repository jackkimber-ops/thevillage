import "server-only";
// DEMO DATA for local development and automated tests only (DEMO_DATA=1, no Supabase configured).
// Real settings, prices and sessions come from the database; never use this in staging or production.
import { addDays, vnDateKey } from "@/lib/time";
import type { DataSource, SessionDetail, StudioSettings, TimetableEntry } from "./types";

const settings: StudioSettings = {
  name: "The Village - Family Club",
  address: "47/1 Quốc Hương, An Khánh, Hồ Chí Minh",
  openingHours: "Every day 8:30–17:00",
  contactEmail: "thevillage.saigon@gmail.com",
  contactPhone: "+84933834068",
  whatsappUrl: "https://wa.me/84933834068",
  zaloUrl: "https://zalo.me/0933834068",
  messengerUrl: "https://m.me/thevillage.saigon",
  facebookUrl: "https://www.facebook.com/thevillage.saigon",
  instagramUrl: "https://www.instagram.com/thevillage.saigon",
  mapsUrl: "https://maps.app.goo.gl/shhU5KCEVMMrX4cd8",
  cancelCutoffTime: "20:00",
  bookingWindowDays: 31,
};

const CLASS = "demo-class";
const OPEN = "demo-open-play";

// A repeating demo week: [weekday (1 = Mon), start, minutes, title, kind, instructor, places left].
const WEEK: Array<[number, string, number, string, "class" | "open_play", string | null, number]> = [
  [1, "09:00", 60, "Pilates Flow", "class", "Mai", 4],
  [1, "10:30", 90, "Open Play", "open_play", null, 6],
  [1, "15:30", 60, "Strength", "class", "Anna", 0],
  [2, "09:30", 60, "Mum & Baby Yoga", "class", "Mai", 7],
  [2, "16:00", 60, "Dance Fit", "class", "Thu", 2],
  [3, "09:00", 60, "Pilates Flow", "class", "Mai", 8],
  [3, "10:30", 90, "Open Play", "open_play", null, 0],
  [4, "09:30", 60, "Mum & Baby Yoga", "class", "Mai", 5],
  [5, "09:00", 60, "Strength", "class", "Anna", 3],
  [6, "09:00", 60, "Pilates Flow", "class", "Mai", 10],
  [6, "10:30", 90, "Open Play", "open_play", null, 9],
  [0, "10:30", 90, "Open Play", "open_play", null, 10],
];

function demoSessions(): TimetableEntry[] {
  const today = vnDateKey(new Date());
  const out: TimetableEntry[] = [];
  for (let i = -7; i < 45; i++) {
    const day = addDays(today, i);
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    for (const [wd, time, minutes, title, kind, instructor, left] of WEEK) {
      if (wd !== weekday) continue;
      const start = new Date(`${day}T${time}:00+07:00`);
      const end = new Date(start.getTime() + minutes * 60000);
      out.push({
        id: `demo-${day}-${time.replace(":", "")}`,
        sessionTypeId: kind === "class" ? CLASS : OPEN,
        kind,
        title,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        instructorName: instructor,
        priceVnd: kind === "class" ? 450000 : 150000,
        capacity: 10,
        placesLeft: kind === "open_play" ? null : left,
        isFull: left === 0,
      });
    }
  }
  return out;
}

export const demoData: DataSource = {
  async settings() {
    return settings;
  },
  async timetable(from, to) {
    return demoSessions().filter((s) => new Date(s.startsAt) >= from && new Date(s.startsAt) < to);
  },
  async session(id): Promise<SessionDetail | null> {
    const s = demoSessions().find((x) => x.id === id);
    if (!s) return null;
    return {
      ...s,
      description: s.kind === "class"
        ? "A gentle full-body class. Your little one plays on the mat beside you."
        : "Play time for parents and little ones.",
      suits: s.kind === "class" ? "Babies and crawlers" : "Children up to 5",
      bring: s.kind === "class" ? "Water, a towel, a blanket for baby" : "Socks for everyone",
      colour: s.kind === "class" ? "#C3BF94" : "#FFBEA1",
      pictureUrl: null,
    };
  },
};
