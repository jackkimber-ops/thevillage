// Cancelling (20:00 the evening before), late cancellations, restores, and core rule 2: automatic attendance.
import { describe, expect, it } from "vitest";
import { inTx } from "./db";

describe("cancelling", () => {
  it("before the cutoff: cancelled and the credit comes back", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId);
      const id = await db.book(c.user!, await db.session({ startsIn: "3 days" }));
      expect(await db.balance(pack)).toBe(9);
      const [r] = await db.as(c.user!, "select public.cancel_booking($1) as s", [id]);
      expect(r.s).toBe("cancelled");
      expect(await db.balance(pack)).toBe(10);
    }));

  it("after the cutoff a customer can't cancel online", () =>
    inTx(async (db) => {
      const c = await db.customer();
      const id = await db.book(c.user!, await db.session({ startsIn: "2 hours" }));
      expect(await db.fails(c.user!, "select public.cancel_booking($1)", [id])).toBe("cutoff_passed");
    }));

  it("after the cutoff staff can cancel; the credit is used until a manager restores it", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const instructor = await db.staff("instructor");
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId);
      const id = await db.book(c.user!, await db.session({ startsIn: "2 hours" }));

      const [r] = await db.as(instructor, "select public.cancel_booking($1, 'Sick child') as s", [id]);
      expect(r.s).toBe("late_cancelled");
      expect(await db.balance(pack)).toBe(9);

      expect(await db.fails(instructor, "select public.restore_credit($1, 'kind')", [id])).toBe("managers_only");
      expect(await db.fails(manager, "select public.restore_credit($1, '')", [id])).toBe("reason_required");
      await db.as(manager, "select public.restore_credit($1, 'Sick child, goodwill')", [id]);
      expect(await db.balance(pack)).toBe(10);
      expect(await db.fails(manager, "select public.restore_credit($1, 'again')", [id])).toBe("already_restored");

      const [audit] = await db.su("select count(*)::int n from public.audit_log where entity_id = $1", [id]);
      expect(audit.n).toBe(2);
    }));

  it("customers can't cancel someone else's booking", () =>
    inTx(async (db) => {
      const a = await db.customer();
      const b = await db.customer();
      const id = await db.book(a.user!, await db.session());
      expect(await db.fails(b.user!, "select public.cancel_booking($1)", [id])).toBe("booking_not_found");
    }));

  it("the cutoff is 20:00 Saigon time the evening before", () =>
    inTx(async (db) => {
      const [r] = await db.su(
        "select public.cancel_cutoff('2026-11-15 09:00+07') = '2026-11-14 20:00+07' as ok, public.vn_date('2026-11-13 17:30Z')::text as d",
      );
      expect(r).toEqual({ ok: true, d: "2026-11-14" });
    }));
});

describe("closing finished sessions (every 15 minutes)", () => {
  async function pastSessionWithBookings(db: Parameters<Parameters<typeof inTx>[0]>[0]) {
    const manager = await db.staff("manager");
    const a = await db.customer();
    const b = await db.customer();
    const pack = await db.sellPack(manager, a.customerId);
    const session = await db.session({ startsIn: "-2 hours" });
    // Bookings made earlier (set up directly, as booking a past session isn't allowed).
    const [ba] = await db.su(
      `insert into public.bookings (session_id, customer_id, customer_pack_id, source, credits) values ($1, $2, $3, 'online', 1) returning id`,
      [session, a.customerId, pack],
    );
    await db.su(
      `insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason) values ($1, $2, $3, 'reserve', -1, 'test')`,
      [pack, a.customerId, ba.id],
    );
    const [bb] = await db.su(
      `insert into public.bookings (session_id, customer_id, source, unpaid, amount_due_vnd, status) values ($1, $2, 'online', true, 450000, 'no_show') returning id`,
      [session, b.customerId],
    );
    return { session, pack, attended: ba.id as string, noShow: bb.id as string };
  }

  it("marks unmarked bookings attended and turns reserved credits into used", () =>
    inTx(async (db) => {
      const { session, pack, attended, noShow } = await pastSessionWithBookings(db);
      await db.su("select public.close_finished_sessions()");
      expect((await db.booking(attended)).status).toBe("attended");
      expect((await db.booking(noShow)).status).toBe("no_show");
      const [s] = await db.su("select status from public.sessions where id = $1", [session]);
      expect(s.status).toBe("closed");
      const ledger = await db.su("select kind, amount from public.credit_ledger where booking_id = $1 order by id", [attended]);
      expect(ledger).toEqual([{ kind: "reserve", amount: -1 }, { kind: "use", amount: 0 }]);
      expect(await db.balance(pack)).toBe(9);
    }));

  it("is safe to run twice", () =>
    inTx(async (db) => {
      const { attended } = await pastSessionWithBookings(db);
      await db.su("select public.close_finished_sessions()");
      await db.su("select public.close_finished_sessions()");
      const [r] = await db.su("select count(*)::int n from public.credit_ledger where booking_id = $1 and kind = 'use'", [attended]);
      expect(r.n).toBe(1);
      const runs = await db.su("select ok from public.job_runs where job = 'close_finished_sessions'");
      expect(runs.length).toBeGreaterThanOrEqual(2);
    }));

  it("leaves sessions that haven't ended", () =>
    inTx(async (db) => {
      const session = await db.session({ startsIn: "1 hour" });
      await db.su("select public.close_finished_sessions()");
      const [s] = await db.su("select status from public.sessions where id = $1", [session]);
      expect(s.status).toBe("scheduled");
    }));

  it("can't be called by app users", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      expect(await db.fails(manager, "select public.close_finished_sessions()")).toMatch(/permission denied/);
    }));
});

describe("attendance", () => {
  it("instructors mark attendance in their own sessions only", () =>
    inTx(async (db) => {
      const mine = await db.staff("instructor");
      const other = await db.staff("instructor");
      const c = await db.customer();
      const s = await db.session({ instructor: mine.id });
      const id = await db.book(c.user!, s);
      await db.as(mine, "select public.mark_attendance($1, 'no_show')", [id]);
      expect((await db.booking(id)).status).toBe("no_show");
      expect(await db.fails(other, "select public.mark_attendance($1, 'attended')", [id])).toBe("not_allowed");
      expect(await db.fails(c.user!, "select public.mark_attendance($1, 'attended')", [id])).toBe("staff_only");
    }));
});
