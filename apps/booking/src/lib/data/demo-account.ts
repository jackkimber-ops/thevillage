import "server-only";
// DEMO ACCOUNTS for local development and automated tests only (see demo-store.ts).
// The login code is always 123456. An email containing "+pack" starts with a 10-class pack.
// manager@village.test and instructor@village.test log in to the staff app.
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { book, cancel, customerByEmail, kindOf, packTypes, staff, store, type DemoCustomer } from "./demo-store";
import { ActionError, type Account, type Me, type MyBooking } from "./types";

const COOKIE = "demo_user";
const DEMO_CODE = "123456";

export async function demoEmail(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

async function current(): Promise<DemoCustomer | null> {
  const email = await demoEmail();
  return email && !staff[email] ? customerByEmail(email) ?? null : null;
}

async function required(): Promise<DemoCustomer> {
  const c = await current();
  if (!c || !c.fullName) throw new ActionError("not_logged_in");
  return c;
}

function toMe(c: DemoCustomer): Me | null {
  return c.fullName ? { customerId: c.id, fullName: c.fullName, phone: c.phone, email: c.email, preferredContact: c.preferredContact, children: c.children } : null;
}

export const demoAccount: Account = {
  async user() {
    const email = await demoEmail();
    if (!email) return null;
    return { id: staff[email]?.userId ?? customerByEmail(email)!.id, email };
  },
  async sendCode() {},
  async verifyCode(email, code) {
    if (code !== DEMO_CODE) throw new ActionError("wrong_code");
    (await cookies()).set(COOKIE, email.toLowerCase(), { path: "/", httpOnly: true, sameSite: "lax" });
  },
  async signOut() {
    (await cookies()).delete(COOKIE);
  },
  async me() {
    const c = await current();
    return c ? toMe(c) : null;
  },
  async saveDetails(d) {
    const c = await current();
    if (!c) throw new ActionError("not_logged_in");
    Object.assign(c, { fullName: d.fullName, phone: d.phone, preferredContact: d.preferredContact });
  },
  async addChild(name, birthMonth) {
    const c = await required();
    const id = randomUUID();
    c.children.push({ id, name, birthMonth });
    return id;
  },
  async myPacks() {
    return (await current())?.packs ?? [];
  },
  async myBookings() {
    const c = await current();
    if (!c) return [];
    return store.bookings.filter((b) => b.customerId === c.id).map((b): MyBooking => {
      const s = store.sessions.find((x) => x.id === b.sessionId)!;
      return {
        id: b.id,
        status: b.status,
        session: { id: s.id, title: s.title, kind: kindOf(s), startsAt: s.startsAt, endsAt: s.endsAt, sessionTypeId: s.sessionTypeId },
        parents: b.parents,
        children: b.childIds.length + b.unnamedChildren,
        childNames: c.children.filter((k) => b.childIds.includes(k.id)).map((k) => k.name),
        credits: b.credits,
        packName: c.packs.find((p) => p.id === b.packId)?.name ?? null,
        unpaid: b.unpaid && !b.paid,
        amountDueVnd: b.amountDueVnd,
        freeTrial: b.freeTrial,
      };
    }).reverse();
  },
  async book(sessionId, childIds, parents) {
    return book({ sessionId, customer: await required(), childIds, parents, source: "online" });
  },
  async cancel(bookingId) {
    const c = await required();
    if (!store.bookings.some((b) => b.id === bookingId && b.customerId === c.id)) throw new ActionError("booking_not_found");
    return cancel(bookingId, false);
  },
  async guestBook(d) {
    const c = customerByEmail(d.email)!;
    if (!c.fullName) Object.assign(c, { fullName: d.fullName, phone: d.phone, preferredContact: d.preferredContact });
    const ids = d.children.map((k) => {
      const id = randomUUID();
      c.children.push({ id, name: k.name, birthMonth: k.birthMonth });
      return id;
    });
    return book({ sessionId: d.sessionId, customer: c, childIds: ids, parents: 1, source: "guest" });
  },
  async packsOnSale() {
    return packTypes.filter((p) => p.onSale).map((p) => ({ id: p.id, name: p.name, credits: p.credits, priceVnd: p.priceVnd, validityMonths: p.validityMonths, validityDays: p.validityDays, isIntro: p.isIntro }));
  },
};
