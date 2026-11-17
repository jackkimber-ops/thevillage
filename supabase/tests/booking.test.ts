// Core rules 1, 3 and 4: credit reservation, safe booking and the booking rules.
import { describe, expect, it } from "vitest";
import { connect, Ctx, inTx, PACKS, TYPES, type Who } from "./db";

describe("booking with a pack", () => {
  it("reserves one credit straight away and writes a reserve row", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId);
      expect(await db.balance(pack)).toBe(10);

      const session = await db.session();
      const id = await db.book(c.user!, session);

      const b = await db.booking(id);
      expect(b).toMatchObject({ status: "booked", source: "online", customer_pack_id: pack, credits: 1, unpaid: false });
      expect(await db.balance(pack)).toBe(9);
      const ledger = await db.su("select kind, amount from public.credit_ledger where booking_id = $1", [id]);
      expect(ledger).toEqual([{ kind: "reserve", amount: -1 }]);
    }));

  it("uses the pack that expires first among packs valid on the session date", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const later = await db.sellPack(manager, c.customerId, PACKS.twenty); // 7 months
      const sooner = await db.sellPack(manager, c.customerId, PACKS.ten);   // 3 months
      const id = await db.book(c.user!, await db.session());
      expect((await db.booking(id)).customer_pack_id).toBe(sooner);
      expect(await db.balance(later)).toBe(20);
    }));

  it("skips a pack that is valid today but expired by the session date", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId);
      // Pack ends tomorrow; the session is in 3 days.
      await db.su("update public.customer_packs set valid_to = public.vn_date(now()) + 1 where id = $1", [pack]);
      const id = await db.book(c.user!, await db.session({ startsIn: "3 days" }));
      const b = await db.booking(id);
      expect(b.customer_pack_id).toBeNull();
      expect(b.unpaid).toBe(true);
      expect(b.amount_due_vnd).toBe("450000");
      expect(await db.balance(pack)).toBe(10);
    }));

  it("counts pause days when checking validity", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId);
      await db.su("update public.customer_packs set valid_to = public.vn_date(now()) + 1, paused_days = 7 where id = $1", [pack]);
      const id = await db.book(c.user!, await db.session({ startsIn: "3 days" }));
      expect((await db.booking(id)).customer_pack_id).toBe(pack);
    }));

  it("books pay-on-the-day when there's no pack", () =>
    inTx(async (db) => {
      const c = await db.customer();
      const id = await db.book(c.user!, await db.session());
      expect(await db.booking(id)).toMatchObject({ unpaid: true, amount_due_vnd: "450000", first_booking: true });
    }));

  it("lets logged-in customers hold several unpaid bookings", () =>
    inTx(async (db) => {
      const c = await db.customer();
      await db.book(c.user!, await db.session({ startsIn: "3 days" }));
      await db.book(c.user!, await db.session({ startsIn: "4 days" }));
      const [row] = await db.su("select count(*)::int n from public.bookings where customer_id = $1 and unpaid", [c.customerId]);
      expect(row.n).toBe(2);
    }));
});

