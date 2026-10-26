// Rules the database itself enforces: ledger, one room, unique customers, guests, timetable,
// anonymising, and row-level security (who can see and change what).
import { describe, expect, it } from "vitest";
import { inTx, PACKS, TYPES } from "./db";

describe("credit ledger", () => {
  it("is append-only", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId);
      expect(await db.fails("su", "update public.credit_ledger set amount = 99 where customer_pack_id = $1", [pack])).toMatch(/append-only/);
      expect(await db.fails("su", "delete from public.credit_ledger where customer_pack_id = $1", [pack])).toMatch(/append-only/);
    }));

  it("bonus credits need a reason and a manager", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const instructor = await db.staff("instructor");
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId);
      expect(await db.fails(manager, "select public.add_bonus_credits($1, 1, ' ')", [pack])).toBe("reason_required");
      expect(await db.fails(instructor, "select public.add_bonus_credits($1, 1, 'nice')", [pack])).toBe("managers_only");
      await db.as(manager, "select public.add_bonus_credits($1, 2, 'Opening week')", [pack]);
      expect(await db.balance(pack)).toBe(12);
    }));
});

describe("one room", () => {
  it("refuses overlapping sessions, but a cancelled one doesn't block", () =>
    inTx(async (db) => {
      const sql = `insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity)
                   values ($1, 'x', '2026-12-01 09:00+07', '2026-12-01 10:00+07', 10) returning id`;
      const [first] = await db.su(sql, [TYPES.classType]);
      expect(await db.fails("su", sql, [TYPES.openPlay])).toMatch(/sessions_no_overlap/);
      // Back-to-back is fine.
      await db.su(`insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity)
                   values ($1, 'y', '2026-12-01 10:00+07', '2026-12-01 11:00+07', 10)`, [TYPES.classType]);
      await db.su("update public.sessions set status = 'cancelled' where id = $1", [first.id]);
      await db.su(sql, [TYPES.openPlay]);
    }));
});

describe("customers", () => {
  it("are unique by phone and by email, stored in lowercase and +84 form", () =>
    inTx(async (db) => {
      await db.customer({ phone: "+84901112222", email: "lan@example.com", login: false });
      expect(await db.fails("su", "insert into public.customers (full_name, phone) values ('x', '+84901112222')")).toMatch(/customers_phone_key/);
      expect(await db.fails("su", "insert into public.customers (full_name, email) values ('x', 'lan@example.com')")).toMatch(/customers_email_key/);
      expect(await db.fails("su", "insert into public.customers (full_name, email) values ('x', 'Lan2@Example.com')")).toMatch(/check/);
      expect(await db.fails("su", "insert into public.customers (full_name, phone) values ('x', '0901112222')")).toMatch(/check/);
    }));

  it("first login links to an existing customer with the same email", () =>
    inTx(async (db) => {
      const existing = await db.customer({ login: false, email: "mai@example.com" });
      const userId = "11111111-1111-4111-8111-111111111111";
      await db.su("insert into auth.users (id, email) values ($1, 'mai@example.com')", [userId]);
      const [r] = await db.as({ id: userId, email: "Mai@Example.com" }, "select public.save_my_details('Mai Tran', '+84905556666', 'zalo') as id");
      expect(r.id).toBe(existing.customerId);
      const [c] = await db.su("select user_id, preferred_contact, phone from public.customers where id = $1", [existing.customerId]);
      expect(c).toEqual({ user_id: userId, preferred_contact: "zalo", phone: "+84905556666" });
    }));

  it("anonymising keeps bookings, ledger and payments but clears the person", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      await db.child(c.customerId);
      const pack = await db.sellPack(manager, c.customerId);
      const id = await db.book(c.user!, await db.session());
      await db.as(manager, "select public.anonymise_customer($1)", [c.customerId]);
      const [row] = await db.su("select full_name, phone, email, user_id, anonymised_at is not null as gone from public.customers where id = $1", [c.customerId]);
      expect(row).toEqual({ full_name: "Deleted customer", phone: null, email: null, user_id: null, gone: true });
      expect((await db.booking(id)).customer_id).toBe(c.customerId);
      expect(await db.balance(pack)).toBe(9);
      const [kids] = await db.su("select count(*)::int n from public.customer_children where customer_id = $1", [c.customerId]);
      expect(kids.n).toBe(0);
    }));
});

