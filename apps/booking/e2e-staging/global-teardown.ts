import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SAVED_ALERT_EMAIL } from "./global-setup";
import { sql } from "./helpers";

// Tidy up straight after the check, so "QA" sessions don't linger on staging while people test
// (opening one after it's removed shows "page not found"), and put the studio alert address back.
export default function globalTeardown() {
  sql(readFileSync(join(__dirname, "cleanup.sql"), "utf8"));
  const saved = existsSync(SAVED_ALERT_EMAIL) ? (JSON.parse(readFileSync(SAVED_ALERT_EMAIL, "utf8")) as string | null) : null;
  sql(`update public.studio_settings set alert_email = ${saved ? `'${saved.replace(/'/g, "''")}'` : "null"}`);
}
