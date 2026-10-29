import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "./helpers";

export const SAVED_ALERT_EMAIL = join(tmpdir(), "village-staging-alert-email.json");
export const QA_TODAY_FILE = join(tmpdir(), "village-staging-qa-today.json");

// Start from a clean slate: remove anything a previous check left behind, and send studio alerts
// (S25) to Resend's test inbox while the check runs, so the studio mailbox isn't flooded.
// The address in use is saved and put back afterwards (global-teardown.ts).
export default function globalSetup() {
  sql(readFileSync(join(__dirname, "cleanup.sql"), "utf8"));
  const [{ alert_email }] = sql<{ alert_email: string | null }>("select alert_email from public.studio_settings");
  if (alert_email !== "delivered+qa-alerts@resend.dev") writeFileSync(SAVED_ALERT_EMAIL, JSON.stringify(alert_email));
  sql("update public.studio_settings set alert_email = 'delivered+qa-alerts@resend.dev'");

  // One class later today for check-in tests: Here / No-show only show on the day of the session.
  // 22:00 Saigon time, or 20 minutes from now if that's already too late (runs late at night still land today).
  const vnNow = new Date(Date.now() + 7 * 3600000);
  const today = vnNow.toISOString().slice(0, 10);
  const minutes = vnNow.getUTCHours() * 60 + vnNow.getUTCMinutes();
  const startMin = minutes < 21 * 60 ? 22 * 60 : Math.min(Math.ceil((minutes + 20) / 5) * 5, 23 * 60 + 25);
  const start = `${today} ${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`;
  const [{ id }] = sql<{ id: string }>(`
    insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity, instructor_id)
    values ('00000000-0000-4000-8000-000000000004', 'QA Today', '${start}+07', '${start}+07'::timestamptz + interval '30 minutes', 40,
            (select id from auth.users where email = 'delivered+qa-instructor@resend.dev'))
    returning id`);
  writeFileSync(QA_TODAY_FILE, JSON.stringify(id));
}
