import { execFileSync } from "node:child_process";
import { expect, sql, test } from "./helpers";

// Behind the screens: emails, scheduled jobs, the credit ledger and database permissions.
// Runs last, as its own project, after the journeys have queued their emails.

test("every email the check queued was sent (none failed or stuck)", async () => {
  // The sender job runs every minute; give it up to 3 minutes to catch up.
  let rows: Array<{ status: string; n: number }> = [];
  for (let i = 0; i < 18; i++) {
    rows = sql(`select n.status::text as status, count(*)::int as n from notifications n
                where n.created_at > now() - interval '3 hours' group by 1`);
    if (!rows.some((r) => r.status === "pending" || r.status === "sending")) break;
    await new Promise((r) => setTimeout(r, 10_000));
  }
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n]));
  expect(by.failed ?? 0, JSON.stringify(by)).toBe(0);
  expect((by.pending ?? 0) + (by.sending ?? 0), JSON.stringify(by)).toBe(0);
  expect(by.sent ?? 0).toBeGreaterThan(0);
});

test("scheduled jobs: attendance every 15 min, emails every minute, reminders at 18:00 Vietnam time", () => {
  const jobs = sql<{ jobname: string; schedule: string; active: boolean }>("select jobname, schedule, active from cron.job order by 1");
  expect(jobs).toEqual([
    { jobname: "close-finished-sessions", schedule: "*/15 * * * *", active: true },
    { jobname: "queue-reminders", schedule: "0 11 * * *", active: true }, // 11:00 UTC = 18:00 in Vietnam
    { jobname: "send-emails", schedule: "* * * * *", active: true },
  ]);
  const failures = sql<{ jobname: string; n: number }>(`select j.jobname, count(*)::int as n from cron.job_run_details d join cron.job j using (jobid)
    where d.start_time > now() - interval '1 day' and d.status <> 'succeeded' group by 1`);
  expect(failures).toEqual([]);
});

test("credit ledger adds up: no pack below zero, every pack booking holds its credit", () => {
  const negative = sql(`select customer_pack_id, sum(amount) from credit_ledger where customer_pack_id is not null group by 1 having sum(amount) < 0`);
  expect(negative).toEqual([]);
  const unheld = sql(`select b.id from bookings b where b.status = 'booked' and b.customer_pack_id is not null
    and not exists (select 1 from credit_ledger l where l.booking_id = b.id and l.kind = 'reserve')`);
  expect(unheld).toEqual([]);
});

test("someone not logged in can't read customers, bookings, payments or the ledger", () => {
  const anon = process.env.STAGING_ANON_KEY!;
  for (const table of ["customers", "bookings", "payments", "credit_ledger", "customer_packs", "notifications", "staff_roles"]) {
    const out = execFileSync("curl", ["-sS", `${process.env.STAGING_SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, "-H", `apikey: ${anon}`, "-H", `Authorization: Bearer ${anon}`], { encoding: "utf8" });
    expect(out === "[]" || /permission denied|42501/.test(out), `${table}: ${out.slice(0, 120)}`).toBe(true);
  }
});
