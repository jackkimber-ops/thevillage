import "server-only";
// DEMO STORE for local development and automated tests only (DEMO_DATA=1, no Supabase configured).
// One in-memory copy of the studio shared by the customer site and the staff app, so a booking made on
// one shows on the other. It mimics the database rules loosely; the real rules are in supabase/migrations
// and tested in supabase/tests. Never used in staging or production.
import { randomUUID } from "node:crypto";
import { addDays, vnDateKey } from "@/lib/time";
import { ActionError, type BookingStatus, type ContactMethod, type MyPack, type SessionKind, type StudioSettings } from "./types";
import type { PackType, SessionType, StaffMember } from "./staff-types";

export const settings: StudioSettings = {
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

export const staff: Record<string, StaffMember> = {
  "manager@village.test": { userId: "demo-phuong", role: "manager", name: "Phuong", access: "all_customers" },
  "instructor@village.test": { userId: "demo-mai", role: "instructor", name: "Mai", access: "own_sessions" },
};
const instructorNames: Record<string, string> = { "demo-phuong": "Phuong", "demo-mai": "Mai", "demo-anna": "Anna" };

export const sessionTypes: SessionType[] = [
  { id: "demo-class", kind: "class", name: "Group class", defaultMinutes: 60, defaultCapacity: 10, dropInPriceVnd: 450000, active: true, description: "A gentle full-body class. Your little one plays on the mat beside you." },
  { id: "demo-open-play", kind: "open_play", name: "Open Play", defaultMinutes: 90, defaultCapacity: 10, dropInPriceVnd: 150000, active: true, description: "Play time for parents and little ones." },
  { id: "demo-hire", kind: "private_hire", name: "Private hire", defaultMinutes: 60, defaultCapacity: null, dropInPriceVnd: null, active: true, description: null },
];

export const packTypes: PackType[] = [
  { id: "demo-10", name: "10-class pack", credits: 10, priceVnd: 4000000, validityMonths: 3, validityDays: null, isIntro: false, onSale: true, coversSessionTypeIds: ["demo-class"] },
  { id: "demo-20", name: "20-class pack", credits: 20, priceVnd: 7200000, validityMonths: 7, validityDays: null, isIntro: false, onSale: true, coversSessionTypeIds: ["demo-class"] },
  { id: "demo-intro", name: "Intro pack · 3 classes", credits: 3, priceVnd: 750000, validityMonths: null, validityDays: 21, isIntro: true, onSale: true, coversSessionTypeIds: ["demo-class"] },
];

export type DemoSession = {
  id: string;
  sessionTypeId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  instructorId: string | null;
  capacity: number | null;
  baseTaken: number; // pretend bookings from other people
  status: "scheduled" | "cancelled" | "closed";
  notes: string | null;
};

export type DemoBooking = {
  id: string;
  sessionId: string;
  customerId: string;
  status: BookingStatus;
  source: "online" | "staff" | "guest";
  parents: number;
  childIds: string[];
  unnamedChildren: number;
  credits: number;
  packId: string | null;
  unpaid: boolean;
  paid: boolean;
  amountDueVnd: number;
  freeTrial: boolean;
  firstBooking: boolean;
  contacted: boolean;
  createdAt: string;
};

export type DemoCustomer = {
  id: string;
  email: string | null;
  fullName: string | null; // null until "your details" are saved
  phone: string | null;
  preferredContact: ContactMethod;
  language?: "en" | "vi";
  deactivated?: boolean;
  children: Array<{ id: string; name: string; birthMonth: string }>;
  packs: Array<MyPack & { packTypeId: string }>;
  ledger: Array<{ at: string; kind: string; amount: number; reason: string; packId: string }>;
  createdAt: string;
};

// [weekday (0 = Sun), start, minutes, title, type, instructor, places already taken]
const WEEK: Array<[number, string, number, string, string, string | null, number]> = [
  [1, "09:00", 60, "Pilates Flow", "demo-class", "demo-mai", 6],
  [1, "10:30", 90, "Open Play", "demo-open-play", null, 4],
  [1, "15:30", 60, "Strength", "demo-class", "demo-anna", 10],
  [2, "09:30", 60, "Mum & Baby Yoga", "demo-class", "demo-mai", 3],
  [2, "16:00", 60, "Dance Fit", "demo-class", "demo-phuong", 8],
  [3, "09:00", 60, "Pilates Flow", "demo-class", "demo-mai", 2],
  [3, "10:30", 90, "Open Play", "demo-open-play", null, 10],
  [4, "09:30", 60, "Mum & Baby Yoga", "demo-class", "demo-mai", 5],
  [5, "09:00", 60, "Strength", "demo-class", "demo-anna", 7],
  [6, "09:00", 60, "Pilates Flow", "demo-class", "demo-mai", 0],
  [6, "10:30", 90, "Open Play", "demo-open-play", null, 1],
  [0, "10:30", 90, "Open Play", "demo-open-play", null, 0],
];

function seedSessions(): DemoSession[] {
  const today = vnDateKey(new Date());
  const out: DemoSession[] = [];
  for (let i = -7; i < 45; i++) {
    const day = addDays(today, i);
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    for (const [wd, time, minutes, title, type, instructor, taken] of WEEK) {
      if (wd !== weekday) continue;
      const start = new Date(`${day}T${time}:00+07:00`);
      out.push({
        id: `demo-${day}-${time.replace(":", "")}`,
        sessionTypeId: type,
        title,
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + minutes * 60000).toISOString(),
        instructorId: instructor,
        capacity: 10,
        baseTaken: taken,
        status: "scheduled",
        notes: null,
      });
    }
  }
  // A class going on right now, so check-in (Here / No-show, shown on the day only) can be tried any time.
  const now = Math.floor(Date.now() / 900000) * 900000;
  out.push({
    id: "demo-now", sessionTypeId: "demo-class", title: "Practice class (on now)",
    startsAt: new Date(now - 30 * 60000).toISOString(), endsAt: new Date(now + 90 * 60000).toISOString(),
    instructorId: "demo-mai", capacity: 10, baseTaken: 2, status: "scheduled", notes: null,
  });
  return out;
}

