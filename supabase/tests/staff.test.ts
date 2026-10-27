// Staff app functions: calendar counts, get-in-touch list, search, adding customers, sessions.
import { describe, expect, it } from "vitest";
import { inTx, TYPES } from "./db";

describe("staff calendar and get-in-touch list", () => {
  it("shows real counts to staff (open play too) and refuses customers", () =>
    inTx(async (db) => {
      const instructor = await db.staff("instructor");
      const c = await db.customer();
      const op = await db.session({ type: TYPES.openPlay, capacity: 10 });
      await db.book(c.user!, op, { childIds: [await db.child(c.customerId, "A"), await db.child(c.customerId, "B")] });
      const rows = await db.as(instructor, "select session_id, taken, unpaid from public.staff_timetable(now(), now() + interval '30 days')");
      expect(rows.find((r) => r.session_id === op)).toMatchObject({ taken: 2, unpaid: 1 });
      expect(await db.fails(c.user!, "select * from public.staff_timetable(now(), now() + interval '1 day')")).toBe("staff_only");
    }));

  it("lists new customers and pay-on-the-day bookings until someone ticks Contacted", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const id = await db.book(c.user!, await db.session());
      const list = await db.as(manager, "select booking_id, first_booking, unpaid from public.contact_list()");
      expect(list).toContainEqual({ booking_id: id, first_booking: true, unpaid: true });
      await db.as(manager, "select public.mark_contacted($1)", [id]);
      const after = await db.as(manager, "select booking_id from public.contact_list()");
      expect(after.map((r) => r.booking_id)).not.toContain(id);
    }));
});

describe("customers", () => {
  it("staff search by name, phone or email", () =>
    inTx(async (db) => {
      const instructor = await db.staff("instructor");
      const c = await db.customer({ name: "Hoa Le", phone: "+84917778888", email: "hoa@example.com" });
      // The local way of writing a Vietnamese number (0917…) finds +84917… too.
      for (const q of ["hoa", "7778", "hoa@ex", "0917778888", "091 777", "+84 917 778 888"]) {
        const rows = await db.as(instructor, "select customer_id from public.search_customers($1)", [q]);
        expect(rows.map((r) => r.customer_id), q).toContain(c.customerId);
      }
      const none = await db.as(instructor, "select customer_id from public.search_customers('0017778888')");
      expect(none.map((r) => r.customer_id)).not.toContain(c.customerId);
      expect(await db.fails(c.user!, "select * from public.search_customers('hoa')")).toBe("staff_only");
    }));

  it("staff add a customer with children, but not a duplicate", () =>
    inTx(async (db) => {
      const instructor = await db.staff("instructor");
      const [r] = await db.as(instructor, `select public.staff_add_customer('Minh Do', '+84912340000', 'Minh@Example.com', 'call', 'vi', '[{"name":"An","birth_month":"2024-05-20"}]') as id`);
      const [c] = await db.su("select email, preferred_contact, language from public.customers where id = $1", [r.id]);
      expect(c).toEqual({ email: "minh@example.com", preferred_contact: "call", language: "vi" });
      const [k] = await db.su("select name, birth_month::text from public.customer_children where customer_id = $1", [r.id]);
      expect(k).toEqual({ name: "An", birth_month: "2024-05-01" });
      expect(await db.fails(instructor, "select public.staff_add_customer('X', '+84912340000', null, 'call')")).toBe("phone_exists");
      expect(await db.fails(instructor, "select public.staff_add_customer('X', '+84912349999', 'minh@example.com', 'call')")).toBe("email_exists");
    }));

  it("an instructor can open a customer they just added, but not other people's", () =>
    inTx(async (db) => {
      const instructor = await db.staff("instructor");
      const other = await db.staff("instructor");
      const [r] = await db.as(instructor, "select public.staff_add_customer('Thu Ha', '+84912345678', null, 'zalo') as id");
      expect(await db.as(instructor, "select id from public.customers where id = $1", [r.id])).toHaveLength(1);
      expect(await db.as(other, "select id from public.customers where id = $1", [r.id])).toHaveLength(0);
    }));
});

