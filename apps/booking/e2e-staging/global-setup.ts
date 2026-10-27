import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./helpers";

// Start from a clean slate: remove anything a previous check left behind.
export default function globalSetup() {
  sql(readFileSync(join(__dirname, "cleanup.sql"), "utf8"));
}
