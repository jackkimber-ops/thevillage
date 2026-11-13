import "server-only";
// DEMO STAFF APP data for local development and automated tests only (see demo-store.ts).
import { randomUUID } from "node:crypto";
import { vnDateKey } from "@/lib/time";
import { demoEmail } from "./demo-account";
import {
  addPack, book, cancel, demoClosures, demoContactLog, instructorName, kindOf, packTypes, sessionTypes, settings, staff, store, taken, type DemoSession,
} from "./demo-store";
import { ActionError } from "./types";
import type { EditableSettings, MoneyRow, StaffApi, StaffMember, StaffSession } from "./staff-types";

const demoInactive = new Set<string>();

async function me(): Promise<StaffMember | null> {
  const email = await demoEmail();
  const m = email ? staff[email] ?? null : null;
  return m && !demoInactive.has(m.userId) ? m : null;
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

const demoExtensions: Record<string, Array<{ at: string; from: string; to: string; reason: string; by: string | null }>> = {};
const demoHirePrices: Record<string, number> = {};
/** Credits left on a demo customer's packs that haven't ended. */
function demoCredits(c: { packs: Array<{ lastDay: string; remaining: number }> }, today = vnDateKey(new Date())) {
  return c.packs.filter((p) => p.lastDay >= today).reduce((n, p) => n + p.remaining, 0);
}
const demoPayments: Record<string, Array<{ amountVnd: number; method: "qr" | "transfer" | "cash"; note: string | null; recordedAt: string }>> = {};

const demoLastSignIn: Record<string, string | null> = {};
// Shared through globalThis like the demo store: the spreadsheet download runs in its own module copy.
const demoMoney: MoneyRow[] = ((globalThis as { __villageDemoMoney?: MoneyRow[] }).__villageDemoMoney ??= []);
function logMoney(by: StaffMember, p: Omit<MoneyRow, "id" | "day" | "recordedAt" | "recordedBy">) {
  const now = new Date();
  demoMoney.push({ ...p, id: randomUUID(), day: vnDateKey(now), recordedAt: now.toISOString(), recordedBy: by.name });
}
const demoRules = { alertEmail: null as string | null, bookingWindow: { n: 1, unit: "months" } as EditableSettings["bookingWindow"], latestBookingMinutes: 60 };

export const demoStaff: StaffApi = {
  me,
  async closures() {
    await requireStaff();
    return demoClosures.filter((c) => c.endsOn >= vnDateKey(new Date())).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  },
  async addClosure(c) {
    await requireManager();
    if (!c.reason.trim()) throw new ActionError("reason_required");
    if (c.endsOn < c.startsOn) throw new ActionError("invalid_dates");
    if (c.startsOn < vnDateKey(new Date())) throw new ActionError("closure_in_past");
    if (demoClosures.some((x) => x.startsOn <= c.endsOn && x.endsOn >= c.startsOn)) throw new ActionError("closure_overlaps");
    let sessions = 0;
    let bookings = 0;
    for (const s of store.sessions.filter((x) => x.status === "scheduled" && vnDateKey(x.startsAt) >= c.startsOn && vnDateKey(x.startsAt) <= c.endsOn)) {
      bookings += await demoStaff.cancelSession(s.id, `Studio closed: ${c.reason}`);
      sessions++;
    }
    demoClosures.push({ id: randomUUID(), startsOn: c.startsOn, endsOn: c.endsOn, reason: c.reason.trim() });
    return { sessions, bookings, packs: 0 };
  },
  async removeClosure(id) {
    await requireManager();
    const i = demoClosures.findIndex((x) => x.id === id);
    if (i < 0) throw new ActionError("closure_not_found");
    demoClosures.splice(i, 1);
  },
  async moneyReport(from, to) {
    await requireManager();
    return demoMoney.filter((m) => m.day >= from && m.day <= to);
  },
  async editableSettings() {
    await requireManager();
    const { bookingWindowDays: _days, ...rest } = settings;
    void _days;
    return { ...rest, ...demoRules };
  },
  async saveSettings(s) {
    await requireManager();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.contactEmail)) throw new ActionError("invalid_email");
    for (const link of [s.whatsappUrl, s.zaloUrl, s.messengerUrl, s.facebookUrl, s.instagramUrl, s.mapsUrl]) {
      if (link && !/^https:\/\/\S+$/.test(link)) throw new ActionError("invalid_link");
    }
    const { alertEmail, bookingWindow, latestBookingMinutes, ...shown } = s;
    Object.assign(settings, shown, { bookingWindowDays: bookingWindow.unit === "months" ? bookingWindow.n * 31 : bookingWindow.n });
    Object.assign(demoRules, { alertEmail, bookingWindow, latestBookingMinutes });
  },
  async staffList() {
    await requireManager();
    return Object.entries(staff).map(([email, m]) => ({ userId: m.userId, email, name: m.name, role: m.role, access: m.access, active: !demoInactive.has(m.userId), lastSignInAt: demoLastSignIn[m.userId] ?? null }));
  },
  async saveStaff(s) {
    const mine = await requireManager();
    const email = s.email.toLowerCase();
    const existing = s.userId ? Object.entries(staff).find(([, m]) => m.userId === s.userId) : Object.entries(staff).find(([e]) => e === email);
    const userId = existing?.[1].userId ?? `demo-${randomUUID()}`;
    if (userId === mine.userId && (!s.active || s.role !== "manager")) throw new ActionError("not_yourself");
    if (!s.name.trim()) throw new ActionError("name_required");
    staff[existing?.[0] ?? email] = { userId, role: s.role, name: s.name.trim(), access: s.access };
    if (s.active) demoInactive.delete(userId); else demoInactive.add(userId);
  },
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
    const today = vnDateKey(new Date());
    return store.bookings
      .filter((b) => b.status === "booked" && (!b.contacted || vnDateKey(b.contacted.at) === today) && (b.firstBooking || (b.unpaid && !b.paid)))
      .map((b) => {
        const s = store.sessions.find((x) => x.id === b.sessionId)!;
        const c = store.customers.get(b.customerId)!;
        const tries = demoContactLog.filter((l) => l.bookingId === b.id && l.outcome === "no_answer");
        const last = tries.at(-1);
        return {
          bookingId: b.id, customerId: c.id, fullName: c.fullName ?? "", phone: c.phone, preferredContact: c.preferredContact,
          firstBooking: b.firstBooking, unpaid: b.unpaid && !b.paid, amountDueVnd: b.amountDueVnd, source: b.source,
          freeTrial: b.freeTrial, children: b.childIds.length + b.unnamedChildren, sessionId: s.id, title: s.title, startsAt: s.startsAt,
          contactedAt: b.contacted?.at ?? null, contactedBy: b.contacted?.by ?? null, contactedWay: b.contacted?.way ?? null,
          tries: tries.length, lastTry: last ? { at: last.at, by: last.staffName, way: last.way! } : null,
        };
      })
      .filter((x) => new Date(x.startsAt) > new Date())
      .sort((a, b) => Number(a.contactedAt !== null) - Number(b.contactedAt !== null) || a.startsAt.localeCompare(b.startsAt));
  },
  async logContact(id, way, outcome) {
    const m = await requireStaff();
    const b = store.bookings.find((x) => x.id === id);
    if (!b) throw new ActionError("booking_not_found");
    const at = new Date().toISOString();
    if (outcome === "contacted") {
      if (b.contacted) throw new ActionError("already_contacted");
      b.contacted = { at, by: m.name, way };
    }
    demoContactLog.push({ bookingId: id, customerId: b.customerId, at, outcome, way, staffName: m.name });
  },
  async undoContact(id) {
    const m = await requireStaff();
    const b = store.bookings.find((x) => x.id === id);
    if (!b) throw new ActionError("booking_not_found");
    if (!b.contacted) return;
    b.contacted = null;
    demoContactLog.push({ bookingId: id, customerId: b.customerId, at: new Date().toISOString(), outcome: "undone", way: null, staffName: m.name });
  },
  async contactHistory(customerId) {
    await requireStaff();
    return demoContactLog
      .filter((l) => l.customerId === customerId)
      .map((l) => {
        const b = store.bookings.find((x) => x.id === l.bookingId);
        const s = store.sessions.find((x) => x.id === b?.sessionId);
        return { at: l.at, outcome: l.outcome, way: l.way, staffName: l.staffName, title: s?.title ?? "", startsAt: s?.startsAt ?? l.at };
      })
      .reverse();
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
  async extendPack(id, newLastDay, reason) {
    await requireManager();
    if (!reason.trim()) throw new ActionError("reason_required");
    const p = [...store.customers.values()].flatMap((c) => c.packs).find((x) => x.id === id);
    if (!p) throw new ActionError("pack_not_found");
    if (newLastDay <= p.lastDay) throw new ActionError("must_extend");
    (demoExtensions[id] ??= []).push({ at: new Date().toISOString(), from: p.lastDay, to: newLastDay, reason, by: (await requireManager()).name });
    p.lastDay = newLastDay;
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
      .filter((c) => {
        const digits = query.replace(/\D/g, "");
        const vn = digits.startsWith("0") ? `+84${digits.slice(1)}` : null; // 0917… is +84917…
        const phone = c.phone ?? "";
        return c.fullName && (c.fullName.toLowerCase().includes(query) || c.email?.includes(query)
          || (digits.length >= 3 && (phone.includes(digits) || (vn !== null && phone.startsWith(vn)))));
      })
      .slice(0, 20)
      .map((c) => ({ customerId: c.id, fullName: c.fullName!, phone: c.phone, email: c.email, deactivated: Boolean(c.deactivated), creditsLeft: demoCredits(c) }));
  },
  async listCustomers(limit, offset) {
    await requireStaff();
    const today = vnDateKey(new Date());
    const all = [...store.customers.values()].filter((c) => c.fullName)
      .sort((a, b) => Number(Boolean(a.deactivated)) - Number(Boolean(b.deactivated)) || a.fullName!.toLowerCase().localeCompare(b.fullName!.toLowerCase()));
    return {
      total: all.length,
      rows: all.slice(offset, offset + limit).map((c) => ({
        customerId: c.id, fullName: c.fullName!, phone: c.phone, email: c.email, deactivated: Boolean(c.deactivated), createdAt: c.createdAt,
        creditsLeft: demoCredits(c, today),
      })),
    };
  },
  async customer(id) {
    await requireStaff();
    const c = store.customers.get(id);
    if (!c || !c.fullName) return null;
    const packName = (pid: string | null) => c.packs.find((p) => p.id === pid)?.name ?? null;
    return {
      customerId: c.id, fullName: c.fullName, phone: c.phone, email: c.email, preferredContact: c.preferredContact,
      language: c.language ?? "en", deactivated: Boolean(c.deactivated), needsReview: false, createdAt: c.createdAt, children: c.children,
      packs: c.packs.map((p) => ({ id: p.id, name: p.name, credits: p.credits, remaining: p.remaining, validFrom: p.validFrom, lastDay: p.lastDay, extensions: demoExtensions[p.id] ?? [] })),
      bookings: store.bookings.filter((b) => b.customerId === id).map((b) => {
        const s = store.sessions.find((x) => x.id === b.sessionId)!;
        return { id: b.id, sessionId: s.id, title: s.title, startsAt: s.startsAt, status: b.status, unpaid: b.unpaid, paid: b.paid,
          amountDueVnd: b.amountDueVnd, credits: b.credits, packId: b.packId, packName: packName(b.packId), freeTrial: b.freeTrial,
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
      source: "staff", freeTrial: d.freeTrial, override: d.override, late: d.override && m.role === "manager" });
  },
  async sellPack(d) {
    const by = await requireManager();
    const c = store.customers.get(d.customerId);
    const t = packTypes.find((p) => p.id === d.packTypeId);
    if (!c || !t) throw new ActionError("pack_not_on_sale");
    if (t.isIntro && c.packs.length > 0) throw new ActionError("intro_pack_new_customers_only");
    const today = vnDateKey(new Date());
    const paid = d.countPaidDropIns ? (await this.paidDropInsToday(c.id)).filter((x) => t.coversSessionTypeIds.includes(x.sessionTypeId)) : [];
    const less = paid.reduce((n, x) => n + x.amountVnd, 0);
    const id = addPack(c, t, d.validFrom ?? today);
    logMoney(by, { amountVnd: Math.max(t.priceVnd - less, 0), method: d.method, paidFor: "pack", customerName: c.fullName, note: less ? "Less drop-in paid today" : null, what: t.name });
    const pack = c.packs.find((p) => p.id === id)!;
    for (const x of paid) {
      Object.assign(store.bookings.find((b) => b.id === x.bookingId)!, { unpaid: false, amountDueVnd: 0, packId: id, credits: 1 });
      pack.remaining -= 1;
      pack.reserved += 1;
    }
    // Switch unpaid bookings onto the new pack: upcoming ones, and today's even after the class (change #40).
    for (const b of store.bookings.filter((x) => x.customerId === c.id && x.unpaid && !x.paid && !x.packId)) {
      const s = store.sessions.find((x) => x.id === b.sessionId)!;
      if (!(b.status === "booked" || (b.status === "attended" && vnDateKey(s.startsAt) === today))) continue;
      const needed = kindOf(s) === "open_play" ? b.childIds.length + b.unnamedChildren : 1;
      if (!pack.sessionTypeIds.includes(s.sessionTypeId) || pack.remaining < needed || vnDateKey(s.startsAt) > pack.lastDay) continue;
      Object.assign(b, { unpaid: false, amountDueVnd: 0, packId: id, credits: needed });
      pack.remaining -= needed;
      pack.reserved += needed;
    }
    return id;
  },
  async paidDropInsToday(customerId) {
    await requireManager();
    const today = vnDateKey(new Date());
    return store.bookings
      .filter((b) => b.customerId === customerId && b.paid && !b.packId && (b.status === "booked" || b.status === "attended"))
      .map((b) => ({ b, s: store.sessions.find((x) => x.id === b.sessionId)! }))
      .filter(({ s }) => vnDateKey(s.startsAt) === today && kindOf(s) === "class")
      .map(({ b, s }) => ({ bookingId: b.id, title: s.title, startsAt: s.startsAt, sessionTypeId: s.sessionTypeId, amountVnd: b.amountDueVnd }));
  },
  async recordPayment(d) {
    const by = await requireManager();
    const b = d.bookingId ? store.bookings.find((x) => x.id === d.bookingId) : undefined;
    const s = store.sessions.find((x) => x.id === (d.sessionId ?? b?.sessionId));
    logMoney(by, { amountVnd: d.amountVnd, method: d.method, paidFor: d.paidFor, customerName: d.customerId ? store.customers.get(d.customerId)?.fullName ?? null : null, note: d.note, what: s?.title ?? null });
    if (b) b.paid = true;
    if (d.sessionId) (demoPayments[d.sessionId] ??= []).push({ amountVnd: d.amountVnd, method: d.method, note: d.note, recordedAt: new Date().toISOString() });
  },
  async hirePayments(sessionId) {
    await requireManager();
    return { agreedVnd: demoHirePrices[sessionId] ?? null, payments: demoPayments[sessionId] ?? [] };
  },
  async setHirePrice(sessionId, priceVnd) {
    await requireManager();
    if (priceVnd !== null && priceVnd <= 0) throw new ActionError("invalid_amount");
    if (priceVnd === null) delete demoHirePrices[sessionId];
    else demoHirePrices[sessionId] = priceVnd;
  },
  async updateCustomer(id, d) {
    await requireStaff();
    const c = store.customers.get(id);
    if (!c) throw new ActionError("customer_not_found");
    const others = [...store.customers.values()].filter((x) => x.id !== id);
    if (others.some((x) => x.phone === d.phone)) throw new ActionError("phone_exists");
    if (d.email && others.some((x) => x.email === d.email)) throw new ActionError("email_exists");
    Object.assign(c, { fullName: d.fullName, phone: d.phone, email: d.email, preferredContact: d.preferredContact, language: d.language });
  },
  async setCustomerActive(id, active) {
    await requireManager();
    const c = store.customers.get(id);
    if (!c) throw new ActionError("customer_not_found");
    c.deactivated = !active;
  },
  async saveChild(customerId, childId, name, birthMonth) {
    await requireStaff();
    const c = store.customers.get(customerId);
    if (!c) throw new ActionError("customer_not_found");
    const month = birthMonth ? `${birthMonth.slice(0, 7)}-01` : null;
    const k = childId ? c.children.find((x) => x.id === childId) : undefined;
    if (childId && !k) throw new ActionError("child_not_found");
    if (k) Object.assign(k, { name, birthMonth: month });
    else c.children.push({ id: randomUUID(), name, birthMonth: month });
  },
  async removeChild(childId) {
    await requireStaff();
    for (const c of store.customers.values()) c.children = c.children.filter((k) => k.id !== childId);
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