describe("guest booking", () => {
  const guest = (session: string, name: string, phone: string, email: string, children = "[]") =>
    [session, name, phone, email, children];
  const sql = "select public.book_as_guest($1, $2, $3, $4, 'whatsapp', 'en', $5::jsonb) as id";

  it("creates the customer and their children, pay on the day, flagged as new", () =>
    inTx(async (db) => {
      const s = await db.session();
      const [r] = await db.as("service", sql, guest(s, "Linh Tran", "+84901234567", "Linh@Example.com", '[{"name":"Bao","birth_month":"2025-03-15"}]'));
      const b = await db.booking(r.id);
      expect(b).toMatchObject({ source: "guest", unpaid: true, children: 1, first_booking: true });
      const [c] = await db.su("select email, phone from public.customers where id = $1", [b.customer_id]);
      expect(c).toEqual({ email: "linh@example.com", phone: "+84901234567" });
    }));

  it("matches an existing customer by phone or email instead of creating a second one", () =>
    inTx(async (db) => {
      const existing = await db.customer({ phone: "+84907770000" });
      const [r] = await db.as("service", sql, guest(await db.session(), "Someone", "+84907770000", "new@example.com"));
      expect((await db.booking(r.id)).customer_id).toBe(existing.customerId);
    }));

  it("books under the email match and flags it when phone and email point to different customers", () =>
    inTx(async (db) => {
      const byPhone = await db.customer({ phone: "+84908880000" });
      const byEmail = await db.customer({ email: "ha@example.com" });
      const [r] = await db.as("service", sql, guest(await db.session(), "Ha", "+84908880000", "ha@example.com"));
      expect((await db.booking(r.id)).customer_id).toBe(byEmail.customerId);
      const [c] = await db.su("select needs_review from public.customers where id = $1", [byEmail.customerId]);
      expect(c.needs_review).toBe(true);
      void byPhone;
    }));

  it("allows one unpaid booking at a time", () =>
    inTx(async (db) => {
      await db.as("service", sql, guest(await db.session(), "Linh", "+84901230000", "l@example.com"));
      expect(await db.fails("service", sql, guest(await db.session(), "Linh", "+84901230000", "l@example.com"))).toBe("guest_unpaid_limit");
    }));

  it("can't be called from the browser", () =>
    inTx(async (db) => {
      const s = await db.session();
      expect(await db.fails("anon", sql, guest(s, "x", "+84901239999", "x@example.com"))).toMatch(/permission denied/);
      const c = await db.customer();
      expect(await db.fails(c.user!, sql, guest(s, "x", "+84901239999", "x@example.com"))).toMatch(/permission denied/);
    }));
});

describe("timetable", () => {
  it("shows places left for classes, not for open play, and full sessions", () =>
    inTx(async (db) => {
      const a = await db.customer();
      const cls = await db.session({ capacity: 2 });
      const op = await db.session({ type: TYPES.openPlay, capacity: 1 });
      await db.book(a.user!, cls);
      await db.book(a.user!, op, { childIds: [await db.child(a.customerId)] });
      const rows = await db.as("anon", "select session_id, places_left, is_full from public.timetable(now(), now() + interval '30 days')");
      const byId = Object.fromEntries(rows.map((r) => [r.session_id, r]));
      expect(byId[cls]).toMatchObject({ places_left: 1, is_full: false });
      expect(byId[op]).toMatchObject({ places_left: null, is_full: true });
    }));
});