describe("capacity and duplicates", () => {
  it("refuses a full session, even for staff overriding the times", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const a = await db.customer();
      const b = await db.customer();
      const session = await db.session({ capacity: 1 });
      await db.book(a.user!, session);
      expect(await db.fails(b.user!, "select public.book_session($1)", [session])).toBe("session_full");
      expect(
        await db.fails(manager, "select public.book_session($1, $2, '{}', 0, 1, false, true)", [session, b.customerId]),
      ).toBe("session_full");
    }));

  it("allows one active booking per customer per session", () =>
    inTx(async (db) => {
      const c = await db.customer();
      const session = await db.session();
      await db.book(c.user!, session);
      expect(await db.fails(c.user!, "select public.book_session($1)", [session])).toMatch(/already_booked|bookings_one_active/);
    }));

  it("frees the place again after a cancellation", () =>
    inTx(async (db) => {
      const a = await db.customer();
      const b = await db.customer();
      const session = await db.session({ capacity: 1 });
      const id = await db.book(a.user!, session);
      await db.as(a.user!, "select public.cancel_booking($1)", [id]);
      await db.book(b.user!, session);
      await db.book(a.user!, await db.session());
    }));

  it("never overbooks when two people take the last place at the same moment", async () => {
    const setup = connect();
    await setup.connect();
    const db = new Ctx(setup);
    const a = await db.customer();
    const b = await db.customer();
    const session = await db.session({ startsIn: "20 days", capacity: 1 });
    const clients = [connect(), connect()];
    try {
      await Promise.all(clients.map((c) => c.connect()));
      const attempt = async (client: ReturnType<typeof connect>, user: { id: string; email: string }) => {
        const ctx = new Ctx(client);
        await client.query("begin");
        try {
          await ctx.as(user, "select public.book_session($1)", [session]);
          await new Promise((r) => setTimeout(r, 200)); // hold the lock while the other tries
          await client.query("commit");
          return "ok";
        } catch (e) {
          await client.query("rollback");
          return (e as Error).message;
        }
      };
      const results = await Promise.all([attempt(clients[0], a.user!), attempt(clients[1], b.user!)]);
      expect(results.sort()).toEqual(["ok", "session_full"]);
      const [row] = await db.su("select count(*)::int n from public.bookings where session_id = $1", [session]);
      expect(row.n).toBe(1);
    } finally {
      await db.su("delete from public.notifications where booking_id in (select id from public.bookings where session_id = $1)", [session]);
      await db.su("delete from public.bookings where session_id = $1", [session]);
      await db.su("delete from public.sessions where id = $1", [session]);
      await db.su("delete from public.customers where id = any($1)", [[a.customerId, b.customerId]]);
      await Promise.all(clients.map((c) => c.end()));
      await setup.end();
    }
  });
});

describe("who comes along", () => {
  it("class: one parent, up to 2 children free, 1 credit", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId);
      const k1 = await db.child(c.customerId, "Bao");
      const k2 = await db.child(c.customerId, "Mi");
      const id = await db.book(c.user!, await db.session(), { childIds: [k1, k2] });
      expect(await db.booking(id)).toMatchObject({ parents: 1, children: 2, credits: 1 });
      expect(await db.balance(pack)).toBe(9);
      expect(await db.fails(c.user!, "select public.book_session($1, null, '{}', 0, 2)", [await db.session()])).toBe("one_parent_per_booking");
    }));

  it("refuses a third child, or someone else's child", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const other = await db.customer();
      const kids = [await db.child(c.customerId, "A"), await db.child(c.customerId, "B"), await db.child(c.customerId, "C")];
      expect(await db.fails(c.user!, "select public.book_session($1, null, $2)", [await db.session(), kids])).toBe("too_many_children");
      const stranger = await db.child(other.customerId);
      expect(await db.fails(c.user!, "select public.book_session($1, null, $2)", [await db.session(), [stranger]])).toBe("child_not_found");
      expect(await db.fails(manager, "select public.book_session($1, $2, '{}', 3)", [await db.session(), c.customerId])).toBe("too_many_children");
    }));

  it("open play: 150,000 per child, parents free, at least one child, up to 2 parents", () =>
    inTx(async (db) => {
      const c = await db.customer();
      const k1 = await db.child(c.customerId, "Bao");
      const k2 = await db.child(c.customerId, "Mi");
      const s = await db.session({ type: TYPES.openPlay });
      const id = await db.book(c.user!, s, { childIds: [k1, k2], parents: 2 });
      expect(await db.booking(id)).toMatchObject({ parents: 2, children: 2, unpaid: true, amount_due_vnd: "300000" });
      expect(await db.fails(c.user!, "select public.book_session($1)", [await db.session({ type: TYPES.openPlay })])).toBe("open_play_needs_a_child");
      expect(
        await db.fails(c.user!, "select public.book_session($1, null, $2, 0, 3)", [await db.session({ type: TYPES.openPlay }), [k1]]),
      ).toBe("too_many_parents");
    }));

  it("open play capacity counts children, not parents", () =>
    inTx(async (db) => {
      const a = await db.customer();
      const b = await db.customer();
      const s = await db.session({ type: TYPES.openPlay, capacity: 3 });
      await db.book(a.user!, s, { childIds: [await db.child(a.customerId, "A1"), await db.child(a.customerId, "A2")], parents: 2 });
      const kids = [await db.child(b.customerId, "B1"), await db.child(b.customerId, "B2")];
      expect(await db.fails(b.user!, "select public.book_session($1, null, $2)", [s, kids])).toBe("session_full");
      await db.book(b.user!, s, { childIds: [kids[0]] });
    }));

  it("private hire can't be booked online", () =>
    inTx(async (db) => {
      const c = await db.customer();
      const s = await db.session({ type: TYPES.privateHire, capacity: null });
      expect(await db.fails(c.user!, "select public.book_session($1)", [s])).toBe("session_not_bookable");
    }));
});

