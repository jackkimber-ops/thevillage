// Builds a fresh test database: local Supabase shim, every migration in order, then the seed.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

export default function setup() {
  const admin = process.env.ADMIN_DATABASE_URL ?? "postgres://postgres@localhost:54329/postgres";
  const dbName = process.env.TEST_DB_NAME ?? "village_test";
  const psql = (url: string, args: string[]) =>
    execFileSync("psql", [url, "-q", "-v", "ON_ERROR_STOP=1", ...args], { stdio: ["ignore", "ignore", "inherit"] });

  psql(admin, ["-c", `drop database if exists ${dbName} with (force)`, "-c", `create database ${dbName}`]);
  const url = admin.replace(/\/[^/]*$/, `/${dbName}`);
  const migrations = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const file of [join(here, "local-shim.sql"), ...migrations.map((f) => join(root, "migrations", f)), join(root, "seed.sql")]) {
    psql(url, ["-f", file]);
  }
}
