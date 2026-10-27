import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./helpers";

// Tidy up straight after the check, so "QA" sessions don't linger on staging while people test
// (opening one after it's removed shows "page not found"), and send studio alerts to the studio mailbox again.
export default function globalTeardown() {
  sql(readFileSync(join(__dirname, "cleanup.sql"), "utf8"));
  sql("update public.studio_settings set alert_email = null");
}