type Store = { sessions: DemoSession[]; bookings: DemoBooking[]; customers: Map<string, DemoCustomer> };
const g = globalThis as unknown as { __villageDemo?: Store };
export const store: Store = (g.__villageDemo ??= { sessions: seedSessions(), bookings: [], customers: new Map() });

export const typeOf = (s: DemoSession) => sessionTypes.find((t) => t.id === s.sessionTypeId)!;
export const kindOf = (s: DemoSession): SessionKind => typeOf(s).kind;
export const instructorName = (id: string | null) => (id ? instructorNames[id] ?? null : null);

export function taken(s: DemoSession): number {
  const kind = kindOf(s);
  return s.baseTaken + store.bookings
    .filter((b) => b.sessionId === s.id && ["booked", "attended", "no_show"].includes(b.status))
    .reduce((sum, b) => sum + (kind === "open_play" ? b.childIds.length + b.unnamedChildren : b.parents), 0);
}

export function customerByEmail(email: string, create = true): DemoCustomer | undefined {
  const key = email.toLowerCase();
  let c = [...store.customers.values()].find((x) => x.email === key);
  if (!c && create) {
    c = { id: randomUUID(), email: key, fullName: null, phone: null, preferredContact: "whatsapp", children: [], packs: [], ledger: [], createdAt: new Date().toISOString() };
    store.customers.set(c.id, c);
    if (key.includes("+pack")) addPack(c, packTypes[0], vnDateKey(new Date()));
  }
  return c;
}

export function addPack(c: DemoCustomer, t: PackType, from: string) {
  const id = randomUUID();
  const last = t.validityMonths ? addDays(addMonthsKey(from, t.validityMonths), -1) : addDays(from, (t.validityDays ?? 1) - 1);
  c.packs.push({ id, packTypeId: t.id, name: t.name, credits: t.credits, remaining: t.credits, reserved: 0, used: 0, validFrom: from, lastDay: last, pausedDays: 0, sessionTypeIds: t.coversSessionTypeIds });
  c.ledger.push({ at: new Date().toISOString(), kind: "purchase", amount: t.credits, reason: `Bought ${t.name}`, packId: id });
  return id;
}