describe("row-level security", () => {
  it("visitors can read the timetable and catalog but no one's details", () =>
    inTx(async (db) => {
      await db.customer();
      const sessions = await db.as("anon", "select count(*)::int n from public.session_types");
      expect(sessions[0].n).toBeGreaterThan(0);
      for (const table of ["customers", "bookings", "credit_ledger", "payments", "customer_packs", "audit_log", "staff_roles"]) {
        const [r] = await db.as("anon", `select count(*)::int n from public.${table}`);
        expect(r.n, table).toBe(0);
      }
    }));

  it("customers see only their own bookings, packs and ledger", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const a = await db.customer();
      const b = await db.customer();
      await db.sellPack(manager, a.customerId);
      await db.sellPack(manager, b.customerId);
      const s = await db.session();
      await db.book(a.user!, s);
      await db.book(b.user!, s);
      for (const table of ["customers", "bookings", "customer_packs"]) {
        const [r] = await db.as(a.user!, `select count(*)::int n from public.${table}`);
        expect(r.n, table).toBe(1);
      }
      const ledger = await db.as(a.user!, "select distinct customer_id from public.credit_ledger");
      expect(ledger).toEqual([{ customer_id: a.customerId }]);
      const [pay] = await db.as(a.user!, "select count(*)::int n from public.payments");
      expect(pay.n).toBe(0);
    }));

  it("customers can't write bookings or credits directly", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const c = await db.customer();
      const pack = await db.sellPack(manager, c.customerId);
      const s = await db.session();
      expect(await db.fails(c.user!, "insert into public.bookings (session_id, customer_id, source) values ($1, $2, 'online')", [s, c.customerId])).toMatch(/row-level security/);
      expect(await db.fails(c.user!, "insert into public.credit_ledger (customer_pack_id, customer_id, kind, amount, reason) values ($1, $2, 'bonus', 5, 'free')", [pack, c.customerId])).toMatch(/row-level security/);
      expect(await db.fails(c.user!, "select public._book($1, $2, '{}', 0, 1, false, true, 'online')", [s, c.customerId])).toMatch(/permission denied/);
      const updated = await db.as(c.user!, "update public.customers set full_name = 'Hacked' where id = $1 returning id", [c.customerId]);
      expect(updated).toEqual([]);
    }));

  it("instructors see their own sessions' customers by default, everyone if allowed", () =>
    inTx(async (db) => {
      const own = await db.staff("instructor");
      const all = await db.staff("instructor", { access: "all_customers" });
      const a = await db.customer();
      const b = await db.customer();
      await db.book(a.user!, await db.session({ instructor: own.id }));
      await db.book(b.user!, await db.session());
      const seenByOwn = (await db.as(own, "select id from public.customers")).map((r) => r.id);
      expect(seenByOwn).toContain(a.customerId);
      expect(seenByOwn).not.toContain(b.customerId);
      const seenByAll = (await db.as(all, "select id from public.customers")).map((r) => r.id);
      expect(seenByAll).toEqual(expect.arrayContaining([a.customerId, b.customerId]));
      const [pay] = await db.as(all, "select count(*)::int n from public.payments");
      expect(pay.n).toBe(0);
    }));

  it("only managers change the catalog, settings and staff", () =>
    inTx(async (db) => {
      const manager = await db.staff("manager");
      const instructor = await db.staff("instructor");
      const byInstructor = await db.as(instructor, "update public.pack_types set price_vnd = 1 where id = $1 returning id", [PACKS.ten]);
      expect(byInstructor).toEqual([]);
      const bySettings = await db.as(instructor, "update public.studio_settings set name = 'x' returning id");
      expect(bySettings).toEqual([]);
      expect(await db.fails(instructor, "insert into public.staff_roles (user_id, role, display_name) values ($1, 'manager', 'me')", [instructor.id])).toMatch(/row-level security|duplicate/);
      const byManager = await db.as(manager, "update public.pack_types set price_vnd = 4100000 where id = $1 returning id", [PACKS.ten]);
      expect(byManager).toHaveLength(1);
    }));

  it("instructors create and edit their own classes only", () =>
    inTx(async (db) => {
      const own = await db.staff("instructor");
      const other = await db.staff("instructor");
      const insert = `insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity, instructor_id)
                      values ($1, 'Yoga', now() + interval '10 days', now() + interval '10 days 1 hour', 10, $2) returning id`;
      const [s] = await db.as(own, insert, [TYPES.classType, own.id]);
      expect(await db.fails(own, insert.replace("10 days", "11 days").replace("10 days 1 hour", "11 days 1 hour"), [TYPES.classType, other.id])).toMatch(/row-level security/);
      const edited = await db.as(other, "update public.sessions set title = 'Mine now' where id = $1 returning id", [s.id]);
      expect(edited).toEqual([]);
    }));
});
