// Stage 8: the email outbox (confirmations, moves, cancellations, reminders) and calendar feeds.
import { describe, expect, it } from "vitest";
import { inTx, TYPES } from "./db";

describe("email outbox", () => {
  it("queues one confirmation per new booking", () =>
    inTx(async (db) => {
      const c = await db.customer();
      const id = await db.book(c.user!, await db.session());
      const rows = await db.su("select kind, status from public.notifications where booking_id = $1", [id]);
      expect(rows).toEqual([{ kind: "booking_confirmation", status: "pending" }]);
    }));

  it("queues 'session moved' for everyone booked, with the old time, once per move", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const a = await db.customer();
      const b = await db.customer();
      const s = await db.session({ startsIn: "5 days" });
      const [old] = await db.su("select starts_at from public.sessions where id = $1", [s]);
      const ids = [await db.book(a.user!, s), await db.book(b.user!, s)];
      await db.as(manager, "select public.update_session($1, 'Pilates Flow', now() + interval '6 days', 60, 10, null)", [s]);
      await db.as(manager, "select public.update_session($1, 'Pilates Flow (renamed)', (select starts_at from public.sessions where id = $1), 60, 10, null)", [s]);
      const rows = await db.su("select booking_id, payload->>'old_starts_at' as old from public.notifications where kind = 'session_moved'");
      expect(rows.map((r) => r.booking_id).sort()).toEqual(ids.sort());
      expect(new Date(rows[0].old).getTime()).toBe(new Date(old.starts_at).getTime());
    }));

  it("queues 'session cancelled' with the reason", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const s = await db.session();
      const id = await db.book(c.user!, s);
      await db.as(manager, "select public.cancel_session($1, 'Flooding')", [s]);
      const [n] = await db.su("select payload->>'reason' as reason from public.notifications where booking_id = $1 and kind = 'session_cancelled'", [id]);
      expect(n.reason).toBe("Flooding");
    }));

  it("queues reminders for tomorrow's bookings only, and never twice", () =>
    inTx(async (db) => {
      const c = await db.customer();
      // A session tomorrow (Saigon date) at 10:00, and one in 3 days.
      const [t] = await db.su(`insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity)
        values ($1, 'Tomorrow', public.vn_at(public.vn_date(now()) + 1, '10:00'), public.vn_at(public.vn_date(now()) + 1, '11:00'), 10) returning id`, [TYPES.classType]);
      const tomorrow = await db.book(c.user!, t.id, { });
      const later = await db.book(c.user!, await db.session({ startsIn: "3 days" }));
      await db.su("select public.queue_reminders()");
      await db.su("select public.queue_reminders()");
      const rows = await db.su("select booking_id from public.notifications where kind = 'reminder'");
      expect(rows).toEqual([{ booking_id: tomorrow }]);
      void later;
    }));

  it("the sender claims a batch with everything the email needs, then records the result", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer({ name: "Lan Pham" });
      await db.sellPack(manager, c.customerId);
      const kid = await db.child(c.customerId, "Bao");
      const id = await db.book(c.user!, await db.session(), { childIds: [kid] });
      const rows = await db.as("service", "select * from public.claim_notifications(50)");
      const mine = rows.find((r) => r.booking_id === id);
      expect(mine).toMatchObject({ kind: "booking_confirmation", email: c.email, first_name: "Lan", child_names: ["Bao"], credits: 1, pack_name: "10-class pack", unpaid: false });
      // Claimed rows aren't handed out again while sending.
      const again = await db.as("service", "select id from public.claim_notifications(50)");
      expect(again.map((r) => r.id)).not.toContain(mine.id);
      await db.as("service", "select public.finish_notification($1, true, 'resend-123')", [mine.id]);
      const [n] = await db.su("select status, provider_id from public.notifications where id = $1", [mine.id]);
      expect(n).toEqual({ status: "sent", provider_id: "resend-123" });
    }));

  it("skips customers without an email and retries failures up to 5 times", () =>
    inTx(async (db) => {
      const staffer = await db.staff("instructor");
      const [noEmail] = await db.as(staffer, "select public.staff_add_customer('No Email', '+84911110000', null, 'call') as id");
      const b1 = await db.book(staffer, await db.session(), { customerId: noEmail.id });
      const c = await db.customer();
      const b2 = await db.book(c.user!, await db.session());
      for (let i = 0; i < 5; i++) {
        const claimed = await db.as("service", "select id, booking_id from public.claim_notifications(50)");
        const mine = claimed.find((r) => r.booking_id === b2);
        if (mine) await db.as("service", "select public.finish_notification($1, false, null, 'timeout')", [mine.id]);
      }
      const rows = await db.su("select booking_id, status, attempts from public.notifications where booking_id = any($1)", [[b1, b2]]);
      expect(rows.find((r) => r.booking_id === b1)).toMatchObject({ status: "skipped" });
      expect(rows.find((r) => r.booking_id === b2)).toMatchObject({ status: "failed", attempts: 5 });
    }));

  it("isn't readable or callable by customers", () =>
    inTx(async (db) => {
      const c = await db.customer();
      await db.book(c.user!, await db.session());
      const [r] = await db.as(c.user!, "select count(*)::int n from public.notifications");
      expect(r.n).toBe(0);
      expect(await db.fails(c.user!, "select * from public.claim_notifications(5)")).toMatch(/permission denied/);
      expect(await db.fails("anon", "select * from public.app_config")).toMatch(/permission denied/);
      expect(await db.fails(c.user!, "select * from public.app_config")).toMatch(/permission denied/);
    }));
});

describe("calendar feeds", () => {
  it("a customer's feed shows their bookings; a new link replaces the old one", () =>
    inTx(async (db) => {
      const c = await db.customer();
      const s = await db.session();
      await db.book(c.user!, s);
      const [t] = await db.as(c.user!, "select public.my_calendar_token() as token");
      const [again] = await db.as(c.user!, "select public.my_calendar_token() as token");
      expect(again.token).toBe(t.token);
      const feed = await db.as("service", "select title from public.calendar_feed($1)", [t.token]);
      expect(feed).toEqual([{ title: "Pilates Flow" }]);
      const [fresh] = await db.as(c.user!, "select public.my_calendar_token(true) as token");
      expect(fresh.token).not.toBe(t.token);
      expect(await db.as("service", "select * from public.calendar_feed($1)", [t.token])).toEqual([]);
    }));

  it("an instructor's feed shows their own sessions", () =>
    inTx(async (db) => {
      const mai = await db.staff("instructor");
      const mine = await db.session({ instructor: mai.id, title: "Mai's class" });
      await db.session({ title: "Someone else's" });
      const [t] = await db.as(mai, "select public.my_calendar_token() as token");
      const feed = await db.as("service", "select uid, title from public.calendar_feed($1)", [t.token]);
      expect(feed).toEqual([{ uid: mine, title: "Mai's class" }]);
    }));
});