describe("editing customers (S21, S22)", () => {
  it("staff change details; a new email unlinks the old login; duplicates are refused", () =>
    inTx(async (db) => {
      const instructor = await db.staff("instructor");
      const [r] = await db.as(instructor, "select public.staff_add_customer('Thu Ha', '+84912345678', 'ha@example.com', 'zalo') as id");
      const other = await db.customer({ phone: "+84919999999", email: "taken@example.com" });
      const login = "44444444-4444-4444-8444-444444444444";
      await db.su("insert into auth.users (id, email) values ($1, 'ha@example.com')", [login]);
      await db.su("update public.customers set user_id = $1 where id = $2", [login, r.id]);
      await db.as(instructor, "select public.staff_update_customer($1, 'Thu Ha Le', '+84912345679', 'Ha.Le@Example.com', 'call', 'vi')", [r.id]);
      const [c] = await db.su("select full_name, phone, email, preferred_contact, language, user_id from public.customers where id = $1", [r.id]);
      expect(c).toEqual({ full_name: "Thu Ha Le", phone: "+84912345679", email: "ha.le@example.com", preferred_contact: "call", language: "vi", user_id: null });
      expect(await db.fails(instructor, "select public.staff_update_customer($1, 'X', '+84919999999', null, 'call', 'en')", [r.id])).toBe("phone_exists");
      expect(await db.fails(instructor, "select public.staff_update_customer($1, 'X', '+84912345679', 'taken@example.com', 'call', 'en')", [r.id])).toBe("email_exists");
      // Another instructor can't edit someone they can't see.
      const stranger = await db.staff("instructor");
      expect(await db.fails(stranger, "select public.staff_update_customer($1, 'X', '+84910000001', null, 'call', 'en')", [r.id])).toBe("staff_only");
    }));

  it("managers deactivate a customer: no new bookings, still findable, and can reactivate", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const instructor = await db.staff("instructor");
      const c = await db.customer({ name: "Paused Person" });
      expect(await db.fails(instructor, "select public.set_customer_active($1, false)", [c.customerId])).toBe("managers_only");
      await db.as(manager, "select public.set_customer_active($1, false)", [c.customerId]);
      expect(await db.fails(c.user!, "select public.book_session($1)", [await db.session()])).toBe("customer_deactivated");
      const [hit] = await db.as(manager, "select deactivated from public.search_customers('paused')");
      expect(hit.deactivated).toBe(true);
      await db.as(manager, "select public.set_customer_active($1, true)", [c.customerId]);
      expect(await db.book(c.user!, await db.session({ startsIn: "4 days" }))).toBeTruthy();
    }));

  it("staff add, change and remove a child on a profile", () =>
    inTx(async (db) => {
      const instructor = await db.staff("instructor");
      const [r] = await db.as(instructor, "select public.staff_add_customer('Kid Parent', '+84912340001', null, 'zalo') as id");
      const [k] = await db.as(instructor, "select public.staff_save_child($1, null, 'Bao', '2025-03-15') as id", [r.id]);
      await db.as(instructor, "select public.staff_save_child($1, $2, 'Bảo', '2025-04-01')", [r.id, k.id]);
      const [row] = await db.su("select name, birth_month::text from public.customer_children where id = $1", [k.id]);
      expect(row).toEqual({ name: "Bảo", birth_month: "2025-04-01" });
      await db.as(instructor, "select public.staff_remove_child($1)", [k.id]);
      expect(await db.su("select id from public.customer_children where customer_id = $1", [r.id])).toEqual([]);
    }));
});

