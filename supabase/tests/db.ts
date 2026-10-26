// Test helpers: every test runs in a transaction that is rolled back, switching between
// the superuser (for set-up) and Supabase's roles (anon, authenticated, service_role) for the real calls.
import { randomUUID } from "node:crypto";
import pg from "pg";

export const TYPES = {
  classType: "00000000-0000-4000-8000-000000000001",
  openPlay: "00000000-0000-4000-8000-000000000002",
  privateHire: "00000000-0000-4000-8000-000000000003",
};
export const PACKS = {
  ten: "00000000-0000-4000-8000-000000000101",
  twenty: "00000000-0000-4000-8000-000000000102",
  intro: "00000000-0000-4000-8000-000000000103",
};

export type Who = "anon" | "service" | { id: string; email?: string };

// Same database global-setup.ts builds.
const admin = process.env.ADMIN_DATABASE_URL ?? "postgres://postgres@localhost:54329/postgres";
const testUrl = admin.replace(/\/[^/]*$/, `/${process.env.TEST_DB_NAME ?? "village_test"}`);

export function connect() {
  return new pg.Client({ connectionString: testUrl });
}

let phoneSeq = 100000;
let slotSeq = 0;

export class Ctx {
  constructor(readonly client: pg.Client) {}

  async su<T extends pg.QueryResultRow = any>(sql: string, params: unknown[] = []) {
    return (await this.client.query<T>(sql, params)).rows;
  }

  async as<T extends pg.QueryResultRow = any>(who: Who, sql: string, params: unknown[] = []) {
    const role = who === "anon" ? "anon" : who === "service" ? "service_role" : "authenticated";
    const claims = typeof who === "object" ? JSON.stringify({ sub: who.id, email: who.email, role }) : JSON.stringify({ role });
    await this.client.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
    await this.client.query(`set local role ${role}`);
    // On error the transaction is aborted; the caller's savepoint rollback restores the role.
    const rows = (await this.client.query<T>(sql, params)).rows;
    await this.client.query("reset role");
    return rows;
  }

  /** Runs a call that should fail, inside a savepoint so the test can carry on. Returns the error message. */
  async fails(who: Who | "su", sql: string, params: unknown[] = []): Promise<string> {
    await this.client.query("savepoint expect_fail");
    try {
      if (who === "su") await this.su(sql, params);
      else await this.as(who, sql, params);
    } catch (e) {
      await this.client.query("rollback to savepoint expect_fail");
      return (e as Error).message;
    }
    await this.client.query("release savepoint expect_fail");
    throw new Error(`Expected failure but it succeeded: ${sql}`);
  }

  async staff(role: "manager" | "instructor", opts: { access?: "own_sessions" | "all_customers"; name?: string } = {}) {
    const id = randomUUID();
    await this.su("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@staff.test`]);
    await this.su(
      "insert into public.staff_roles (user_id, role, display_name, instructor_access) values ($1, $2, $3, $4)",
      [id, role, opts.name ?? role, opts.access ?? "own_sessions"],
    );
    return { id, email: `${id}@staff.test` };
  }

  /** A customer, optionally with a login. */
  async customer(opts: { login?: boolean; email?: string; phone?: string; name?: string } = {}) {
    const email = (opts.email ?? `${randomUUID()}@example.com`).toLowerCase();
    const phone = opts.phone ?? `+8490${phoneSeq++}`;
    let userId: string | null = null;
    if (opts.login !== false) {
      userId = randomUUID();
      await this.su("insert into auth.users (id, email) values ($1, $2)", [userId, email]);
    }
    const [row] = await this.su(
      "insert into public.customers (user_id, full_name, phone, email) values ($1, $2, $3, $4) returning id",
      [userId, opts.name ?? "Test Parent", phone, email],
    );
    return { customerId: row.id as string, user: userId ? { id: userId, email } : null, email, phone };
  }

  async child(customerId: string, name = "Bao") {
    const [row] = await this.su(
      "insert into public.customer_children (customer_id, name, birth_month) values ($1, $2, '2025-01-01') returning id",
      [customerId, name],
    );
    return row.id as string;
  }

  /**
   * A session starting `startsIn` from now (a Postgres interval). Each call is nudged by a few
   * minutes so sessions in one test never overlap (one room).
   */
  async session(opts: { exact?: boolean; type?: string; startsIn?: string; minutes?: number; capacity?: number | null; instructor?: string; title?: string } = {}) {
    const nudge = opts.exact ? 0 : (slotSeq++ % 40) * 6;
    const [row] = await this.su(
      `insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity, instructor_id)
       values ($1, $2, now() + $3::interval + make_interval(mins => $4),
               now() + $3::interval + make_interval(mins => $4 + $5), $6, $7)
       returning id`,
      [opts.type ?? TYPES.classType, opts.title ?? "Pilates Flow", opts.startsIn ?? "3 days", nudge, opts.minutes ?? 5,
       opts.capacity === undefined ? 10 : opts.capacity, opts.instructor ?? null],
    );
    return row.id as string;
  }

  async sellPack(manager: Who, customerId: string, packType = PACKS.ten, validFrom?: string) {
    const [row] = await this.as(manager, "select public.sell_pack($1, $2, 'qr', $3) as id", [customerId, packType, validFrom ?? null]);
    return row.id as string;
  }

  async balance(packId: string) {
    const [row] = await this.su("select public.pack_balance($1) as b", [packId]);
    return row.b as number;
  }

  async book(who: Who, sessionId: string, args: { customerId?: string; childIds?: string[]; unnamed?: number; parents?: number; freeTrial?: boolean; override?: boolean } = {}) {
    const [row] = await this.as(
      who,
      "select public.book_session($1, $2, $3, $4, $5, $6, $7) as id",
      [sessionId, args.customerId ?? null, args.childIds ?? [], args.unnamed ?? 0, args.parents ?? 1, args.freeTrial ?? false, args.override ?? false],
    );
    return row.id as string;
  }

  async booking(id: string) {
    const [row] = await this.su("select * from public.bookings where id = $1", [id]);
    return row;
  }
}

/** Runs `fn` in a transaction that is always rolled back. */
export async function inTx(fn: (ctx: Ctx) => Promise<void>) {
  const client = connect();
  await client.connect();
  try {
    await client.query("begin");
    await fn(new Ctx(client));
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}
