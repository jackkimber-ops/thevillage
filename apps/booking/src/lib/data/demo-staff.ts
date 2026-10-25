import "server-only";
// DEMO STAFF APP data for local development and automated tests only (see demo-store.ts).
import { randomUUID } from "node:crypto";
import { vnDateKey } from "@/lib/time";
import { demoEmail } from "./demo-account";
import {
  addPack, book, cancel, instructorName, kindOf, packTypes, sessionTypes, staff, store, taken, type DemoSession,
} from "./demo-store";
import { ActionError } from "./types";
import type { StaffApi, StaffMember, StaffSession } from "./staff-types";

async function me(): Promise<StaffMember | null> {
  const email = await demoEmail();
  return email ? staff[email] ?? null : null;
}

async function requireStaff() {
  const m = await me();
  if (!m) throw new ActionError("staff_only");
  return m;
}

async function requireManager() {
  const m = await requireStaff();
  if (m.role !== "manager") throw new ActionError("managers_only");
  return m;
}

function view(s: DemoSession): StaffSession {
  return {
    id: s.id, sessionTypeId: s.sessionTypeId, kind: kindOf(s), title: s.title, startsAt: s.startsAt, endsAt: s.endsAt,
    status: s.status, instructorId: s.instructorId, instructorName: instructorName(s.instructorId), capacity: s.capacity,
    taken: taken(s), unpaid: store.bookings.filter((b) => b.sessionId === s.id && b.status === "booked" && b.unpaid && !b.paid).length,
    hireCustomer: null, notes: s.notes,
  };
}

function overlaps(start: Date, end: Date, ignore?: string) {
  return store.sessions.find((s) => s.status !== "cancelled" && s.id !== ignore && new Date(s.startsAt) < end && new Date(s.endsAt) > start);
}

