import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./helpers";

// Start from a clean slate: remove anything a previous check left behind, and send studio alerts
// (S25) to Resend's test inbox while the check runs, so the studio mailbox isn't flooded.
export default function globalSetup() {
  sql(readFileSync(join(__dirname, "cleanup.sql"), "utf8"));
  sql("update public.studio_settings set alert_email = 'delivered+qa-alerts@resend.dev'");
}