describe("booking times", () => {
  it("customers can book up to 1 month ahead and up to 1 hour before", () =>
    inTx(async (db) => {
      const c = await db.customer();
      expect(await db.fails(c.user!, "select public.book_session($1)", [await db.session({ startsIn: "40 days" })])).toBe("too_far_ahead");
      expect(await db.fails(c.user!, "select public.book_session($1)", [await db.session({ startsIn: "20 minutes", exact: true })])).toBe("too_late_to_book");
      await db.book(c.user!, await db.session({ startsIn: "2 hours" }));
    }));

  it("staff can override both, but customers can't", () =>
    inTx(async (db) => {
      const instructor = await db.staff("instructor");
      const c = await db.customer();
      await db.book(instructor, await db.session({ startsIn: "40 days" }), { customerId: c.customerId, override: true });
      await db.book(instructor, await db.session({ startsIn: "20 minutes", exact: true }), { customerId: c.customerId, override: true });
      expect(await db.fails(c.user!, "select public.book_session($1, null, '{}', 0, 1, false, true)", [await db.session({ startsIn: "40 days" })])).toBe("not_allowed");
    }));
});

describe("free trial and intro pack", () => {
  it("a manager gives one free trial class per customer", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const instructor = await db.staff("instructor");
      const c = await db.customer();
      expect(await db.fails(instructor, "select public.book_session($1, $2, '{}', 0, 1, true)", [await db.session(), c.customerId])).toBe("managers_only");
      expect(await db.fails(c.user!, "select public.book_session($1, null, '{}', 0, 1, true)", [await db.session()])).toBe("not_allowed");
      const id = await db.book(manager, await db.session(), { customerId: c.customerId, freeTrial: true });
      expect(await db.booking(id)).toMatchObject({ free_trial: true, unpaid: false, credits: 0, source: "staff" });
      expect(await db.fails(manager, "select public.book_session($1, $2, '{}', 0, 1, true)", [await db.session(), c.customerId])).toBe("free_trial_used");
      const d = await db.customer();
      const kid = await db.child(d.customerId);
      expect(
        await db.fails(manager, "select public.book_session($1, $2, $3, 0, 1, true)", [await db.session({ type: TYPES.openPlay }), d.customerId, [kid]]),
      ).toBe("free_trial_class_only");
    }));

  it("a free trial doesn't block the intro pack later", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      await db.book(manager, await db.session(), { customerId: c.customerId, freeTrial: true });
      const intro = await db.sellPack(manager, c.customerId, PACKS.intro);
      expect(await db.balance(intro)).toBe(3);
    }));

  it("the intro pack is one per customer, for customers who haven't had a pack", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      await db.sellPack(manager, c.customerId, PACKS.intro);
      expect(await db.fails(manager, "select public.sell_pack($1, $2, 'cash')", [c.customerId, PACKS.intro])).toBe("intro_pack_new_customers_only");
      const d = await db.customer();
      await db.sellPack(manager, d.customerId, PACKS.ten);
      expect(await db.fails(manager, "select public.sell_pack($1, $2, 'cash')", [d.customerId, PACKS.intro])).toBe("intro_pack_new_customers_only");
    }));
});