describe("sessions", () => {
  it("creates a weekly series, all or nothing", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const [r] = await db.as(manager,
        `select public.create_sessions($1, 'Pilates Flow', '2026-12-07 09:00+07', 60, 10, null, '2026-12-28') as ids`, [TYPES.classType]);
      expect(r.ids).toHaveLength(4);
      // One of the weeks clashes with an existing session: nothing is created.
      await db.su(`insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity)
                   values ($1, 'x', '2027-01-18 09:30+07', '2027-01-18 10:00+07', 5)`, [TYPES.classType]);
      expect(await db.fails(manager,
        `select public.create_sessions($1, 'Yoga', '2027-01-04 09:00+07', 60, 10, null, '2027-01-25')`, [TYPES.classType])).toBe("overlap:2027-01-18");
      const [n] = await db.su("select count(*)::int n from public.sessions where title = 'Yoga'");
      expect(n.n).toBe(0);
    }));

  it("instructors create only their own classes", () =>
    inTx(async (db) => {
      const mai = await db.staff("instructor");
      const anna = await db.staff("instructor");
      await db.as(mai, `select public.create_sessions($1, 'Yoga', '2026-12-08 09:00+07', 60, 10, $2)`, [TYPES.classType, mai.id]);
      expect(await db.fails(mai, `select public.create_sessions($1, 'Yoga', '2026-12-09 09:00+07', 60, 10, $2)`, [TYPES.classType, anna.id])).toBe("not_allowed");
    }));

  it("moving a session keeps its bookings and refuses overlaps", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const s = await db.session({ startsIn: "5 days" });
      const id = await db.book(c.user!, s);
      await db.as(manager, "select public.update_session($1, 'Pilates Flow', now() + interval '6 days', 60, 10, null)", [s]);
      expect((await db.booking(id)).session_id).toBe(s);
      const other = await db.session({ startsIn: "8 days" });
      const [o] = await db.su("select starts_at from public.sessions where id = $1", [other]);
      expect(await db.fails(manager, "select public.update_session($1, 'Pilates Flow', $2, 60, 10, null)", [s, o.starts_at])).toBe("overlap");
    }));

  it("can't shrink capacity below the people already booked", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const s = await db.session({ capacity: 5 });
      await db.book((await db.customer()).user!, s);
      await db.book((await db.customer()).user!, s);
      const [row] = await db.su("select starts_at from public.sessions where id = $1", [s]);
      expect(await db.fails(manager, "select public.update_session($1, 'x', $2, 5, 1, null)", [s, row.starts_at])).toBe("capacity_below_booked");
    }));

  it("cancelling a session cancels everyone's booking and returns credits", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const instructor = await db.staff("instructor");
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId);
      const s = await db.session({ startsIn: "2 hours" });
      const id = await db.book(c.user!, s);
      expect(await db.fails(instructor, "select public.cancel_session($1, 'flood')", [s])).toBe("managers_only");
      const [r] = await db.as(manager, "select public.cancel_session($1, 'Flooding') as n", [s]);
      expect(r.n).toBe(1);
      expect((await db.booking(id)).status).toBe("cancelled");
      expect(await db.balance(pack)).toBe(10);
    }));
});

describe("customer list (team feedback 27 Oct)", () => {
  it("lists customers with credits left on packs that haven't ended; instructors see only their own", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const instructor = await db.staff("instructor");
      const c = await db.customer({ name: "Aaa List Person" });
      await db.sellPack(manager, c.customerId);
      await db.book(c.user!, await db.session());
      const rows = await db.as(manager, "select full_name, credits_left, total from public.customer_list(200, 0)");
      const mine = rows.find((r) => r.full_name === "Aaa List Person");
      expect(mine.credits_left).toBe(9); // 10 bought, 1 reserved by the booking
      expect(Number(mine.total)).toBeGreaterThanOrEqual(1);
      const theirs = await db.as(instructor, "select full_name from public.customer_list(200, 0)");
      expect(theirs.map((r) => r.full_name)).not.toContain("Aaa List Person");
    }));
});
