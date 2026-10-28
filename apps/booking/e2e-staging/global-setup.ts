import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "./helpers";

export const SAVED_ALERT_EMAIL = join(tmpdir(), "village-staging-alert-email.json");

// Start from a clean slate: remove anything a previous check left behind, and send studio alerts
// (S25) to Resend's test inbox while the check runs, so the studio mailbox isn't flooded.
// The address in use is saved and put back afterwards (global-teardown.ts).
export default function globalSetup() {
  sql(readFileSync(join(__dirname, "cleanup.sql"), "utf8"));
  const [{ alert_email }] = sql<{ alert_email: string | null }>("select alert_email from public.studio_settings");
  if (alert_email !== "delivered+qa-alerts@resend.dev") writeFileSync(SAVED_ALERT_EMAIL, JSON.stringify(alert_email));
  sql("update public.studio_settings set alert_email = 'delivered+qa-alerts@resend.dev'");
}