describe("selling packs", () => {
  it("sets validity in calendar months (10: 3 months, 20: 7 months) and 1 month for the intro pack (change #41)", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const d = await db.customer();
      const ten = await db.sellPack(manager, c.customerId, PACKS.ten, "2026-11-14");
      const twenty = await db.sellPack(manager, c.customerId, PACKS.twenty, "2026-11-14");
      const intro = await db.sellPack(manager, d.customerId, PACKS.intro, "2026-11-14");
      const rows = await db.su(
        "select id, valid_to::text, price_paid_vnd from public.customer_packs where id = any($1)",
        [[ten, twenty, intro]],
      );
      const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
      expect(byId[ten]).toMatchObject({ valid_to: "2027-02-13", price_paid_vnd: "4000000" });
      expect(byId[twenty]).toMatchObject({ valid_to: "2027-06-13", price_paid_vnd: "7200000" });
      expect(byId[intro]).toMatchObject({ valid_to: "2026-12-13", price_paid_vnd: "750000" });
    }));

  it("records the payment and copies the price, so later price changes don't touch it", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId);
      await db.su("update public.pack_types set price_vnd = 5000000 where id = $1", [PACKS.ten]);
      const [p] = await db.su("select price_paid_vnd from public.customer_packs where id = $1", [pack]);
      expect(p.price_paid_vnd).toBe("4000000");
      const pay = await db.su("select amount_vnd, method, paid_for from public.payments where customer_pack_id = $1", [pack]);
      expect(pay).toEqual([{ amount_vnd: "4000000", method: "qr", paid_for: "pack" }]);
    }));

  it("switches upcoming unpaid bookings onto the new pack", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const b1 = await db.book(c.user!, await db.session({ startsIn: "3 days" }));
      const b2 = await db.book(c.user!, await db.session({ startsIn: "4 days" }));
      const pack = await db.sellPack(manager, c.customerId);
      for (const id of [b1, b2]) {
        expect(await db.booking(id)).toMatchObject({ unpaid: false, customer_pack_id: pack, credits: 1, amount_due_vnd: "0" });
      }
      expect(await db.balance(pack)).toBe(8);
    }));

  // Change #40 (Jack, 10 Nov): a pack bought on the day counts today's class, even after it.
  const earlierToday = `greatest((date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh')) at time zone 'Asia/Ho_Chi_Minh', now() - interval '2 hours')`;
  async function pastClass(db: Parameters<Parameters<typeof inTx>[0]>[0], customer: { user?: Who | null }, when = earlierToday) {
    const session = await db.session();
    const booking = await db.book(customer.user!, session);
    await db.su(`update public.sessions set starts_at = ${when}, ends_at = ${when} + interval '1 minute' where id = $1`, [session]);
    await db.su("select public.close_finished_sessions()");
    return booking;
  }

  it("a pack sold after class counts today's unpaid drop-in, used", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const today = await pastClass(db, c);
      expect(await db.booking(today)).toMatchObject({ status: "attended", unpaid: true, customer_pack_id: null });
      const pack = await db.sellPack(manager, c.customerId);
      expect(await db.booking(today)).toMatchObject({ unpaid: false, customer_pack_id: pack, credits: 1, amount_due_vnd: "0" });
      expect(await db.balance(pack)).toBe(9);
      const kinds = await db.su("select kind, amount from public.credit_ledger where booking_id = $1 order by id", [today]);
      expect(kinds).toEqual([{ kind: "reserve", amount: -1 }, { kind: "use", amount: 0 }]);
      const [pay] = await db.su("select amount_vnd from public.payments where customer_pack_id = $1", [pack]);
      expect(pay.amount_vnd).toBe("4000000");
    }));

  it("yesterday's drop-in is not counted", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const yesterday = await pastClass(db, c, "now() - interval '1 day 2 hours'");
      const pack = await db.sellPack(manager, c.customerId, PACKS.ten, "2020-01-01");
      expect(await db.booking(yesterday)).toMatchObject({ unpaid: true, customer_pack_id: null });
      expect(await db.balance(pack)).toBe(10);
    }));

  it("a drop-in paid today counts when ticked: the class moves onto the pack and its price comes off", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const today = await pastClass(db, c);
      await db.as(manager, "select public.record_payment($1, 450000, 'qr', 'drop_in', $2)", [c.customerId, today]);
      const offered = await db.as(manager, "select booking_id, amount_vnd from public.paid_drop_ins_today($1)", [c.customerId]);
      expect(offered).toEqual([{ booking_id: today, amount_vnd: "450000" }]);
      expect(await db.fails(c.user!, "select * from public.paid_drop_ins_today($1)", [c.customerId])).toBe("managers_only");

      // Not ticked: nothing changes, full price.
      const plain = await db.sellPack(manager, c.customerId, PACKS.twenty);
      expect(await db.booking(today)).toMatchObject({ customer_pack_id: null });
      const [p1] = await db.su("select amount_vnd from public.payments where customer_pack_id = $1", [plain]);
      expect(p1.amount_vnd).toBe("7200000");

      const [{ id: pack }] = await db.as(manager, "select public.sell_pack($1, $2, 'cash', null, null, true) as id", [c.customerId, PACKS.ten]);
      expect(await db.booking(today)).toMatchObject({ customer_pack_id: pack, credits: 1 });
      expect(await db.balance(pack)).toBe(9);
      const pays = await db.su("select amount_vnd, paid_for, note from public.payments where customer_id = $1 order by amount_vnd", [c.customerId]);
      expect(pays).toEqual([
        { amount_vnd: "450000", paid_for: "drop_in", note: null },
        { amount_vnd: "3550000", paid_for: "pack", note: expect.stringContaining("Less drop-in paid today") },
        { amount_vnd: "7200000", paid_for: "pack", note: null },
      ]);
      const [cp] = await db.su("select price_paid_vnd from public.customer_packs where id = $1", [pack]);
      expect(cp.price_paid_vnd).toBe("3550000");
      // Once counted, it isn't offered again.
      expect(await db.as(manager, "select booking_id from public.paid_drop_ins_today($1)", [c.customerId])).toEqual([]);
    }));

  it("only managers sell packs and record payments", () =>
    inTx(async (db) => {
      const instructor = await db.staff("instructor");
      const c = await db.customer();
      expect(await db.fails(instructor, "select public.sell_pack($1, $2, 'qr')", [c.customerId, PACKS.ten])).toBe("managers_only");
      expect(await db.fails(c.user!, "select public.sell_pack($1, $2, 'qr')", [c.customerId, PACKS.ten])).toBe("managers_only");
      expect(
        await db.fails(instructor, "select public.record_payment($1, 450000, 'cash', 'drop_in')", [c.customerId]),
      ).toBe("managers_only");
    }));
});

