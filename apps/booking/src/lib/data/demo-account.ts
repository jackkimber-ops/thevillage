import "server-only";
// DEMO ACCOUNTS for local development and automated tests only (DEMO_DATA=1, no Supabase configured).
// Kept in memory; the code is always 123456. An email containing "+pack" starts with a 10-class pack.
// The real rules live in the database and are tested in supabase/tests; this only mimics them for the screens.
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { addDays, vnDateKey } from "@/lib/time";
import { demoData } from "./demo";
import { ActionError, type Account, type Me, type MyBooking, type MyPack } from "./types";

const COOKIE = "demo_user";
const DEMO_CODE = "123456";

type Person = { id: string; email: string; me: Me | null; packs: MyPack[]; bookings: MyBooking[] };
const people = new Map<string, Person>();

function person(email: string): Person {
  const key = email.toLowerCase();
  let p = people.get(key);
  if (!p) {
    p = { id: randomUUID(), email: key, me: null, packs: [], bookings: [] };
    if (key.includes("+pack")) {
      const today = vnDateKey(new Date());
      p.packs.push({
        id: randomUUID(), name: "10-class pack", credits: 10, remaining: 10, reserved: 0, used: 0,
        validFrom: today, lastDay: addDays(today, 90), pausedDays: 0, sessionTypeIds: ["demo-class"],
      });
    }
    people.set(key, p);
  }
  return p;
}

async function current(): Promise<Person | null> {
  const email = (await cookies()).get(COOKIE)?.value;
  return email ? person(email) : null;
}

async function required(): Promise<Person> {
  const p = await current();
  if (!p) throw new ActionError("not_logged_in");
  return p;
}

function cutoff(startsAt: string) {
  return new Date(`${addDays(vnDateKey(startsAt), -1)}T20:00:00+07:00`);
}

async function makeBooking(p: Person, sessionId: string, childIds: string[], parents: number, guest = false): Promise<string> {
  const s = await demoData.session(sessionId, "en");
  if (!s) throw new ActionError("session_not_bookable");
  if (s.isFull) throw new ActionError("session_full");
  if (new Date(s.startsAt).getTime() - 3600_000 < Date.now()) throw new ActionError("too_late_to_book");
  if (p.bookings.some((b) => b.session.id === sessionId && b.status === "booked")) throw new ActionError("already_booked");
  if (guest && p.bookings.some((b) => b.unpaid && b.status === "booked" && new Date(b.session.endsAt) > new Date())) {
    throw new ActionError("guest_unpaid_limit");
  }
  const children = childIds.length;
  if (children > 2) throw new ActionError("too_many_children");
  if (s.kind === "open_play" && children < 1) throw new ActionError("open_play_needs_a_child");
  const needed = s.kind === "open_play" ? children : 1;
  const pack = p.packs.find((k) => k.sessionTypeIds.includes(s.sessionTypeId) && k.remaining >= needed && vnDateKey(s.startsAt) <= k.lastDay);
  if (pack) {
    pack.remaining -= needed;
    pack.reserved += needed;
  }
  const id = randomUUID();
  p.bookings.unshift({
    id,
    status: "booked",
    session: { id: s.id, title: s.title, kind: s.kind, startsAt: s.startsAt, endsAt: s.endsAt, sessionTypeId: s.sessionTypeId },
    parents,
    children,
    childNames: (p.me?.children ?? []).filter((c) => childIds.includes(c.id)).map((c) => c.name),
    credits: pack ? needed : 0,
    packName: pack?.name ?? null,
    unpaid: !pack,
    amountDueVnd: pack ? 0 : (s.priceVnd ?? 0) * (s.kind === "open_play" ? children : 1),
    freeTrial: false,
  });
  return id;
}

export const demoAccount: Account = {
  async user() {
    const p = await current();
    return p ? { id: p.id, email: p.email } : null;
  },
  async sendCode() {},
  async verifyCode(email, code) {
    if (code !== DEMO_CODE) throw new ActionError("wrong_code");
    person(email);
    (await cookies()).set(COOKIE, email.toLowerCase(), { path: "/", httpOnly: true, sameSite: "lax" });
  },
  async signOut() {
    (await cookies()).delete(COOKIE);
  },
  async me() {
    return (await current())?.me ?? null;
  },
  async saveDetails(d) {
    const p = await required();
    p.me = { customerId: p.id, fullName: d.fullName, phone: d.phone, email: p.email, preferredContact: d.preferredContact, children: p.me?.children ?? [] };
  },
  async addChild(name, birthMonth) {
    const p = await required();
    if (!p.me) throw new ActionError("not_logged_in");
    const id = randomUUID();
    p.me.children.push({ id, name, birthMonth });
    return id;
  },
  async myPacks() {
    return (await current())?.packs ?? [];
  },
  async myBookings() {
    return (await current())?.bookings ?? [];
  },
  async book(sessionId, childIds, parents) {
    return makeBooking(await required(), sessionId, childIds, parents);
  },
  async cancel(bookingId) {
    const p = await required();
    const b = p.bookings.find((x) => x.id === bookingId);
    if (!b) throw new ActionError("booking_not_found");
    if (b.status !== "booked") throw new ActionError("booking_not_active");
    if (Date.now() >= cutoff(b.session.startsAt).getTime()) throw new ActionError("cutoff_passed");
    b.status = "cancelled";
    const pack = p.packs.find((k) => k.name === b.packName);
    if (pack && b.credits) {
      pack.remaining += b.credits;
      pack.reserved -= b.credits;
    }
    return "cancelled";
  },
  async guestBook(d) {
    const p = person(d.email);
    if (!p.me) p.me = { customerId: p.id, fullName: d.fullName, phone: d.phone, email: p.email, preferredContact: d.preferredContact, children: [] };
    const ids = d.children.map((c) => {
      const id = randomUUID();
      p.me!.children.push({ id, name: c.name, birthMonth: c.birthMonth });
      return id;
    });
    return makeBooking(p, d.sessionId, ids, 1, true);
  },
  async packsOnSale() {
    return [
      { id: "demo-10", name: "10-class pack", credits: 10, priceVnd: 4000000, validityMonths: 3, validityDays: null, isIntro: false },
      { id: "demo-20", name: "20-class pack", credits: 20, priceVnd: 7200000, validityMonths: 7, validityDays: null, isIntro: false },
    ];
  },
};