export const demoStaff: StaffApi = {
  me,
  async instructors() {
    return [{ userId: "demo-phuong", name: "Phuong" }, { userId: "demo-mai", name: "Mai" }, { userId: "demo-anna", name: "Anna" }];
  },
  async sessionTypes() {
    return sessionTypes;
  },
  async packTypes() {
    return packTypes;
  },
  async timetable(from, to) {
    await requireStaff();
    return store.sessions
      .filter((s) => s.status !== "cancelled" && new Date(s.startsAt) >= from && new Date(s.startsAt) < to)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(view);
  },
  async session(id) {
    await requireStaff();
    const s = store.sessions.find((x) => x.id === id);
    return s ? view(s) : null;
  },
  async roster(sessionId) {
    await requireStaff();
    return store.bookings.filter((b) => b.sessionId === sessionId && b.status !== "cancelled").map((b) => {
      const c = store.customers.get(b.customerId)!;
      return {
        bookingId: b.id, customerId: c.id, fullName: c.fullName ?? c.email ?? "", phone: c.phone,
        childNames: c.children.filter((k) => b.childIds.includes(k.id)).map((k) => k.name),
        children: b.childIds.length + b.unnamedChildren, parents: b.parents, status: b.status, unpaid: b.unpaid,
        paid: b.paid, amountDueVnd: b.amountDueVnd, credits: b.credits,
        packName: c.packs.find((p) => p.id === b.packId)?.name ?? null, freeTrial: b.freeTrial, firstBooking: b.firstBooking,
      };
    });
  },
  async contactList() {
    await requireStaff();
    return store.bookings
      .filter((b) => b.status === "booked" && !b.contacted && (b.firstBooking || (b.unpaid && !b.paid)))
      .map((b) => {
        const s = store.sessions.find((x) => x.id === b.sessionId)!;
        const c = store.customers.get(b.customerId)!;
        return {
          bookingId: b.id, customerId: c.id, fullName: c.fullName ?? "", phone: c.phone, preferredContact: c.preferredContact,
          firstBooking: b.firstBooking, unpaid: b.unpaid && !b.paid, amountDueVnd: b.amountDueVnd, source: b.source,
          freeTrial: b.freeTrial, children: b.childIds.length + b.unnamedChildren, sessionId: s.id, title: s.title, startsAt: s.startsAt,
        };
      })
      .filter((x) => new Date(x.startsAt) > new Date())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },
  async markContacted(id) {
    await requireStaff();
    const b = store.bookings.find((x) => x.id === id);
    if (b) b.contacted = true;
  },
  async markAttendance(id, status) {
    await requireStaff();
    const b = store.bookings.find((x) => x.id === id);
    if (!b) throw new ActionError("booking_not_found");
    b.status = status;
  },
  async cancelBooking(id, reason) {
    await requireStaff();
    return cancel(id, true, reason ?? "Cancelled by staff");
  },
  async restoreCredit(id) {
    await requireManager();
    const b = store.bookings.find((x) => x.id === id);
    const c = b && store.customers.get(b.customerId);
    const p = c?.packs.find((x) => x.id === b!.packId);
    if (!b || !p || !["late_cancelled", "no_show"].includes(b.status)) throw new ActionError("nothing_to_restore");
    p.remaining += b.credits;
    p.used -= b.credits;
  },
  async createSessions(n) {
    const m = await requireStaff();
    if (m.role !== "manager" && n.instructorId !== m.userId) throw new ActionError("not_allowed");
    const made: DemoSession[] = [];
    let start = new Date(n.startsAt);
    for (;;) {
      const end = new Date(start.getTime() + n.minutes * 60000);
      if (overlaps(start, end) || made.some((s) => new Date(s.startsAt) < end && new Date(s.endsAt) > start)) {
        throw new ActionError(`overlap:${vnDateKey(start)}`);
      }
      made.push({ id: `demo-new-${randomUUID()}`, sessionTypeId: n.sessionTypeId, title: n.title, startsAt: start.toISOString(), endsAt: end.toISOString(),
        instructorId: n.instructorId, capacity: n.capacity, baseTaken: 0, status: "scheduled", notes: n.notes });
      start = new Date(start.getTime() + 7 * 86400000);
      if (!n.repeatUntil || vnDateKey(start) > n.repeatUntil) break;
    }
    store.sessions.push(...made);
    return made.map((s) => s.id);
  },
  async updateSession(id, u) {
    const m = await requireStaff();
    const s = store.sessions.find((x) => x.id === id);
    if (!s) throw new ActionError("session_not_found");
    if (m.role !== "manager" && (s.instructorId !== m.userId || u.instructorId !== m.userId)) throw new ActionError("not_allowed");
    const start = new Date(u.startsAt);
    const end = new Date(start.getTime() + u.minutes * 60000);
    if (overlaps(start, end, id)) throw new ActionError("overlap");
    if (u.capacity !== null && u.capacity < taken(s)) throw new ActionError("capacity_below_booked");
    Object.assign(s, { title: u.title, startsAt: start.toISOString(), endsAt: end.toISOString(), capacity: u.capacity, instructorId: u.instructorId, notes: u.notes });
  },
  async cancelSession(id, reason) {
    await requireManager();
    const s = store.sessions.find((x) => x.id === id);
    if (!s) throw new ActionError("session_not_found");
    const live = store.bookings.filter((b) => b.sessionId === id && b.status === "booked");
    for (const b of live) {
      const c = store.customers.get(b.customerId)!;
      const p = c.packs.find((x) => x.id === b.packId);
      if (p) { p.remaining += b.credits; p.reserved -= b.credits; }
      b.status = "cancelled";
    }
    s.status = "cancelled";
    void reason;
    return live.length;
  },
  async searchCustomers(q) {
    await requireStaff();
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    return [...store.customers.values()]
      .filter((c) => c.fullName && (c.fullName.toLowerCase().includes(query) || c.email?.includes(query) || (c.phone ?? "").includes(query.replace(/\D/g, "") || "~")))
      .slice(0, 20)
      .map((c) => ({ customerId: c.id, fullName: c.fullName!, phone: c.phone, email: c.email }));
  },
  async customer(id) {
    await requireStaff();
    const c = store.customers.get(id);
    if (!c || !c.fullName) return null;
    const packName = (pid: string | null) => c.packs.find((p) => p.id === pid)?.name ?? null;
    return {
      customerId: c.id, fullName: c.fullName, phone: c.phone, email: c.email, preferredContact: c.preferredContact,
      needsReview: false, createdAt: c.createdAt, children: c.children,
      packs: c.packs.map((p) => ({ id: p.id, name: p.name, credits: p.credits, remaining: p.remaining, validFrom: p.validFrom, lastDay: p.lastDay })),
      bookings: store.bookings.filter((b) => b.customerId === id).map((b) => {
        const s = store.sessions.find((x) => x.id === b.sessionId)!;
        return { id: b.id, sessionId: s.id, title: s.title, startsAt: s.startsAt, status: b.status, unpaid: b.unpaid, paid: b.paid,
          amountDueVnd: b.amountDueVnd, credits: b.credits, packName: packName(b.packId), freeTrial: b.freeTrial,
          childNames: c.children.filter((k) => b.childIds.includes(k.id)).map((k) => k.name) };
      }).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
      ledger: c.ledger.map((l) => ({ at: l.at, kind: l.kind, amount: l.amount, reason: l.reason, packName: packName(l.packId) ?? "" })).reverse(),
      hadFreeTrial: store.bookings.some((b) => b.customerId === id && b.freeTrial && b.status !== "cancelled"),
    };
  },
  async addCustomer(d) {
    await requireStaff();
    const all = [...store.customers.values()];
    if (all.some((c) => c.phone === d.phone)) throw new ActionError("phone_exists");
    if (d.email && all.some((c) => c.email === d.email)) throw new ActionError("email_exists");
    const id = randomUUID();
    store.customers.set(id, {
      id, email: d.email, fullName: d.fullName, phone: d.phone, preferredContact: d.preferredContact,
      children: d.children.map((k) => ({ id: randomUUID(), name: k.name, birthMonth: k.birthMonth })), packs: [], ledger: [],
      createdAt: new Date().toISOString(),
    });
    return id;
  },
  async bookCustomer(d) {
    const m = await requireStaff();
    if (d.freeTrial && m.role !== "manager") throw new ActionError("managers_only");
    const c = store.customers.get(d.customerId);
    if (!c) throw new ActionError("customer_not_found");
    return book({ sessionId: d.sessionId, customer: c, childIds: d.childIds, unnamedChildren: d.unnamedChildren, parents: d.parents,
      source: "staff", freeTrial: d.freeTrial, override: d.override });
  },
  async sellPack(d) {
    await requireManager();
    const c = store.customers.get(d.customerId);
    const t = packTypes.find((p) => p.id === d.packTypeId);
    if (!c || !t) throw new ActionError("pack_not_on_sale");
    if (t.isIntro && c.packs.length > 0) throw new ActionError("intro_pack_new_customers_only");
    const id = addPack(c, t, d.validFrom ?? vnDateKey(new Date()));
    // Switch upcoming unpaid bookings onto the new pack.
    const pack = c.packs.find((p) => p.id === id)!;
    for (const b of store.bookings.filter((x) => x.customerId === c.id && x.status === "booked" && x.unpaid && !x.paid)) {
      const s = store.sessions.find((x) => x.id === b.sessionId)!;
      const needed = kindOf(s) === "open_play" ? b.childIds.length + b.unnamedChildren : 1;
      if (!pack.sessionTypeIds.includes(s.sessionTypeId) || pack.remaining < needed || vnDateKey(s.startsAt) > pack.lastDay) continue;
      Object.assign(b, { unpaid: false, amountDueVnd: 0, packId: id, credits: needed });
      pack.remaining -= needed;
      pack.reserved += needed;
    }
    return id;
  },
  async recordPayment(d) {
    await requireManager();
    const b = d.bookingId ? store.bookings.find((x) => x.id === d.bookingId) : undefined;
    if (b) b.paid = true;
  },
  async savePackType(p) {
    await requireManager();
    if (p.id) Object.assign(packTypes.find((x) => x.id === p.id)!, p);
    else packTypes.push({ ...p, id: `demo-pack-${randomUUID()}` });
  },
  async saveSessionType(t) {
    await requireManager();
    if (t.id) Object.assign(sessionTypes.find((x) => x.id === t.id)!, t);
    else sessionTypes.push({ ...t, id: `demo-type-${randomUUID()}` });
  },
};