describe("adjust credits (change #56)", () => {
  it("a manager adds or takes away credits with a reason; logged; never below zero; instructors can't", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const instructor = await db.staff("instructor", { access: "all_customers" });
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId, PACKS.ten);
      const [{ adjust_credits: left }] = await db.as(manager, "select public.adjust_credits($1, -2, 'Two classes before the app')", [pack]);
      expect(left).toBe(8);
      await db.as(manager, "select public.adjust_credits($1, 1, 'Goodwill')", [pack]);
      expect(await db.balance(pack)).toBe(9);
      const rows = await db.su("select amount, reason from public.credit_ledger where customer_pack_id = $1 and kind = 'adjust' order by id", [pack]);
      expect(rows).toEqual([{ amount: -2, reason: "Two classes before the app" }, { amount: 1, reason: "Goodwill" }]);
      const [a] = await db.su("select count(*)::int n from public.audit_log where action = 'adjust_credits' and entity_id = $1", [pack]);
      expect(a.n).toBe(2);

      expect(await db.fails(manager, "select public.adjust_credits($1, -10, 'Too many')", [pack])).toBe("not_enough_credits");
      expect(await db.fails(manager, "select public.adjust_credits($1, 0, 'Nothing')", [pack])).toBe("invalid_credits");
      expect(await db.fails(manager, "select public.adjust_credits($1, 1, '  ')", [pack])).toBe("reason_required");
      expect(await db.fails(instructor, "select public.adjust_credits($1, 1, 'Nope')", [pack])).toBe("managers_only");
      expect(await db.balance(pack)).toBe(9);
    }));
});