function addMonthsKey(key: string, months: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function cutoff(startsAt: string) {
  return new Date(`${addDays(vnDateKey(startsAt), -1)}T${settings.cancelCutoffTime}:00+07:00`);
}

export function book(d: {
  sessionId: string; customer: DemoCustomer; childIds: string[]; unnamedChildren?: number; parents: number;
  source: "online" | "staff" | "guest"; freeTrial?: boolean; override?: boolean;
}): string {
  const s = store.sessions.find((x) => x.id === d.sessionId);
  if (!s || s.status !== "scheduled") throw new ActionError("session_not_bookable");
  const kind = kindOf(s);
  if (kind === "private_hire") throw new ActionError("session_not_bookable");
  if (d.customer.deactivated) throw new ActionError("customer_deactivated");
  if (!d.override && new Date(s.startsAt).getTime() - 3600_000 < Date.now()) throw new ActionError("too_late_to_book");
  const children = d.childIds.length + (d.unnamedChildren ?? 0);
  if (children > 2) throw new ActionError("too_many_children");
  if (kind === "open_play" && children < 1) throw new ActionError("open_play_needs_a_child");
  const units = kind === "open_play" ? children : 1;
  if (s.capacity !== null && taken(s) + units > s.capacity) throw new ActionError("session_full");
  const mine = store.bookings.filter((b) => b.customerId === d.customer.id);
  if (mine.some((b) => b.sessionId === s.id && ["booked", "attended", "no_show"].includes(b.status))) throw new ActionError("already_booked");
  if (d.source === "guest" && mine.some((b) => b.unpaid && !b.paid && b.status === "booked" && new Date(store.sessions.find((x) => x.id === b.sessionId)!.endsAt) > new Date())) {
    throw new ActionError("guest_unpaid_limit");
  }
  if (d.freeTrial && (kind !== "class" || mine.some((b) => b.freeTrial && b.status !== "cancelled"))) {
    throw new ActionError(kind !== "class" ? "free_trial_class_only" : "free_trial_used");
  }
  const needed = d.freeTrial ? 0 : kind === "open_play" ? children : kind === "workshop" ? 0 : 1;
  const day = vnDateKey(s.startsAt);
  const pack = needed > 0
    ? d.customer.packs.filter((p) => p.sessionTypeIds.includes(s.sessionTypeId) && p.remaining >= needed && p.validFrom <= day && p.lastDay >= day)
        .sort((a, b) => a.lastDay.localeCompare(b.lastDay))[0]
    : undefined;
  const id = randomUUID();
  if (pack) {
    pack.remaining -= needed;
    pack.reserved += needed;
    d.customer.ledger.push({ at: new Date().toISOString(), kind: "reserve", amount: -needed, reason: `Booked ${s.title}`, packId: pack.id });
  }
  const price = typeOf(s).dropInPriceVnd ?? 0;
  store.bookings.push({
    id, sessionId: s.id, customerId: d.customer.id, status: "booked", source: d.source, parents: d.parents,
    childIds: d.childIds, unnamedChildren: d.unnamedChildren ?? 0, credits: pack ? needed : 0, packId: pack?.id ?? null,
    unpaid: !pack && !d.freeTrial && price > 0, paid: false, amountDueVnd: pack || d.freeTrial ? 0 : price * units,
    freeTrial: Boolean(d.freeTrial), firstBooking: !mine.some((b) => b.status !== "cancelled"), contacted: false,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export function cancel(bookingId: string, byStaff: boolean, reason = "Cancelled"): BookingStatus {
  const b = store.bookings.find((x) => x.id === bookingId);
  if (!b) throw new ActionError("booking_not_found");
  if (b.status !== "booked") throw new ActionError("booking_not_active");
  const s = store.sessions.find((x) => x.id === b.sessionId)!;
  const inTime = Date.now() < cutoff(s.startsAt).getTime();
  if (!byStaff && !inTime) throw new ActionError("cutoff_passed");
  b.status = inTime ? "cancelled" : "late_cancelled";
  const c = store.customers.get(b.customerId)!;
  const pack = c.packs.find((p) => p.id === b.packId);
  if (pack) {
    pack.reserved -= b.credits;
    if (inTime) {
      pack.remaining += b.credits;
      c.ledger.push({ at: new Date().toISOString(), kind: "return", amount: b.credits, reason, packId: pack.id });
    } else {
      pack.used += b.credits;
      c.ledger.push({ at: new Date().toISOString(), kind: "forfeit", amount: 0, reason: "Late cancellation", packId: pack.id });
    }
  }
  return b.status;
}