describe("count a class in a pack (change #55)", () => {
  // A class that ended `ago`, closed by the 15-minute job, with this customer booked into it (pay on the day).
  async function pastDropIn(db: Parameters<Parameters<typeof inTx>[0]>[0], customer: { user?: Who | null }, ago = "1 day") {
    const session = await db.session();
    const booking = await db.book(customer.user!, session);
    await db.su(`update public.sessions set starts_at = now() - $2::interval - interval '1 hour', ends_at = now() - $2::interval where id = $1`, [session, ago]);
    await db.su("select public.close_finished_sessions()");
    return booking;
  }

  it("Dakota's case: came yesterday as a drop-in, bought a pack today; the class becomes credit 1", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const yesterday = await pastDropIn(db, c);
      const [{ d }] = await db.su("select (public.vn_date(now()) - 2)::text d");
      const pack = await db.sellPack(manager, c.customerId, PACKS.ten, d);
      expect(await db.booking(yesterday)).toMatchObject({ unpaid: true, customer_pack_id: null }); // not same day: not switched
      await db.as(manager, "select public.count_booking_in_pack($1)", [yesterday]);
      expect(await db.booking(yesterday)).toMatchObject({ unpaid: false, customer_pack_id: pack, credits: 1, amount_due_vnd: "0" });
      expect(await db.balance(pack)).toBe(9);
      const kinds = await db.su("select kind from public.credit_ledger where booking_id = $1 order by id", [yesterday]);
      expect(kinds.map((k) => k.kind)).toEqual(["reserve", "use"]);
    }));

  it("a drop-in payment recorded by mistake: refused unless the manager removes it, then gone from the money", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const yesterday = await pastDropIn(db, c);
      await db.as(manager, "select public.record_payment($1, 450000, 'qr', 'drop_in', $2)", [c.customerId, yesterday]);
      const [{ d }] = await db.su("select (public.vn_date(now()) - 2)::text d");
      await db.sellPack(manager, c.customerId, PACKS.ten, d);
      expect(await db.fails(manager, "select public.count_booking_in_pack($1)", [yesterday])).toBe("drop_in_already_paid");
      await db.as(manager, "select public.count_booking_in_pack($1, true)", [yesterday]);
      expect(await db.su("select amount_vnd from public.payments where booking_id = $1", [yesterday])).toEqual([]);
      const [a] = await db.su("select count(*)::int n from public.audit_log where action = 'remove_payment'");
      expect(a.n).toBe(1);
    }));

  it("refused: instructors, no pack that covers it, already on a pack, more than 30 days ago", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const instructor = await db.staff("instructor", { access: "all_customers" });
      const c = await db.customer();
      const recent = await pastDropIn(db, c);
      expect(await db.fails(instructor, "select public.count_booking_in_pack($1)", [recent])).toBe("managers_only");
      expect(await db.fails(manager, "select public.count_booking_in_pack($1)", [recent])).toBe("no_pack_covers");
      const old = await pastDropIn(db, c, "31 days");
      const [{ d }] = await db.su("select (public.vn_date(now()) - 40)::text d");
      await db.sellPack(manager, c.customerId, PACKS.twenty, d);
      expect(await db.fails(manager, "select public.count_booking_in_pack($1)", [old])).toBe("too_long_ago");
      await db.as(manager, "select public.count_booking_in_pack($1)", [recent]);
      expect(await db.fails(manager, "select public.count_booking_in_pack($1)", [recent])).toBe("already_on_pack");
    }));
});

describe("add a pack bought before the app (change #57)", () => {
  it("10-class pack from 1 Nov with 7 left: no payment, 3 shown as used, upcoming unpaid booking moves onto it", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const upcoming = await db.book(c.user!, await db.session());
      expect(await db.booking(upcoming)).toMatchObject({ unpaid: true, customer_pack_id: null });
      const [{ d }] = await db.su("select (public.vn_date(now()) - 16)::text d");
      const [{ add_pack_from_before: pack }] = await db.as(manager, "select public.add_pack_from_before($1, $2, $3::date, 7)", [c.customerId, PACKS.ten, d]);
      expect(await db.booking(upcoming)).toMatchObject({ unpaid: false, customer_pack_id: pack });
      expect(await db.balance(pack)).toBe(6);
      expect(await db.su("select count(*)::int n from public.payments where customer_id = $1", [c.customerId])).toEqual([{ n: 0 }]);
      const [p] = await db.su("select price_paid_vnd::int, valid_from::text, valid_to::text from public.customer_packs where id = $1", [pack]);
      const [{ to }] = await db.su("select (($1::date + interval '3 months')::date - 1)::text \"to\"", [d]);
      expect(p).toEqual({ price_paid_vnd: 0, valid_from: d, valid_to: to });
    }));

  it("refused: instructors, more credits than the pack has, a start date in the future, a pack that has already run out", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const instructor = await db.staff("instructor", { access: "all_customers" });
      const c = await db.customer();
      const [{ today, future, old }] = await db.su(
        "select public.vn_date(now())::text today, (public.vn_date(now()) + 1)::text future, (public.vn_date(now()) - 100)::text old");
      const add = "select public.add_pack_from_before($1, $2, $3::date, $4)";
      expect(await db.fails(instructor, add, [c.customerId, PACKS.ten, today, 5])).toBe("managers_only");
      expect(await db.fails(manager, add, [c.customerId, PACKS.ten, today, 11])).toBe("invalid_credits");
      expect(await db.fails(manager, add, [c.customerId, PACKS.ten, today, 0])).toBe("invalid_credits");
      expect(await db.fails(manager, add, [c.customerId, PACKS.ten, future, 5])).toBe("valid_from_in_future");
      expect(await db.fails(manager, add, [c.customerId, PACKS.ten, old, 5])).toBe("pack_already_expired");
    }));
});

